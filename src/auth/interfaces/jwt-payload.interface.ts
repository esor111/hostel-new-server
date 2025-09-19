export interface JwtPayload {
  id: string;           // User identifier
  kahaId: string;       // Kaha system identifier
  businessId?: string;  // Hostel identifier (only in Business Token)
  iat?: number;         // Issued at
  exp?: number;         // Expiration
}