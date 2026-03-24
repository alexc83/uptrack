import { CeRecord } from './ce-record.models';
import { Credential } from './credential.models';

export interface DashboardStats {
  totalCredentials: number;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  needsCEAttentionCount: number;
}

export interface ExpirationBuckets {
  within30Days: Credential[];
  within60Days: Credential[];
  within90Days: Credential[];
}

export interface Dashboard {
  stats: DashboardStats;
  expirationBuckets: ExpirationBuckets;
  credentialsNeedingCE: Credential[];
  recentCredentials: Credential[];
}

export interface DashboardData {
  dashboard: Dashboard;
  credentials: Credential[];
  ceRecords: CeRecord[];
}
