export interface SignatureRecord {
  id: string;
  party: 'contractor' | 'client';
  name: string;
  role: string;
  cpf: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signatureType: 'drawn' | 'typed';
  signatureDataUrl?: string;
  documentHash?: string;
  certificateHash: string;
  verified: boolean;
}

export interface ContractSignaturesState {
  contractor: SignatureRecord | null;
  client: SignatureRecord | null;
}
