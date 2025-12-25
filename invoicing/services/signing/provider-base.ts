// Base signing provider interface and implementations

import type {
  Document,
  DocumentSigner,
  SignerStatus,
  SigningProviderConfig,
  SigningProviderInterface,
} from '../../types-enhanced';

/**
 * Base abstract class for signing providers
 */
export abstract class SigningProviderBase implements SigningProviderInterface {
  constructor(protected config: SigningProviderConfig) {}
  
  abstract initializeSigningSession(params: {
    document: Document;
    signers: DocumentSigner[];
    callbackUrl?: string;
  }): Promise<{
    sessionId: string;
    signingUrls: Record<string, string>;
  }>;
  
  abstract getSigningStatus(sessionId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    signers: Array<{
      signerId: string;
      status: SignerStatus;
      signedAt?: string;
    }>;
  }>;
  
  abstract downloadSignedDocument(sessionId: string): Promise<ArrayBuffer>;
  
  abstract verifyWebhookSignature(payload: string, signature: string): boolean;
  
  abstract parseWebhookPayload(payload: any): {
    eventType: string;
    sessionId: string;
    signerId?: string;
    status: SignerStatus;
    signedAt?: string;
  };
}
