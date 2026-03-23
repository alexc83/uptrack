export interface CeRecord {
  id: string;
  title: string;
  provider: string;
  hours: number;
  dateCompleted: string; // ISO date string: YYYY-MM-DD
  certificateUrl?: string;
  credentialId: string;
  userId: string;
}
