import { describe, expect, it } from "vitest";
import {
  addDays,
  auditSecrets,
  daysBetween,
  findingsToCsv,
  maskSecretName,
  recordDueDate,
} from "@/lib/audit";
import {
  findSensitiveFieldPaths,
  importSecretMetadata,
  parseCsvRows,
} from "@/lib/importers";
import type { SecretRecord } from "@/lib/types";

const context = {
  environment: "production",
  owner: "Platform",
  policyDays: 90,
};
const HEADER =
  "source,secret_name,environment,owner,last_rotated_date,next_rotation_date,expires_at,rotation_enabled,policy_days";

function record(overrides: Partial<SecretRecord> = {}): SecretRecord {
  return {
    id: "record-1",
    row: 1,
    source: "AWS Secrets Manager",
    sourceKind: "aws_secrets_manager",
    name: "payments/database",
    environment: "production",
    owner: "Platform",
    lastRotatedDate: "2026-05-01",
    nextRotationDate: null,
    expiresAt: null,
    rotationEnabled: true,
    policyDays: 90,
    evidenceType: "rotation_timestamp",
    ...overrides,
  };
}

describe("sensitive field boundary", () => {
  it("finds a nested AWS SecretString", () => {
    expect(
      findSensitiveFieldPaths({
        SecretList: [{ Name: "a", SecretString: "secret" }],
      }),
    ).toEqual(["$.SecretList[0].SecretString"]);
  });

  it("finds common value-bearing field spellings", () => {
    expect(
      findSensitiveFieldPaths({
        accessToken: "a",
        private_key: "b",
        client_secret: "c",
      }),
    ).toEqual(["$.accessToken", "$.private_key", "$.client_secret"]);
  });

  it("does not treat NextToken as a credential value", () => {
    expect(
      findSensitiveFieldPaths({ NextToken: "pagination", SecretList: [] }),
    ).toEqual([]);
  });

  it("blocks AWS JSON before parsing records", () => {
    const result = importSecretMetadata(
      "aws_secrets_manager",
      JSON.stringify({ SecretList: [{ Name: "a", SecretBinary: "value" }] }),
      context,
    );
    expect(result.records).toEqual([]);
    expect(result.blockedPaths).toEqual(["$.SecretList[0].SecretBinary"]);
  });

  it("blocks a normalized CSV value column", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER},password\nAWS,a,prod,Owner,,,,true,90,secret`,
      context,
    );
    expect(result.blockedPaths).toEqual(["$.password"]);
  });
});

describe("CSV parser and normalized adapter", () => {
  it("parses commas inside quoted cells", () => {
    expect(parseCsvRows('a,b\n"x,y",z')[1]).toEqual(["x,y", "z"]);
  });

  it("parses escaped quotes", () => {
    expect(parseCsvRows('a\n"say ""hello"""')[1][0]).toBe('say "hello"');
  });

  it("parses CRLF input", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => parseCsvRows('a\n"broken')).toThrow("unclosed");
  });

  it("imports a complete normalized row", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nCloudflare,worker-key,production,Platform,2026-05-01,2026-08-01,,true,90`,
      context,
    );
    expect(result.issues).toEqual([]);
    expect(result.records[0]).toMatchObject({
      source: "Cloudflare",
      name: "worker-key",
      evidenceType: "user_supplied",
      rotationEnabled: true,
    });
  });

  it("removes a UTF-8 byte order mark", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `\uFEFF${HEADER}\nAWS,a,prod,Owner,,,,true,90`,
      context,
    );
    expect(result.records).toHaveLength(1);
  });

  it("uses context defaults for empty environment owner and policy", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,,,,,,false,`,
      context,
    );
    expect(result.records[0]).toMatchObject({
      environment: "production",
      owner: "Platform",
      policyDays: 90,
    });
  });

  it("keeps a blank expiry separate from disabled rotation", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nInternal,legacy-deploy-key,staging,,,,,false,`,
      context,
    );
    expect(result.issues).toEqual([]);
    expect(result.records[0]).toMatchObject({
      expiresAt: null,
      rotationEnabled: false,
    });
  });

  it("reports every missing column", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      "source,secret_name\nAWS,a",
      context,
    );
    expect(result.issues[0].message).toContain("environment");
    expect(result.issues[0].message).toContain("policy_days");
  });

  it("reports an empty CSV", () => {
    expect(
      importSecretMetadata("normalized_csv", " ", context).issues[0].message,
    ).toContain("Paste or load");
  });

  it("reports empty source and name", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\n,,prod,Owner,,,,true,90`,
      context,
    );
    expect(result.issues[0].message).toContain("source is empty");
    expect(result.issues[0].message).toContain("secret_name is empty");
  });

  it("rejects non-ISO dates", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,prod,Owner,01/01/2026,,,true,90`,
      context,
    );
    expect(result.issues[0].message).toContain("YYYY-MM-DD");
  });

  it("accepts supported boolean spellings", () => {
    const enabled = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,prod,Owner,,,,enabled,90`,
      context,
    );
    const disabled = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,prod,Owner,,,,no,90`,
      context,
    );
    expect(enabled.records[0].rotationEnabled).toBe(true);
    expect(disabled.records[0].rotationEnabled).toBe(false);
  });

  it("rejects an unknown boolean", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,prod,Owner,,,,sometimes,90`,
      context,
    );
    expect(result.issues[0].message).toContain("rotation_enabled");
  });

  it("rejects policy intervals outside 1 through 999", () => {
    const result = importSecretMetadata(
      "normalized_csv",
      `${HEADER}\nAWS,a,prod,Owner,,,,true,1000`,
      context,
    );
    expect(result.issues[0].message).toContain("between 1 and 999");
  });

  it("keeps valid rows while reporting invalid rows", () => {
    const input = `${HEADER}\nAWS,a,prod,Owner,2026-01-01,,,true,90\nAWS,b,prod,Owner,bad,,,true,90`;
    const result = importSecretMetadata("normalized_csv", input, context);
    expect(result.records).toHaveLength(1);
    expect(result.issues[0].row).toBe(3);
  });
});

describe("provider adapters", () => {
  it("imports AWS rotation metadata and epoch seconds", () => {
    const input = JSON.stringify({
      SecretList: [
        {
          Name: "db",
          LastRotatedDate: 1777593600,
          NextRotationDate: 1785379200,
          RotationEnabled: true,
        },
      ],
    });
    const result = importSecretMetadata("aws_secrets_manager", input, context);
    expect(result.records[0]).toMatchObject({
      name: "db",
      lastRotatedDate: "2026-05-01",
      nextRotationDate: "2026-07-30",
      evidenceType: "rotation_timestamp",
    });
  });

  it("imports AWS records without rotation evidence", () => {
    const result = importSecretMetadata(
      "aws_secrets_manager",
      JSON.stringify({
        SecretList: [{ Name: "legacy", RotationEnabled: false }],
      }),
      context,
    );
    expect(result.records[0]).toMatchObject({
      lastRotatedDate: null,
      rotationEnabled: false,
      evidenceType: "none",
    });
  });

  it("rejects malformed AWS JSON", () => {
    expect(
      importSecretMetadata("aws_secrets_manager", "{broken", context).issues[0]
        .message,
    ).toContain("valid JSON");
  });

  it("rejects an AWS shape without SecretList", () => {
    expect(
      importSecretMetadata("aws_secrets_manager", "{}", context).issues[0]
        .message,
    ).toContain("SecretList");
  });

  it("imports GitHub updated_at as update evidence", () => {
    const input = JSON.stringify({
      secrets: [
        {
          name: "DEPLOY_TOKEN",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
        },
      ],
    });
    const result = importSecretMetadata("github_actions", input, context);
    expect(result.records[0]).toMatchObject({
      name: "DEPLOY_TOKEN",
      lastRotatedDate: "2026-05-01",
      evidenceType: "update_timestamp",
      rotationEnabled: null,
    });
  });

  it("rejects malformed GitHub timestamps", () => {
    const input = JSON.stringify({
      secrets: [{ name: "A", created_at: "bad", updated_at: "bad" }],
    });
    expect(
      importSecretMetadata("github_actions", input, context).issues[0].message,
    ).toContain("created_at");
  });

  it("rejects missing import context", () => {
    const result = importSecretMetadata(
      "github_actions",
      JSON.stringify({ secrets: [] }),
      { environment: "", policyDays: -1 },
    );
    expect(result.issues[0].message).toContain("Import context");
  });

  it("rejects input above one megabyte", () => {
    const result = importSecretMetadata(
      "aws_secrets_manager",
      "x".repeat(1_000_001),
      context,
    );
    expect(result.issues[0].message).toContain("1 MB");
  });
});

describe("rotation audit", () => {
  it("calculates UTC day differences", () => {
    expect(daysBetween("2026-08-01", "2026-08-15")).toBe(14);
  });

  it("adds policy days in UTC", () => {
    expect(addDays("2026-05-01", 90)).toBe("2026-07-30");
  });

  it("prefers an explicit next date", () => {
    expect(
      recordDueDate(record({ nextRotationDate: "2026-08-20", policyDays: 1 })),
    ).toBe("2026-08-20");
  });

  it("calculates a due date from evidence and policy", () => {
    expect(recordDueDate(record())).toBe("2026-07-30");
  });

  it("flags an expired credential", () => {
    const result = auditSecrets(
      [record({ expiresAt: "2026-08-14", nextRotationDate: "2026-12-01" })],
      "2026-08-15",
      30,
    );
    expect(result.findings[0]).toMatchObject({
      code: "expired",
      severity: "high",
      daysUntilDue: -1,
    });
  });

  it("flags an overdue rotation", () => {
    const result = auditSecrets([record()], "2026-08-15", 30);
    expect(result.findings.map((entry) => entry.code)).toContain(
      "rotation_overdue",
    );
  });

  it("treats a due-today record as due soon", () => {
    const result = auditSecrets(
      [record({ nextRotationDate: "2026-08-15" })],
      "2026-08-15",
      30,
    );
    expect(result.findings[0]).toMatchObject({
      code: "rotation_due_soon",
      daysUntilDue: 0,
    });
  });

  it("includes the exact warning-window boundary", () => {
    const result = auditSecrets(
      [record({ nextRotationDate: "2026-09-14" })],
      "2026-08-15",
      30,
    );
    expect(result.findings[0].code).toBe("rotation_due_soon");
  });

  it("does not flag a future due date outside the warning window", () => {
    expect(
      auditSecrets(
        [record({ nextRotationDate: "2026-09-15" })],
        "2026-08-15",
        30,
      ).findings,
    ).toEqual([]);
  });

  it("flags disabled rotation without claiming removal", () => {
    const result = auditSecrets(
      [record({ rotationEnabled: false, nextRotationDate: "2026-12-01" })],
      "2026-08-15",
      30,
    );
    expect(result.findings[0]).toMatchObject({
      code: "rotation_disabled",
      severity: "medium",
    });
    expect(result.findings[0].action).toContain("manual rotation process");
  });

  it("flags missing evidence policy and owner", () => {
    const result = auditSecrets(
      [
        record({
          lastRotatedDate: null,
          nextRotationDate: null,
          policyDays: null,
          owner: null,
        }),
      ],
      "2026-08-15",
      30,
    );
    expect(result.findings.map((entry) => entry.code)).toEqual([
      "rotation_evidence_missing",
      "policy_missing",
      "owner_missing",
    ]);
  });

  it("flags both records in a case-insensitive duplicate", () => {
    const result = auditSecrets(
      [
        record(),
        record({
          id: "record-2",
          row: 2,
          source: "aws secrets manager",
          environment: "PRODUCTION",
          name: "PAYMENTS/DATABASE",
        }),
      ],
      "2026-01-01",
      30,
    );
    expect(
      result.findings.filter((entry) => entry.code === "duplicate_record"),
    ).toHaveLength(2);
  });

  it("counts an affected record once across findings", () => {
    const result = auditSecrets(
      [record({ owner: null, rotationEnabled: false })],
      "2026-08-15",
      30,
    );
    expect(result.findings.length).toBeGreaterThan(1);
    expect(result.affectedRecords).toBe(1);
  });

  it("counts distinct sources case-insensitively", () => {
    const result = auditSecrets(
      [
        record(),
        record({ id: "2", name: "other", source: "aws secrets manager" }),
      ],
      "2026-01-01",
      30,
    );
    expect(result.sourceCount).toBe(1);
  });
});

describe("name masking and queue export", () => {
  it("masks a long secret name at both edges", () => {
    expect(maskSecretName("payments/database")).toBe("paym••••••••base");
  });

  it("masks a short secret name", () => {
    expect(maskSecretName("KEY")).toBe("K•••");
  });

  it("exports raw names and evidence labels for local review", () => {
    const result = auditSecrets([record()], "2026-08-15", 30);
    const csv = findingsToCsv(result.findings);
    expect(csv).toContain("severity,code,source,environment,secret_name");
    expect(csv).toContain("payments/database");
    expect(csv).toContain("rotation_timestamp");
  });

  it("neutralizes spreadsheet formulas in exported names", () => {
    const result = auditSecrets(
      [record({ name: '=HYPERLINK("https://bad.test")' })],
      "2026-08-15",
      30,
    );
    expect(findingsToCsv(result.findings)).toContain("'=HYPERLINK");
  });
});
