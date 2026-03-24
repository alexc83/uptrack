import { CeRecord } from './ce-record.models';
import { Credential } from './credential.models';
import { IsoDate } from './common.models';

export interface DashboardStats {
  totalCredentials: number;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  needsCEAttentionCount: number;
}

export interface DashboardActivity {
  id: string;
  credentialId: string;
  title: string;
  subtitle: string;
  icon: string;
  activityDate: IsoDate;
}

export interface Dashboard {
  stats: DashboardStats;
  upcomingExpirations: Credential[];
  ceAttention: Credential[];
  recentActivity: DashboardActivity[];
}

export interface DashboardData {
  dashboard: Dashboard;
  credentials: Credential[];
  ceRecords: CeRecord[];
}
