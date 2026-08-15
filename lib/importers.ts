/**
 * @project  SecretClock — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

import {
  awsSecretListSchema,
  githubSecretListSchema,
  importContextSchema,
  sourceKindSchema,
  type ImportContext,
  type SourceKind,
} from "@/lib/schemas/secret-metadata";
import type { ImportIssue, ImportResult, SecretRecord } from "@/lib/types";

export const NORMALIZED_HEADERS = [
  "source",
  "secret_name",
  "environment",
  "owner",
  "last_rotated_date",
  "next_rotation_date",
  "expires_at",
  "rotation_enabled",
  "policy_days",
] as const;

export const TEMPLATE_CSV = `${NORMALIZED_HEADERS.join(",")}\n`;

const SENSITIVE_FIELDS = new Set([
  "value",
  "secret_value",
  "secret_string",
  "secret_binary",
  "plaintext",
  "password",
  "private_key",
  "client_secret",
  "access_token",
  "refresh_token",
]);

function normalizedKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[ -]+/g, "_");
}

export function findSensitiveFieldPaths(
  value: unknown,
  path = "$",
  matches: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      findSensitiveFieldPaths(entry, `${path}[${index}]`, matches),
    );
    return matches;
  }
  if (!value || typeof value !== "object") return matches;
  Object.entries(value).forEach(([key, entry]) => {
    const nextPath = `${path}.${key}`;
    if (SENSITIVE_FIELDS.has(normalizedKey(key))) matches.push(nextPath);
    findSensitiveFieldPaths(entry, nextPath, matches);
  });
  return matches;
}

export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function toDate(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function parseEnabled(value: string): boolean | null | "invalid" {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "enabled", "1"].includes(normalized)) return true;
  if (["false", "no", "disabled", "0"].includes(normalized)) return false;
  return "invalid";
}

function issue(message: string, row = 1): ImportResult {
  return { records: [], issues: [{ row, message }], blockedPaths: [] };
}

function importAws(input: string, context: ImportContext): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    return issue("AWS input must be valid JSON.");
  }
  const blockedPaths = findSensitiveFieldPaths(json);
  if (blockedPaths.length) return { records: [], issues: [], blockedPaths };
  const parsed = awsSecretListSchema.safeParse(json);
  if (!parsed.success)
    return issue(
      "AWS input must contain a SecretList array with a Name for every record.",
    );
  const records = parsed.data.SecretList.map<SecretRecord>((secret, index) => ({
    id: `aws:${index + 1}:${secret.Name}`,
    row: index + 1,
    source: "AWS Secrets Manager",
    sourceKind: "aws_secrets_manager",
    name: secret.Name,
    environment: context.environment,
    owner: context.owner || null,
    lastRotatedDate: toDate(secret.LastRotatedDate),
    nextRotationDate: toDate(secret.NextRotationDate),
    expiresAt: null,
    rotationEnabled: secret.RotationEnabled ?? null,
    policyDays: context.policyDays || null,
    evidenceType: secret.LastRotatedDate ? "rotation_timestamp" : "none",
  }));
  return { records, issues: [], blockedPaths: [] };
}

function importGithub(input: string, context: ImportContext): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    return issue("GitHub input must be valid JSON.");
  }
  const blockedPaths = findSensitiveFieldPaths(json);
  if (blockedPaths.length) return { records: [], issues: [], blockedPaths };
  const parsed = githubSecretListSchema.safeParse(json);
  if (!parsed.success)
    return issue(
      "GitHub input must contain a secrets array with name, created_at, and updated_at fields.",
    );
  const records = parsed.data.secrets.map<SecretRecord>((secret, index) => ({
    id: `github:${index + 1}:${secret.name}`,
    row: index + 1,
    source: "GitHub Actions",
    sourceKind: "github_actions",
    name: secret.name,
    environment: context.environment,
    owner: context.owner || null,
    lastRotatedDate: toDate(secret.updated_at),
    nextRotationDate: null,
    expiresAt: null,
    rotationEnabled: null,
    policyDays: context.policyDays || null,
    evidenceType: "update_timestamp",
  }));
  return { records, issues: [], blockedPaths: [] };
}

function importCsv(input: string, context: ImportContext): ImportResult {
  let rows: string[][];
  try {
    rows = parseCsvRows(input.replace(/^\uFEFF/, ""));
  } catch (error) {
    return issue(
      error instanceof Error ? error.message : "The CSV could not be parsed.",
    );
  }
  if (!rows.length) return issue("The CSV is empty.");
  const headers = rows[0].map(normalizedKey);
  const blockedHeaders = headers.filter((header) =>
    SENSITIVE_FIELDS.has(header),
  );
  if (blockedHeaders.length)
    return {
      records: [],
      issues: [],
      blockedPaths: blockedHeaders.map((header) => `$.${header}`),
    };
  const missing = NORMALIZED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missing.length) return issue(`Missing columns: ${missing.join(", ")}.`);
  if (rows.length > 5001)
    return issue("The CSV exceeds the 5,000-record limit.");
  const indexOf = (header: string) => headers.indexOf(header);
  const records: SecretRecord[] = [];
  const issues: ImportIssue[] = [];
  rows.slice(1).forEach((cells, index) => {
    const row = index + 2;
    const read = (header: string) => (cells[indexOf(header)] ?? "").trim();
    const source = read("source");
    const name = read("secret_name");
    const environment = read("environment") || context.environment;
    const owner = read("owner") || context.owner;
    const lastRotatedDate = read("last_rotated_date");
    const nextRotationDate = read("next_rotation_date");
    const expiresAt = read("expires_at");
    const rotationEnabled = parseEnabled(read("rotation_enabled"));
    const rawPolicyDays = read("policy_days");
    const policyDays = rawPolicyDays
      ? Number(rawPolicyDays)
      : context.policyDays || null;
    const rowIssues: string[] = [];
    if (!source) rowIssues.push("source is empty");
    if (!name) rowIssues.push("secret_name is empty");
    if (!environment) rowIssues.push("environment is empty");
    for (const [label, value] of [
      ["last_rotated_date", lastRotatedDate],
      ["next_rotation_date", nextRotationDate],
      ["expires_at", expiresAt],
    ] as const) {
      if (value && !validDate(value))
        rowIssues.push(`${label} must use YYYY-MM-DD`);
    }
    if (rotationEnabled === "invalid")
      rowIssues.push(
        "rotation_enabled must be true, false, enabled, disabled, or blank",
      );
    if (
      policyDays !== null &&
      (!Number.isInteger(policyDays) || policyDays < 1 || policyDays > 999)
    )
      rowIssues.push("policy_days must be between 1 and 999 or blank");
    if (rowIssues.length) {
      issues.push({ row, message: rowIssues.join("; ") });
      return;
    }
    records.push({
      id: `csv:${row}:${source}:${name}`,
      row,
      source,
      sourceKind: "normalized_csv",
      name,
      environment,
      owner: owner || null,
      lastRotatedDate: lastRotatedDate || null,
      nextRotationDate: nextRotationDate || null,
      expiresAt: expiresAt || null,
      rotationEnabled: rotationEnabled as boolean | null,
      policyDays,
      evidenceType: lastRotatedDate ? "user_supplied" : "none",
    });
  });
  return { records, issues, blockedPaths: [] };
}

export function importSecretMetadata(
  kind: SourceKind,
  input: string,
  rawContext: unknown,
): ImportResult {
  const sourceKind = sourceKindSchema.parse(kind);
  const context = importContextSchema.safeParse(rawContext);
  if (!context.success)
    return issue(
      "Import context requires an environment and a policy from 0 to 999 days.",
    );
  if (!input.trim()) return issue("Paste or load metadata to begin.");
  if (input.length > 1_000_000)
    return issue("The input exceeds the 1 MB workbench limit.");
  if (sourceKind === "aws_secrets_manager")
    return importAws(input, context.data);
  if (sourceKind === "github_actions") return importGithub(input, context.data);
  return importCsv(input, context.data);
}
