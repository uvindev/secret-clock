/**
 * @project  SecretClock — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

import type {
  AuditResult,
  Finding,
  FindingCode,
  SecretRecord,
} from "@/lib/types";

const RULES: Record<FindingCode, Pick<Finding, "severity" | "action">> = {
  expired: {
    severity: "high",
    action:
      "Confirm dependency state, then replace or retire the credential at its source.",
  },
  rotation_overdue: {
    severity: "high",
    action:
      "Confirm the owner and consumer rollout plan before rotating at the source.",
  },
  rotation_due_soon: {
    severity: "medium",
    action:
      "Schedule the source rotation and consumer update before the due date.",
  },
  rotation_disabled: {
    severity: "medium",
    action:
      "Confirm whether this credential has a documented manual rotation process.",
  },
  rotation_evidence_missing: {
    severity: "medium",
    action:
      "Find the last source rotation or update record before assigning a deadline.",
  },
  policy_missing: {
    severity: "low",
    action: "Attach an organization-approved interval or explicit next date.",
  },
  owner_missing: {
    severity: "low",
    action: "Assign an accountable owner before changing the credential.",
  },
  duplicate_record: {
    severity: "high",
    action:
      "Confirm whether both records refer to the same credential and keep one source of truth.",
  },
};

export function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function recordDueDate(record: SecretRecord): string | null {
  if (record.nextRotationDate) return record.nextRotationDate;
  if (record.lastRotatedDate && record.policyDays)
    return addDays(record.lastRotatedDate, record.policyDays);
  return null;
}

function finding(
  record: SecretRecord,
  code: FindingCode,
  reason: string,
  dueDate: string | null,
  referenceDate: string,
): Finding {
  return {
    code,
    record,
    reason,
    dueDate,
    daysUntilDue: dueDate ? daysBetween(referenceDate, dueDate) : null,
    ...RULES[code],
  };
}

export function auditSecrets(
  records: SecretRecord[],
  referenceDate: string,
  warningDays: number,
): AuditResult {
  const findings: Finding[] = [];
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();
  records.forEach((record) => {
    const key = `${record.source.toLowerCase()}\u0000${record.environment.toLowerCase()}\u0000${record.name.toLowerCase()}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  });

  records.forEach((record) => {
    const dueDate = recordDueDate(record);
    const key = `${record.source.toLowerCase()}\u0000${record.environment.toLowerCase()}\u0000${record.name.toLowerCase()}`;
    if (record.expiresAt && daysBetween(referenceDate, record.expiresAt) < 0) {
      findings.push(
        finding(
          record,
          "expired",
          `The supplied expiry date ${record.expiresAt} has passed.`,
          record.expiresAt,
          referenceDate,
        ),
      );
    }
    if (dueDate) {
      const daysUntil = daysBetween(referenceDate, dueDate);
      if (daysUntil < 0)
        findings.push(
          finding(
            record,
            "rotation_overdue",
            `Rotation evidence is ${Math.abs(daysUntil)} days past the policy due date.`,
            dueDate,
            referenceDate,
          ),
        );
      else if (daysUntil <= warningDays)
        findings.push(
          finding(
            record,
            "rotation_due_soon",
            `The policy due date is in ${daysUntil} days.`,
            dueDate,
            referenceDate,
          ),
        );
    }
    if (record.rotationEnabled === false)
      findings.push(
        finding(
          record,
          "rotation_disabled",
          "Automatic rotation is disabled in the supplied metadata.",
          dueDate,
          referenceDate,
        ),
      );
    if (!record.lastRotatedDate)
      findings.push(
        finding(
          record,
          "rotation_evidence_missing",
          "No last-rotation or update timestamp was supplied.",
          dueDate,
          referenceDate,
        ),
      );
    if (!record.nextRotationDate && !record.policyDays)
      findings.push(
        finding(
          record,
          "policy_missing",
          "No explicit next date or rotation interval was supplied.",
          null,
          referenceDate,
        ),
      );
    if (!record.owner)
      findings.push(
        finding(
          record,
          "owner_missing",
          "No accountable owner was supplied.",
          dueDate,
          referenceDate,
        ),
      );
    if (duplicateKeys.has(key))
      findings.push(
        finding(
          record,
          "duplicate_record",
          "The source, environment, and name combination appears more than once.",
          dueDate,
          referenceDate,
        ),
      );
  });

  const priority = { high: 0, medium: 1, low: 2 } as const;
  findings.sort(
    (a, b) =>
      priority[a.severity] - priority[b.severity] ||
      (a.daysUntilDue ?? 10000) - (b.daysUntilDue ?? 10000) ||
      a.record.name.localeCompare(b.record.name),
  );
  const affected = new Set(findings.map((entry) => entry.record.id));
  const overdue = new Set(
    findings
      .filter(
        (entry) =>
          entry.code === "rotation_overdue" || entry.code === "expired",
      )
      .map((entry) => entry.record.id),
  );
  const dueSoon = new Set(
    findings
      .filter((entry) => entry.code === "rotation_due_soon")
      .map((entry) => entry.record.id),
  );
  return {
    findings,
    reviewedRecords: records.length,
    affectedRecords: affected.size,
    sourceCount: new Set(records.map((record) => record.source.toLowerCase()))
      .size,
    overdueRecords: overdue.size,
    dueSoonRecords: dueSoon.size,
  };
}

export function maskSecretName(name: string): string {
  if (name.length <= 4) return `${name.slice(0, 1)}•••`;
  const visible = Math.min(4, Math.max(2, Math.floor(name.length / 4)));
  return `${name.slice(0, visible)}${"•".repeat(Math.min(8, name.length - visible * 2))}${name.slice(-visible)}`;
}

function escapeCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function rowsToCsv(rows: Array<Array<string | number | null>>): string {
  return `${rows.map((row) => row.map(escapeCell).join(",")).join("\n")}\n`;
}

export function findingsToCsv(findings: Finding[]): string {
  return rowsToCsv([
    [
      "severity",
      "code",
      "source",
      "environment",
      "secret_name",
      "owner",
      "evidence_type",
      "last_rotated_date",
      "due_date",
      "days_until_due",
      "reason",
      "recommended_action",
    ],
    ...findings.map((entry) => [
      entry.severity,
      entry.code,
      entry.record.source,
      entry.record.environment,
      entry.record.name,
      entry.record.owner,
      entry.record.evidenceType,
      entry.record.lastRotatedDate,
      entry.dueDate,
      entry.daysUntilDue,
      entry.reason,
      entry.action,
    ]),
  ]);
}
