import type { ApiId, IsoDate } from './common';
import type { CredentialResponse } from './credentials';
export interface DashboardStats {
  totalCredentials: number;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  needsCEAttentionCount: number;
}
export interface DashboardActivity {
  id: ApiId;
  credentialId: ApiId;
  title: string;
  subtitle: string;
  icon: string;
  activityDate: IsoDate;
}
export interface DashboardResponse {
  stats: DashboardStats;
  upcomingExpirations: CredentialResponse[];
  ceAttention: CredentialResponse[];
  recentActivity: DashboardActivity[];
}
