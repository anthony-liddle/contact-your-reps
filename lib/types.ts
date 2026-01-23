/**
 * Type definitions for the application
 */

export interface FieldOffice {
  phone: string;
  city: string;
}

export interface Representative {
  id: string;
  name: string;
  phone: string;
  url: string;
  photoUrl?: string;
  party: string;
  state: string;
  reason: string;
  area: string;
  fieldOffices?: FieldOffice[];
}

export interface FiveCallsResponse {
  location: string;
  lowAccuracy: boolean;
  isSplit: boolean;
  state: string;
  district: string;
  representatives: Representative[];
  error?: string;
}

export interface RepresentativesResult {
  representatives: Representative[];
  location?: string;
  state?: string;
  district?: string;
  lowAccuracy?: boolean;
  error?: string;
}

export interface GeneratedMessage {
  to: string;
  subject: string;
  body: string;
}
