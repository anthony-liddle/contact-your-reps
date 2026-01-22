/**
 * Type definitions for the application
 */

export interface Representative {
  name: string;
  office: string;
  party?: string;
  emails?: string[];
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  contactFormUrl?: string;
  bioguideId?: string;
  channels?: {
    type: string;
    id: string;
  }[];
}

export interface RepresentativesResult {
  representatives: Representative[];
  normalizedInput?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  error?: string;
}

export interface GeneratedMessage {
  to: string;
  subject: string;
  body: string;
}
