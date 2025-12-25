// Dummy signing provider for development and testing

import type {
  Document,
  DocumentSigner,
  SignerStatus,
  SigningProviderConfig,
} from '../../types-enhanced';
import { SigningProviderBase } from './provider-base';

/**
 * Dummy signing provider for development
 * Simulates signing workflow without real eID integration
 */
export class DummySigningProvider extends SigningProviderBase {
  private sessions: Map<string, any> = new Map();
  
  constructor(config: SigningProviderConfig = {}) {
    super(config);
  }
  
  async initializeSigningSession(params: {
    document: Document;
    signers: DocumentSigner[];
    callbackUrl?: string;
  }): Promise<{
    sessionId: string;
    signingUrls: Record<string, string>;
  }> {
    const sessionId = `dummy_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate signing URLs for each signer
    const signingUrls: Record<string, string> = {};
    for (const signer of params.signers) {
      const token = signer.invitation_token || `dummy_token_${signer.id}`;
      signingUrls[signer.id] = `${callbackUrl || 'https://app.example.com'}/documents/sign/${token}`;
    }
    
    // Store session data
    this.sessions.set(sessionId, {
      documentId: params.document.id,
      signers: params.signers.map(s => ({
        id: s.id,
        status: 'invited' as SignerStatus,
        signedAt: undefined,
      })),
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    
    return {
      sessionId,
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
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    const allSigned = session.signers.every((s: any) => s.status === 'signed');
    const anySigned = session.signers.some((s: any) => s.status === 'signed');
    
    return {
      status: allSigned ? 'completed' : anySigned ? 'in_progress' : 'pending',
      signers: session.signers.map((s: any) => ({
        signerId: s.id,
        status: s.status,
        signedAt: s.signedAt,
      })),
    };
  }
  
  async downloadSignedDocument(sessionId: string): Promise<ArrayBuffer> {
    // In real implementation, would download from provider
    // For dummy, return a mock PDF buffer
    const mockPdf = new TextEncoder().encode('Dummy signed PDF content');
    return mockPdf.buffer;
  }
  
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Dummy implementation always returns true
    // In production, verify HMAC signature
    return true;
  }
  
  parseWebhookPayload(payload: any): {
    eventType: string;
    sessionId: string;
    signerId?: string;
    status: SignerStatus;
    signedAt?: string;
  } {
    // Parse webhook payload from dummy provider
    return {
      eventType: payload.event || 'signer.signed',
      sessionId: payload.session_id,
      signerId: payload.signer_id,
      status: payload.status as SignerStatus,
      signedAt: payload.signed_at,
    };
  }
  
  /**
   * Simulate signing (for testing)
   */
  async simulateSign(sessionId: string, signerId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const signer = session.signers.find((s: any) => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }
    
    signer.status = 'signed';
    signer.signedAt = new Date().toISOString();
    
    // Check if all signed
    const allSigned = session.signers.every((s: any) => s.status === 'signed');
    if (allSigned) {
      session.status = 'completed';
    } else {
      session.status = 'in_progress';
    }
  }
}
