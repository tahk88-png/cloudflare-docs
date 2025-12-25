// SK ID Solutions provider (Estonia)
// Smart-ID and Mobile-ID integration

import type {
  Document,
  DocumentSigner,
  SignerStatus,
  SigningProviderConfig,
} from '../../types-enhanced';
import { SigningProviderBase } from './provider-base';

/**
 * SK ID Solutions provider for Smart-ID and Mobile-ID
 * https://www.skidsolutions.eu/
 */
export class SKIDSolutionsProvider extends SigningProviderBase {
  private baseUrl: string;
  
  constructor(config: SigningProviderConfig) {
    super(config);
    this.baseUrl = config.environment === 'production'
      ? 'https://api.skidsolutions.eu'
      : 'https://api-sandbox.skidsolutions.eu';
  }
  
  async initializeSigningSession(params: {
    document: Document;
    signers: DocumentSigner[];
    callbackUrl?: string;
  }): Promise<{
    sessionId: string;
    signingUrls: Record<string, string>;
  }> {
    // Upload document
    const documentHash = await this.uploadDocument(params.document);
    
    // Create signing session
    const response = await fetch(`${this.baseUrl}/v2/signing/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_hash: documentHash,
        hash_type: 'SHA256',
        signers: params.signers.map(s => ({
          identifier: s.personal_code,
          phone: s.phone,
          country: 'EE', // Estonia
          method: s.signing_method === 'smartid' ? 'smart-id' : 'mobile-id',
        })),
        callback_url: params.callbackUrl,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`SK ID API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    // Generate signing URLs
    const signingUrls: Record<string, string> = {};
    for (let i = 0; i < params.signers.length; i++) {
      const signer = params.signers[i];
      signingUrls[signer.id] = data.signing_urls[i];
    }
    
    return {
      sessionId: data.session_id,
      signingUrls,
    };
  }
  
  async getSigningStatus(sessionId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    signers: Array<{
      signerId: string;
      status: SignerStatus;
      signedAt?: string;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/v2/signing/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`SK ID API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    return {
      status: this.mapStatus(data.status),
      signers: data.signers.map((s: any) => ({
        signerId: s.id,
        status: this.mapSignerStatus(s.status),
        signedAt: s.signed_at,
      })),
    };
  }
  
  async downloadSignedDocument(sessionId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/v2/signing/sessions/${sessionId}/document`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`SK ID API error: ${response.status}`);
    }
    
    return await response.arrayBuffer();
  }
  
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Verify HMAC-SHA256 signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.config.webhookSecret || '');
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature;
  }
  
  parseWebhookPayload(payload: any): {
    eventType: string;
    sessionId: string;
    signerId?: string;
    status: SignerStatus;
    signedAt?: string;
  } {
    return {
      eventType: payload.event_type,
      sessionId: payload.session_id,
      signerId: payload.signer_id,
      status: this.mapSignerStatus(payload.status),
      signedAt: payload.timestamp,
    };
  }
  
  private async uploadDocument(document: Document): Promise<string> {
    // Download document PDF
    const pdfResponse = await fetch(document.pdf_url!);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    // Calculate SHA256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
  
  private mapStatus(status: string): 'pending' | 'in_progress' | 'completed' | 'failed' {
    switch (status) {
      case 'created':
        return 'pending';
      case 'signing':
        return 'in_progress';
      case 'signed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'pending';
    }
  }
  
  private mapSignerStatus(status: string): SignerStatus {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'invited':
        return 'invited';
      case 'opened':
        return 'opened';
      case 'signed':
        return 'signed';
      case 'declined':
        return 'declined';
      case 'failed':
        return 'failed';
      case 'expired':
        return 'expired';
      default:
        return 'pending';
    }
  }
}
