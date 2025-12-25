// Document signing service

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Document,
  DocumentSigner,
  SignatureRequest,
  SigningProvider,
  CreateDocumentRequest,
  StartSigningRequest,
  Tenant,
} from '../../types-enhanced';
import { generateId, generateSecureToken } from '../../utils/id';
import { SigningProviderBase } from './provider-base';
import { DummySigningProvider } from './dummy-provider';
import { SKIDSolutionsProvider } from './sk-id-provider';

/**
 * Get signing provider instance
 */
export function getSigningProvider(
  provider: SigningProvider,
  config: Record<string, string>
): SigningProviderBase {
  switch (provider) {
    case 'dummy':
      return new DummySigningProvider(config);
    
    case 'sk_id_solutions':
      return new SKIDSolutionsProvider({
        apiKey: config.apiKey,
        environment: config.environment as 'production' | 'sandbox',
        webhookSecret: config.webhookSecret,
      });
    
    // Add more providers as needed
    case 'dokobit':
    case 'docusign':
    case 'custom':
      throw new Error(`Provider ${provider} not yet implemented`);
    
    default:
      throw new Error(`Unknown signing provider: ${provider}`);
  }
}

/**
 * Create a new document
 */
export async function createDocument(
  db: D1Database,
  tenantId: string,
  userId: string,
  request: CreateDocumentRequest
): Promise<{ document: Document; signers: DocumentSigner[] }> {
  const documentId = generateId('doc');
  
  // Create document
  const document: Document = {
    id: documentId,
    tenant_id: tenantId,
    type: request.type,
    status: 'draft',
    related_invoice_id: request.related_invoice_id,
    title: request.title,
    description: request.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: userId,
  };
  
  await db
    .prepare(
      `INSERT INTO documents (
        id, tenant_id, type, status, related_invoice_id, title, description,
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      document.id,
      document.tenant_id,
      document.type,
      document.status,
      document.related_invoice_id || null,
      document.title,
      document.description || null,
      document.created_at,
      document.updated_at,
      document.created_by
    )
    .run();
  
  // Create signers
  const signers: DocumentSigner[] = [];
  for (let i = 0; i < request.signers.length; i++) {
    const signerData = request.signers[i];
    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const signer: DocumentSigner = {
      id: generateId('signer'),
      tenant_id: tenantId,
      document_id: documentId,
      role: signerData.role,
      name: signerData.name,
      email: signerData.email,
      phone: signerData.phone,
      personal_code: signerData.personal_code,
      signing_method: signerData.signing_method,
      status: 'pending',
      invitation_token: token,
      invitation_expires_at: expiresAt.toISOString(),
      signing_order: signerData.signing_order || i,
      is_required: signerData.is_required !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await db
      .prepare(
        `INSERT INTO document_signers (
          id, tenant_id, document_id, role, name, email, phone, personal_code,
          signing_method, status, invitation_token, invitation_expires_at,
          signing_order, is_required, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        signer.id,
        signer.tenant_id,
        signer.document_id,
        signer.role,
        signer.name,
        signer.email,
        signer.phone || null,
        signer.personal_code || null,
        signer.signing_method,
        signer.status,
        signer.invitation_token,
        signer.invitation_expires_at,
        signer.signing_order,
        signer.is_required ? 1 : 0,
        signer.created_at,
        signer.updated_at
      )
      .run();
    
    signers.push(signer);
  }
  
  return { document, signers };
}

/**
 * Generate PDF for document
 * (Similar to invoice PDF generation but for documents)
 */
export async function generateDocumentPDF(
  document: Document,
  signers: DocumentSigner[],
  tenant: Tenant,
  r2: any
): Promise<{ pdfUrl: string; sha256: string }> {
  // Generate document PDF content based on type
  let pdfContent = '';
  
  switch (document.type) {
    case 'acceptance_act':
      pdfContent = generateAcceptanceActPDF(document, signers, tenant);
      break;
    case 'contract':
      pdfContent = generateContractPDF(document, signers, tenant);
      break;
    case 'invoice':
      pdfContent = generateInvoiceSigningPDF(document, signers, tenant);
      break;
  }
  
  // Convert to PDF (in production, use proper PDF library)
  const pdfBuffer = new TextEncoder().encode(pdfContent).buffer;
  
  // Calculate SHA256
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Upload to R2
  const key = `documents/${tenant.id}/${document.id}/document.pdf`;
  await r2.put(key, pdfBuffer, {
    httpMetadata: { contentType: 'application/pdf' },
  });
  
  const pdfUrl = `https://storage.example.com/${key}`;
  
  return { pdfUrl, sha256 };
}

/**
 * Start signing process
 */
export async function startSigning(
  db: D1Database,
  r2: any,
  document: Document,
  signers: DocumentSigner[],
  tenant: Tenant,
  request: StartSigningRequest
): Promise<SignatureRequest> {
  // Ensure document has PDF
  if (!document.pdf_url) {
    const { pdfUrl, sha256 } = await generateDocumentPDF(document, signers, tenant, r2);
    
    await db
      .prepare(
        `UPDATE documents 
         SET pdf_url = ?, pdf_sha256 = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(pdfUrl, sha256, document.id)
      .run();
    
    document.pdf_url = pdfUrl;
    document.pdf_sha256 = sha256;
  }
  
  // Get tenant settings
  const tenantSettings = typeof tenant.settings === 'string'
    ? JSON.parse(tenant.settings)
    : tenant.settings || {};
  
  const provider = request.provider || tenantSettings.signing_provider || 'dummy';
  const providerConfig = tenantSettings.signing_provider_config || {};
  
  // Initialize signing provider
  const signingProvider = getSigningProvider(provider, providerConfig);
  
  // Initialize signing session
  const { sessionId, signingUrls } = await signingProvider.initializeSigningSession({
    document,
    signers,
    callbackUrl: request.callback_url || `https://app.example.com/webhooks/signing`,
  });
  
  // Create signature request
  const signatureRequest: SignatureRequest = {
    id: generateId('sig_req'),
    tenant_id: tenant.id,
    document_id: document.id,
    provider,
    provider_request_id: sessionId,
    status: 'in_progress',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  await db
    .prepare(
      `INSERT INTO signature_requests (
        id, tenant_id, document_id, provider, provider_request_id, status,
        retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      signatureRequest.id,
      signatureRequest.tenant_id,
      signatureRequest.document_id,
      signatureRequest.provider,
      signatureRequest.provider_request_id,
      signatureRequest.status,
      signatureRequest.retry_count,
      signatureRequest.created_at,
      signatureRequest.updated_at
    )
    .run();
  
  // Update document status
  await db
    .prepare(
      `UPDATE documents 
       SET status = 'awaiting_signature', updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(document.id)
    .run();
  
  // Update signers with invitation URLs and mark as invited
  for (const [signerId, url] of Object.entries(signingUrls)) {
    await db
      .prepare(
        `UPDATE document_signers 
         SET status = 'invited', invitation_sent_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(signerId)
      .run();
  }
  
  // Send invitation emails if requested
  if (request.send_invitations !== false) {
    for (const signer of signers) {
      const signingUrl = signingUrls[signer.id];
      if (signingUrl) {
        // Queue invitation email
        await queueSigningInvitation(db, tenant, document, signer, signingUrl);
      }
    }
  }
  
  return signatureRequest;
}

/**
 * Process signing webhook
 */
export async function processSigningWebhook(
  db: D1Database,
  r2: any,
  provider: SigningProvider,
  payload: any,
  signature: string
): Promise<void> {
  // Get provider config from database (would need tenant context)
  const signingProvider = getSigningProvider(provider, {});
  
  // Verify signature
  const isValid = signingProvider.verifyWebhookSignature(JSON.stringify(payload), signature);
  if (!isValid) {
    throw new Error('Invalid webhook signature');
  }
  
  // Parse payload
  const event = signingProvider.parseWebhookPayload(payload);
  
  // Get signature request
  const sigRequest = await db
    .prepare(
      `SELECT * FROM signature_requests 
       WHERE provider_request_id = ?`
    )
    .bind(event.sessionId)
    .first<SignatureRequest>();
  
  if (!sigRequest) {
    console.error('Signature request not found for session:', event.sessionId);
    return;
  }
  
  // Update signature request
  await db
    .prepare(
      `UPDATE signature_requests 
       SET webhook_received_at = datetime('now'),
           webhook_payload = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(JSON.stringify(payload), sigRequest.id)
    .run();
  
  // Update signer status if provided
  if (event.signerId) {
    await db
      .prepare(
        `UPDATE document_signers 
         SET status = ?, signed_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(event.status, event.signedAt || null, event.signerId)
      .run();
  }
  
  // Check if all required signers have signed
  const signersResult = await db
    .prepare(
      `SELECT * FROM document_signers 
       WHERE document_id = ? AND is_required = 1`
    )
    .bind(sigRequest.document_id)
    .all<DocumentSigner>();
  
  const allSigned = signersResult.results?.every(s => s.status === 'signed') || false;
  
  if (allSigned) {
    // Download signed document
    const signedPdfBuffer = await signingProvider.downloadSignedDocument(event.sessionId);
    
    // Calculate hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', signedPdfBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signedSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Upload signed PDF
    const document = await db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .bind(sigRequest.document_id)
      .first<Document>();
    
    if (document) {
      const key = `documents/${document.tenant_id}/${document.id}/signed.pdf`;
      await r2.put(key, signedPdfBuffer, {
        httpMetadata: { contentType: 'application/pdf' },
      });
      
      const signedPdfUrl = `https://storage.example.com/${key}`;
      
      // Update document
      await db
        .prepare(
          `UPDATE documents 
           SET status = 'signed',
               signed_pdf_url = ?,
               signed_pdf_sha256 = ?,
               all_signed_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(signedPdfUrl, signedSha256, document.id)
        .run();
      
      // Update signature request
      await db
        .prepare(
          `UPDATE signature_requests 
           SET status = 'completed', completed_at = datetime('now')
           WHERE id = ?`
        )
        .bind(sigRequest.id)
        .run();
      
      // If document is linked to invoice, update invoice status
      if (document.related_invoice_id) {
        await db
          .prepare(
            `UPDATE invoices 
             SET status = 'signed', updated_at = datetime('now')
             WHERE id = ? AND status = 'awaiting_signature'`
          )
          .bind(document.related_invoice_id)
          .run();
      }
    }
  }
}

/**
 * Queue signing invitation email
 */
async function queueSigningInvitation(
  db: D1Database,
  tenant: Tenant,
  document: Document,
  signer: DocumentSigner,
  signingUrl: string
): Promise<void> {
  const emailId = generateId('email');
  
  const subject = `Please sign: ${document.title}`;
  const body = `
    <html>
    <body>
      <h2>Document Signature Request</h2>
      <p>Dear ${signer.name},</p>
      <p>You have been requested to sign the following document:</p>
      <p><strong>${document.title}</strong></p>
      ${document.description ? `<p>${document.description}</p>` : ''}
      <p><a href="${signingUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Document</a></p>
      <p>This link expires in 30 days.</p>
      <p>Best regards,<br>${tenant.name}</p>
    </body>
    </html>
  `;
  
  await db
    .prepare(
      `INSERT INTO email_logs (
        id, tenant_id, document_id, to_email, from_email, reply_to_email,
        subject, body_html, status, template_key, attempts, max_attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      emailId,
      tenant.id,
      document.id,
      signer.email,
      'no-reply@domain.com',
      'support@domain.com',
      subject,
      body,
      'queued',
      'signing_invitation',
      0,
      3
    )
    .run();
}

/**
 * Generate acceptance act PDF
 */
function generateAcceptanceActPDF(
  document: Document,
  signers: DocumentSigner[],
  tenant: Tenant
): string {
  return `Acceptance Act PDF content for ${document.title}`;
}

/**
 * Generate contract PDF
 */
function generateContractPDF(
  document: Document,
  signers: DocumentSigner[],
  tenant: Tenant
): string {
  return `Contract PDF content for ${document.title}`;
}

/**
 * Generate invoice signing PDF
 */
function generateInvoiceSigningPDF(
  document: Document,
  signers: DocumentSigner[],
  tenant: Tenant
): string {
  return `Invoice Signing PDF content for ${document.title}`;
}
