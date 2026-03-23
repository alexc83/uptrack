import { User } from '../app/models/user.model';
import { Credential } from '../app/models/credential.model';
import { CeRecord } from '../app/models/ce-record.model';
import { Dashboard } from '../app/models/dashboard.model';

// ─── Test User ────────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: 'user-001',
  name: 'Sarah Mitchell',
  email: 'sarah.mitchell@example.com',
  createdAt: '2024-01-15T09:00:00Z',
};

// ─── Credentials ─────────────────────────────────────────────────────────────
// Covers all three statuses: ACTIVE, EXPIRING_SOON, EXPIRED
// Mix of LICENSE and CERTIFICATION types

export const MOCK_CREDENTIALS: Credential[] = [
  // ACTIVE — RN License (expires ~14 months out)
  {
    id: 'cred-001',
    name: 'RN License — Texas',
    type: 'LICENSE',
    issuingOrganization: 'Texas Board of Nursing',
    expirationDate: '2027-05-31',
    renewalCycleMonths: 24,
    requiredCEHours: 20,
    userId: 'user-001',
    status: 'ACTIVE',
    ceHoursEarned: 14,
    ceProgress: 0.7,
  },

  // ACTIVE — CCRN Certification (expires ~8 months out, CE well underway)
  {
    id: 'cred-002',
    name: 'CCRN — Critical Care RN',
    type: 'CERTIFICATION',
    issuingOrganization: 'AACN Certification Corporation',
    expirationDate: '2026-11-30',
    renewalCycleMonths: 36,
    requiredCEHours: 100,
    userId: 'user-001',
    status: 'ACTIVE',
    ceHoursEarned: 62,
    ceProgress: 0.62,
  },

  // ACTIVE — NRP (no CE required)
  {
    id: 'cred-003',
    name: 'NRP — Neonatal Resuscitation',
    type: 'CERTIFICATION',
    issuingOrganization: 'American Academy of Pediatrics',
    expirationDate: '2026-09-15',
    renewalCycleMonths: 24,
    requiredCEHours: 0,
    userId: 'user-001',
    status: 'ACTIVE',
    ceHoursEarned: 0,
    ceProgress: 0,
  },

  // EXPIRING_SOON — BLS (expires in ~45 days from 2026-03-23)
  {
    id: 'cred-004',
    name: 'BLS — Basic Life Support',
    type: 'CERTIFICATION',
    issuingOrganization: 'American Heart Association',
    expirationDate: '2026-05-07',
    renewalCycleMonths: 24,
    requiredCEHours: 0,
    userId: 'user-001',
    status: 'EXPIRING_SOON',
    ceHoursEarned: 0,
    ceProgress: 0,
  },

  // EXPIRING_SOON — ACLS (expires in ~70 days from 2026-03-23)
  {
    id: 'cred-005',
    name: 'ACLS — Advanced Cardiovascular Life Support',
    type: 'CERTIFICATION',
    issuingOrganization: 'American Heart Association',
    expirationDate: '2026-06-01',
    renewalCycleMonths: 24,
    requiredCEHours: 0,
    userId: 'user-001',
    status: 'EXPIRING_SOON',
    ceHoursEarned: 0,
    ceProgress: 0,
  },

  // EXPIRING_SOON — DEA Registration (expires in ~85 days, needs CE attention)
  {
    id: 'cred-006',
    name: 'DEA Registration',
    type: 'LICENSE',
    issuingOrganization: 'Drug Enforcement Administration',
    expirationDate: '2026-06-16',
    renewalCycleMonths: 36,
    requiredCEHours: 8,
    userId: 'user-001',
    status: 'EXPIRING_SOON',
    ceHoursEarned: 2,
    ceProgress: 0.25,
  },

  // EXPIRED — PALS (expired ~3 months ago)
  {
    id: 'cred-007',
    name: 'PALS — Pediatric Advanced Life Support',
    type: 'CERTIFICATION',
    issuingOrganization: 'American Heart Association',
    expirationDate: '2025-12-20',
    renewalCycleMonths: 24,
    requiredCEHours: 0,
    userId: 'user-001',
    status: 'EXPIRED',
    ceHoursEarned: 0,
    ceProgress: 0,
  },

  // EXPIRED — CEN (expired ~6 months ago, had CE deficit)
  {
    id: 'cred-008',
    name: 'CEN — Certified Emergency Nurse',
    type: 'CERTIFICATION',
    issuingOrganization: 'Board of Certification for Emergency Nursing',
    expirationDate: '2025-09-30',
    renewalCycleMonths: 48,
    requiredCEHours: 100,
    userId: 'user-001',
    status: 'EXPIRED',
    ceHoursEarned: 45,
    ceProgress: 0.45,
  },
];

// ─── CE Records ───────────────────────────────────────────────────────────────

export const MOCK_CE_RECORDS: CeRecord[] = [
  // ── cred-001: RN License — Texas (14 of 20 hrs earned) ──────────────────────
  {
    id: 'ce-001',
    title: 'Sepsis Recognition and Management',
    provider: 'AACN eLearning',
    hours: 4,
    dateCompleted: '2025-09-10',
    certificateUrl: 'https://example.com/certs/ce-001.pdf',
    credentialId: 'cred-001',
    userId: 'user-001',
  },
  {
    id: 'ce-002',
    title: 'Pain Management in the ICU',
    provider: 'Nursing CE Central',
    hours: 3,
    dateCompleted: '2025-10-22',
    credentialId: 'cred-001',
    userId: 'user-001',
  },
  {
    id: 'ce-003',
    title: 'Patient Safety & Error Prevention',
    provider: 'Texas Nurses Association',
    hours: 2,
    dateCompleted: '2025-11-05',
    certificateUrl: 'https://example.com/certs/ce-003.pdf',
    credentialId: 'cred-001',
    userId: 'user-001',
  },
  {
    id: 'ce-004',
    title: 'Medication Administration Best Practices',
    provider: 'NursingCE.com',
    hours: 2,
    dateCompleted: '2026-01-14',
    credentialId: 'cred-001',
    userId: 'user-001',
  },
  {
    id: 'ce-005',
    title: 'Cardiovascular Nursing Update 2025',
    provider: 'Texas Board of Nursing Approved Provider',
    hours: 3,
    dateCompleted: '2026-02-28',
    certificateUrl: 'https://example.com/certs/ce-005.pdf',
    credentialId: 'cred-001',
    userId: 'user-001',
  },

  // ── cred-002: CCRN (62 of 100 hrs earned) ───────────────────────────────────
  {
    id: 'ce-006',
    title: 'Mechanical Ventilation Fundamentals',
    provider: 'AACN eLearning',
    hours: 8,
    dateCompleted: '2024-04-18',
    certificateUrl: 'https://example.com/certs/ce-006.pdf',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-007',
    title: 'Hemodynamic Monitoring in Critical Care',
    provider: 'Society of Critical Care Medicine',
    hours: 10,
    dateCompleted: '2024-07-09',
    certificateUrl: 'https://example.com/certs/ce-007.pdf',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-008',
    title: 'Cardiac Arrhythmia Interpretation',
    provider: 'AACN National Teaching Institute',
    hours: 12,
    dateCompleted: '2024-09-22',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-009',
    title: 'Renal Replacement Therapy in the ICU',
    provider: 'AACN eLearning',
    hours: 6,
    dateCompleted: '2025-01-30',
    certificateUrl: 'https://example.com/certs/ce-009.pdf',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-010',
    title: 'End-of-Life Care in the ICU',
    provider: 'Hospice & Palliative Nurses Association',
    hours: 8,
    dateCompleted: '2025-04-11',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-011',
    title: 'Delirium Assessment and Prevention',
    provider: 'AACN eLearning',
    hours: 6,
    dateCompleted: '2025-08-03',
    certificateUrl: 'https://example.com/certs/ce-011.pdf',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-012',
    title: 'Septic Shock: Early Recognition and Bundle Compliance',
    provider: 'Surviving Sepsis Campaign',
    hours: 4,
    dateCompleted: '2025-12-17',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-013',
    title: 'Nutrition in the Critically Ill Patient',
    provider: 'ASPEN eLearning',
    hours: 4,
    dateCompleted: '2026-02-05',
    certificateUrl: 'https://example.com/certs/ce-013.pdf',
    credentialId: 'cred-002',
    userId: 'user-001',
  },
  {
    id: 'ce-014',
    title: 'Post-ICU Syndrome Awareness',
    provider: 'AACN eLearning',
    hours: 4,
    dateCompleted: '2026-03-01',
    credentialId: 'cred-002',
    userId: 'user-001',
  },

  // ── cred-006: DEA Registration (2 of 8 hrs earned) ──────────────────────────
  {
    id: 'ce-015',
    title: 'Controlled Substance Prescribing and DEA Compliance',
    provider: 'DEA Diversion Control Division',
    hours: 2,
    dateCompleted: '2025-11-20',
    certificateUrl: 'https://example.com/certs/ce-015.pdf',
    credentialId: 'cred-006',
    userId: 'user-001',
  },

  // ── cred-008: CEN — Expired (45 of 100 hrs earned at time of expiry) ─────────
  {
    id: 'ce-016',
    title: 'Trauma Nursing Core Course Refresher',
    provider: 'Emergency Nurses Association',
    hours: 16,
    dateCompleted: '2024-02-14',
    certificateUrl: 'https://example.com/certs/ce-016.pdf',
    credentialId: 'cred-008',
    userId: 'user-001',
  },
  {
    id: 'ce-017',
    title: 'Toxicological Emergencies',
    provider: 'Emergency Nurses Association',
    hours: 8,
    dateCompleted: '2024-06-27',
    credentialId: 'cred-008',
    userId: 'user-001',
  },
  {
    id: 'ce-018',
    title: 'Pediatric Emergency Nursing',
    provider: 'Emergency Nurses Association',
    hours: 12,
    dateCompleted: '2025-01-09',
    certificateUrl: 'https://example.com/certs/ce-018.pdf',
    credentialId: 'cred-008',
    userId: 'user-001',
  },
  {
    id: 'ce-019',
    title: 'Stroke Recognition and Triage',
    provider: 'American Stroke Association',
    hours: 4,
    dateCompleted: '2025-05-22',
    credentialId: 'cred-008',
    userId: 'user-001',
  },
  {
    id: 'ce-020',
    title: 'Mass Casualty Incident Preparedness',
    provider: 'FEMA Emergency Management Institute',
    hours: 5,
    dateCompleted: '2025-08-15',
    certificateUrl: 'https://example.com/certs/ce-020.pdf',
    credentialId: 'cred-008',
    userId: 'user-001',
  },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const MOCK_DASHBOARD: Dashboard = {
  stats: {
    totalCredentials: 8,
    activeCount: 3,
    expiringSoonCount: 3,
    expiredCount: 2,
    needsCEAttentionCount: 3, // cred-001 (not yet met), cred-002 (not yet met), cred-006 (not yet met)
  },
  expirationBuckets: {
    within30Days: [],
    within60Days: [MOCK_CREDENTIALS[3]], // BLS — May 7
    within90Days: [MOCK_CREDENTIALS[3], MOCK_CREDENTIALS[4], MOCK_CREDENTIALS[5]], // BLS, ACLS, DEA
  },
  credentialsNeedingCE: [
    MOCK_CREDENTIALS[0], // RN License — 14/20 hrs
    MOCK_CREDENTIALS[1], // CCRN — 62/100 hrs
    MOCK_CREDENTIALS[5], // DEA — 2/8 hrs
  ],
  recentCredentials: MOCK_CREDENTIALS.slice(0, 5),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all CE records for a given credential ID. */
export function getMockCeRecordsForCredential(credentialId: string): CeRecord[] {
  return MOCK_CE_RECORDS.filter((ce) => ce.credentialId === credentialId);
}

/** Returns a single credential by ID, or undefined if not found. */
export function getMockCredentialById(id: string): Credential | undefined {
  return MOCK_CREDENTIALS.find((c) => c.id === id);
}
