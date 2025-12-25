// Document and signing API handlers

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Document,
  DocumentSigner,
  CreateDocumentRequest,
  StartSigningRequest,
  SignDocumentRequest,
  Tenant,
} from '../types-enhanced';
import { requirePermission, requireCompanyAccess } from '../services/auth-service';
import { auditActions } from '../services/audit-service';
import {
  createDocument,
  startSigning,
  generateDocumentPDF,
} from '../services/signing/signing-service';

/**
 * POST /api/documents - Create new document
 */
export async function createDocumentHandler(
  db: D1Database,
  r2: any,
  request: Request,
  body: CreateDocumentRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canCreateDocument');
    
    // Get active tenant from session
    const tenantId = await getActiveTenantId(db, user.id);
    
    // Validate related invoice if provided
    if (body.related_invoice_id) {
      const invoice = await db
        .prepare('SELECT * FROM invoices WHERE id = ? AND tenant_id = ?')
        .bind(body.related_invoice_id, tenantId)
        .first();
      
      if (!invoice) {
        return jsonError('Related invoice not found', 404);
      }
    }
    
    // Create document and signers
    const { document, signers } = await createDocument(db, tenantId, user.id, body);
    
    // Get tenant details
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<Tenant>();
    
    if (!tenant) {
      return jsonError('Tenant not found', 404);
    }
    
    // Generate PDF
    const { pdfUrl, sha256 } = await generateDocumentPDF(document, signers, tenant, r2);
    
    // Update document with PDF details
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
    
    // Audit log
    await logAudit(db, {
      tenant_id: tenantId,
      actor_user_id: user.id,
      entity_type: 'document',
      entity_id: document.id,
      action: 'create',
      after_json: document,
      ip_address: request.headers.get('CF-Connecting-IP') || undefined,
      user_agent: request.headers.get('User-Agent') || undefined,
    });
    
    return jsonResponse({
      document,
      signers,
    }, 201);
  } catch (error: any) {
    console.error('Create document error:', error);
    return jsonError(error.message, getErrorStatus(error));
  }
}

/**
 * POST /api/documents/:id/start-signing - Start signing process
 */
export async function startSigningHandler(
  db: D1Database,
  r2: any,
  request: Request,
  documentId: string,
  body: StartSigningRequest
): Promise<Response> {
  try {
    const user = await requirePermission(db, request, 'canSignDocument');
    const tenantId = await getActiveTenantId(db, user.id);
    
    // Get document
    const document = await db
      .prepare('SELECT * FROM documents WHERE id = ? AND tenant_id = ?')
      .bind(documentId, tenantId)
      .first<Document>();
    
    if (!document) {
      return jsonError('Document not found', 404);
    }
    
    // Check status
    if (document.status !== 'draft') {
      return jsonError('Document must be in draft status to start signing', 400);
    }
    
    // Get signers
    const signersResult = await db
      .prepare('SELECT * FROM document_signers WHERE document_id = ? ORDER BY signing_order')
      .bind(documentId)
      .all<DocumentSigner>();
    
    const signers = signersResult.results || [];
    
    if (signers.length === 0) {
      return jsonError('No signers configured for this document', 400);
    }
    
    // Get tenant
    const tenant = await db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<Tenant>();
    
    if (!tenant) {
      return jsonError('Tenant not found', 404);
    }
    
    // Start signing
    const signatureRequest = await startSigning(db, r2, document, signers, tenant, body);
    
    // Audit log
    await logAudit(db, {
      tenant_id: tenantId,
      actor_user_id: user.id,
      entity_type: 'document',
      entity_id: document.id,
      action: 'start_signing',
      metadata: { signature_request_id: signatureRequest.id },
      ip_address: request.headers.get('CF-Connecting-IP') || undefined,
      user_agent: request.headers.get('User-Agent') || undefined,
    });
    
    return jsonResponse({
      signature_request: signatureRequest,
      signers: signers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        status: 'invited',
        signing_url: `https://app.example.com/documents/sign/${s.invitation_token}`,
      })),
    });
  } catch (error: any) {
    console.error('Start signing error:', error);
    return jsonError(error.message, getErrorStatus(error));
  }
}

/**
 * GET /documents/sign/:token - Public signing UI
 */
export async function getSigningPageHandler(
  db: D1Database,
  request: Request,
  token: string
): Promise<Response> {
  try {
    // Get signer by token
    const signer = await db
      .prepare('SELECT * FROM document_signers WHERE invitation_token = ?')
      .bind(token)
      .first<DocumentSigner>();
    
    if (!signer) {
      return htmlError('Invalid signing link', 404);
    }
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(signer.invitation_expires_at!);
    
    if (now > expiresAt) {
      return htmlError('This signing link has expired', 403);
    }
    
    // Get document
    const document = await db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .bind(signer.document_id)
      .first<Document>();
    
    if (!document) {
      return htmlError('Document not found', 404);
    }
    
    // Log view
    await db
      .prepare(
        `INSERT INTO document_views (id, tenant_id, document_id, signer_id, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `view_${Date.now()}`,
        document.tenant_id,
        document.id,
        signer.id,
        request.headers.get('CF-Connecting-IP') || null,
        request.headers.get('User-Agent') || null
      )
      .run();
    
    // Update signer status to 'opened' if still 'invited'
    if (signer.status === 'invited') {
      await db
        .prepare(
          `UPDATE document_signers 
           SET status = 'opened', updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(signer.id)
        .run();
    }
    
    // Render signing page
    const html = renderSigningPage(document, signer);
    
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Get signing page error:', error);
    return htmlError('Internal server error', 500);
  }
}

/**
 * POST /api/sign - Submit signature
 */
export async function submitSignatureHandler(
  db: D1Database,
  request: Request,
  body: SignDocumentRequest
): Promise<Response> {
  try {
    // Get signer by token
    const signer = await db
      .prepare('SELECT * FROM document_signers WHERE invitation_token = ?')
      .bind(body.token)
      .first<DocumentSigner>();
    
    if (!signer) {
      return jsonError('Invalid token', 404);
    }
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(signer.invitation_expires_at!);
    
    if (now > expiresAt) {
      return jsonError('Token expired', 403);
    }
    
    // Verify signing method matches
    if (body.method !== signer.signing_method) {
      return jsonError('Invalid signing method', 400);
    }
    
    // Process signature based on method
    // In production, this would verify SmartID/MobileID/etc signatures
    // For now, simplified implementation
    
    // Update signer status
    await db
      .prepare(
        `UPDATE document_signers 
         SET status = 'signed', signed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(signer.id)
      .run();
    
    // Check if all required signers have signed
    const allSignersResult = await db
      .prepare(
        `SELECT * FROM document_signers 
         WHERE document_id = ? AND is_required = 1`
      )
      .bind(signer.document_id)
      .all<DocumentSigner>();
    
    const allSigned = allSignersResult.results?.every(
      s => s.id === signer.id || s.status === 'signed'
    ) || false;
    
    if (allSigned) {
      // Update document status
      await db
        .prepare(
          `UPDATE documents 
           SET status = 'signed', all_signed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(signer.document_id)
        .run();
      
      // If linked to invoice, update invoice status
      const document = await db
        .prepare('SELECT * FROM documents WHERE id = ?')
        .bind(signer.document_id)
        .first<Document>();
      
      if (document?.related_invoice_id) {
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
    
    // Audit log
    await logAudit(db, {
      tenant_id: signer.tenant_id,
      entity_type: 'document_signer',
      entity_id: signer.id,
      action: 'sign',
      metadata: { method: body.method },
      ip_address: request.headers.get('CF-Connecting-IP') || undefined,
      user_agent: request.headers.get('User-Agent') || undefined,
    });
    
    return jsonResponse({
      success: true,
      all_signed: allSigned,
      message: allSigned ? 'Document fully signed!' : 'Signature recorded. Waiting for other signers.',
    });
  } catch (error: any) {
    console.error('Submit signature error:', error);
    return jsonError(error.message, getErrorStatus(error));
  }
}

/**
 * Helper functions
 */
async function getActiveTenantId(db: D1Database, userId: string): Promise<string> {
  // Get from session or first active tenant
  const userTenant = await db
    .prepare(
      `SELECT tenant_id FROM user_tenants 
       WHERE user_id = ? AND is_active = 1 
       LIMIT 1`
    )
    .bind(userId)
    .first<{ tenant_id: string }>();
  
  if (!userTenant) {
    throw new Error('No active tenant found for user');
  }
  
  return userTenant.tenant_id;
}

async function logAudit(db: D1Database, entry: any): Promise<void> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db
    .prepare(
      `INSERT INTO audit_logs (
        id, tenant_id, actor_user_id, entity_type, entity_id, action,
        before_json, after_json, ip_address, user_agent, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      id,
      entry.tenant_id,
      entry.actor_user_id || null,
      entry.entity_type,
      entry.entity_id,
      entry.action,
      entry.before_json ? JSON.stringify(entry.before_json) : null,
      entry.after_json ? JSON.stringify(entry.after_json) : null,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null
    )
    .run();
}

function renderSigningPage(document: Document, signer: DocumentSigner): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Document - ${document.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 10px; }
    .status { color: #666; margin-bottom: 30px; }
    .document-info {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .pdf-viewer {
      border: 1px solid #ddd;
      height: 600px;
      margin-bottom: 30px;
    }
    .signer-info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .signing-methods {
      margin-top: 20px;
    }
    .method-button {
      display: block;
      width: 100%;
      padding: 15px;
      margin-bottom: 10px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
    }
    .method-button:hover { background: #0056b3; }
    .method-button:disabled { background: #ccc; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Document Signature Request</h1>
    <p class="status">Please review and sign the document below</p>
    
    <div class="document-info">
      <h3>${document.title}</h3>
      ${document.description ? `<p>${document.description}</p>` : ''}
    </div>
    
    <div class="signer-info">
      <strong>Signing as:</strong> ${signer.name} (${signer.role})<br>
      <strong>Email:</strong> ${signer.email}
    </div>
    
    <div class="pdf-viewer">
      <embed src="${document.pdf_url}" type="application/pdf" width="100%" height="100%">
    </div>
    
    <div class="signing-methods">
      <h3>Choose signing method:</h3>
      
      ${signer.signing_method === 'smartid' ? `
        <button class="method-button" onclick="signWithSmartID()">
          Sign with Smart-ID
        </button>
      ` : ''}
      
      ${signer.signing_method === 'mobileid' ? `
        <button class="method-button" onclick="signWithMobileID()">
          Sign with Mobile-ID
        </button>
      ` : ''}
      
      ${signer.signing_method === 'email_otp' ? `
        <button class="method-button" onclick="signWithEmailOTP()">
          Sign with Email OTP
        </button>
      ` : ''}
      
      ${signer.signing_method === 'manual' ? `
        <button class="method-button" onclick="signManually()">
          Confirm Signature
        </button>
      ` : ''}
    </div>
  </div>
  
  <script>
    const token = '${signer.invitation_token}';
    
    async function signWithSmartID() {
      // In production, integrate with Smart-ID API
      await submitSignature('smartid');
    }
    
    async function signWithMobileID() {
      // In production, integrate with Mobile-ID API
      await submitSignature('mobileid');
    }
    
    async function signWithEmailOTP() {
      const otp = prompt('Enter OTP sent to your email:');
      if (otp) {
        await submitSignature('email_otp', { otp });
      }
    }
    
    async function signManually() {
      if (confirm('Confirm that you want to sign this document?')) {
        await submitSignature('manual');
      }
    }
    
    async function submitSignature(method, data = {}) {
      try {
        const response = await fetch('/api/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            method,
            ...data,
          }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert(result.message);
          window.location.href = '/signing-complete';
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Failed to submit signature');
      }
    }
  </script>
</body>
</html>
  `;
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlError(message: string, status: number): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .error {
      background: white;
      padding: 40px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #dc3545; }
  </style>
</head>
<body>
  <div class="error">
    <h1>${status}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
  
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function getErrorStatus(error: Error): number {
  if (error.message.includes('Unauthorized')) return 401;
  if (error.message.includes('Forbidden')) return 403;
  if (error.message.includes('Not found')) return 404;
  return 500;
}
