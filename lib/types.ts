export type EvidenceType =
  | "rotation_timestamp"
  | "update_timestamp"
  | "user_supplied"
  | "none";

export type SecretRecord = {
  id: string;
  row: number;
  source: string;
  sourceKind: "aws_secrets_manager" | "github_actions" | "normalized_csv";
  name: string;
  environment: string;
  owner: string | null;
  lastRotatedDate: string | null;
  nextRotationDate: string | null;
  expiresAt: string | null;
  rotationEnabled: boolean | null;
  policyDays: number | null;
  evidenceType: EvidenceType;
};

export type ImportIssue = { row: number; message: string };
export type ImportResult = {
  records: SecretRecord[];
  issues: ImportIssue[];
  blockedPaths: string[];
};

export type FindingCode =
  | "expired"
  | "rotation_overdue"
  | "rotation_due_soon"
  | "rotation_disabled"
  | "rotation_evidence_missing"
  | "policy_missing"
  | "owner_missing"
  | "duplicate_record";

export type Finding = {
  code: FindingCode;
  severity: "high" | "medium" | "low";
  record: SecretRecord;
  reason: string;
  action: string;
  dueDate: string | null;
  daysUntilDue: number | null;
};

export type AuditResult = {
  findings: Finding[];
  reviewedRecords: number;
  affectedRecords: number;
  sourceCount: number;
  overdueRecords: number;
  dueSoonRecords: number;
};
