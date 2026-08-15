"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { auditSecrets, findingsToCsv, maskSecretName } from "@/lib/audit";
import { trackEvent } from "@/lib/analytics";
import { importSecretMetadata, TEMPLATE_CSV } from "@/lib/importers";
import type { SourceKind } from "@/lib/schemas/secret-metadata";
import type { AuditResult, ImportResult } from "@/lib/types";

const SAMPLES: Record<SourceKind, string> = {
  aws_secrets_manager: JSON.stringify(
    {
      SecretList: [
        {
          Name: "payments/prod/database",
          LastRotatedDate: "2026-04-01T00:00:00Z",
          NextRotationDate: "2026-07-01T00:00:00Z",
          RotationEnabled: true,
        },
        {
          Name: "webhook/signing",
          LastRotatedDate: "2026-08-01T00:00:00Z",
          NextRotationDate: "2026-08-29T00:00:00Z",
          RotationEnabled: false,
        },
        {
          Name: "legacy/api",
          LastChangedDate: "2025-12-11T00:00:00Z",
          RotationEnabled: false,
        },
      ],
    },
    null,
    2,
  ),
  github_actions: JSON.stringify(
    {
      total_count: 3,
      secrets: [
        {
          name: "DEPLOY_TOKEN",
          created_at: "2025-11-01T10:00:00Z",
          updated_at: "2026-04-01T10:00:00Z",
        },
        {
          name: "SENTRY_AUTH_TOKEN",
          created_at: "2026-07-01T10:00:00Z",
          updated_at: "2026-08-02T10:00:00Z",
        },
        {
          name: "BASE_RPC_KEY",
          created_at: "2026-01-15T10:00:00Z",
          updated_at: "2026-05-01T10:00:00Z",
        },
      ],
    },
    null,
    2,
  ),
  normalized_csv: `source,secret_name,environment,owner,last_rotated_date,next_rotation_date,expires_at,rotation_enabled,policy_days
Cloudflare,worker-api-token,production,Platform,2026-04-01,,,false,90
Stripe,webhook-signing-secret,production,Payments,2026-08-01,2026-08-29,,true,90
Internal,legacy-deploy-key,staging,,,,,false,
Internal,legacy-deploy-key,staging,,,,,false,`,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

const EMPTY_IMPORT: ImportResult = {
  records: [],
  issues: [],
  blockedPaths: [],
};
const EMPTY_AUDIT: AuditResult = {
  findings: [],
  reviewedRecords: 0,
  affectedRecords: 0,
  sourceCount: 0,
  overdueRecords: 0,
  dueSoonRecords: 0,
};

export function Workbench() {
  const [kind, setKind] = useState<SourceKind>("aws_secrets_manager");
  const [source, setSource] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [owner, setOwner] = useState("");
  const [policyDays, setPolicyDays] = useState(90);
  const [warningDays, setWarningDays] = useState(30);
  const [referenceDate, setReferenceDate] = useState(today);
  const [imported, setImported] = useState<ImportResult>(EMPTY_IMPORT);
  const [audit, setAudit] = useState<AuditResult>(EMPTY_AUDIT);
  const [showNames, setShowNames] = useState(false);
  const [status, setStatus] = useState("Load metadata to begin.");

  useEffect(() => {
    trackEvent("workbench_viewed");
  }, []);

  function runAudit(input = source) {
    const nextImport = importSecretMetadata(kind, input, {
      environment,
      owner,
      policyDays,
    });
    setSource(input);
    setImported(nextImport);
    if (nextImport.blockedPaths.length) {
      setAudit(EMPTY_AUDIT);
      setStatus(
        "Import blocked before analysis. Remove every value-bearing field and export metadata only.",
      );
      return;
    }
    if (nextImport.issues.length) {
      setAudit(EMPTY_AUDIT);
      setStatus(
        `${nextImport.issues.length} import issue${nextImport.issues.length === 1 ? "" : "s"} need attention.`,
      );
      return;
    }
    const nextAudit = auditSecrets(
      nextImport.records,
      referenceDate,
      warningDays,
    );
    setAudit(nextAudit);
    setStatus(
      `${nextImport.records.length} metadata records audited in this browser.`,
    );
    trackEvent("metadata_audited");
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setStatus("File is larger than the 1 MB workbench limit.");
      return;
    }
    await file.text().then((text) => runAudit(text));
  }

  const clockStyle = {
    "--overdue-share": `${audit.reviewedRecords ? Math.round((audit.overdueRecords / audit.reviewedRecords) * 100) : 0}%`,
  } as CSSProperties;

  return (
    <section
      className="workbench"
      id="workbench"
      aria-labelledby="workbench-title"
    >
      <div className="section-heading">
        <span>01 / inventory</span>
        <h2 id="workbench-title">Rotation evidence audit</h2>
        <p>
          Values are forbidden. Names, dates, policy, source, environment, and
          owners stay in this tab.
        </p>
      </div>

      <div className="workbench-shell">
        <div className="input-rack">
          <div className="rack-label">IMPORT CONTROL</div>
          <label>
            Source format
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as SourceKind);
                setSource("");
                setImported(EMPTY_IMPORT);
                setAudit(EMPTY_AUDIT);
                setStatus("Load metadata to begin.");
              }}
            >
              <option value="aws_secrets_manager">AWS ListSecrets JSON</option>
              <option value="github_actions">
                GitHub Actions secrets JSON
              </option>
              <option value="normalized_csv">Normalized CSV</option>
            </select>
          </label>
          <div className="control-grid">
            <label>
              Environment
              <input
                value={environment}
                maxLength={80}
                onChange={(event) => setEnvironment(event.target.value)}
              />
            </label>
            <label>
              Default owner
              <input
                value={owner}
                maxLength={120}
                placeholder="Optional"
                onChange={(event) => setOwner(event.target.value)}
              />
            </label>
            <label>
              Policy interval
              <input
                type="number"
                min="0"
                max="999"
                value={policyDays}
                onChange={(event) => setPolicyDays(Number(event.target.value))}
              />
              <small>0 = unknown</small>
            </label>
            <label>
              Warning window
              <select
                value={warningDays}
                onChange={(event) => setWarningDays(Number(event.target.value))}
              >
                {[7, 14, 30, 45, 60].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reference date
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
              />
            </label>
          </div>
          <label className="source-input">
            Metadata payload
            <textarea
              value={source}
              spellCheck={false}
              placeholder={
                kind === "normalized_csv"
                  ? "Paste the normalized CSV"
                  : "Paste list output JSON"
              }
              onChange={(event) => setSource(event.target.value)}
            />
          </label>
          <div className="input-actions">
            <label className="file-action">
              Load file
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={(event) => void chooseFile(event.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setSource(SAMPLES[kind]);
                setStatus(
                  "Sample loaded. Run the audit when the policy context is correct.",
                );
              }}
            >
              Load sample
            </button>
            {kind === "normalized_csv" ? (
              <button
                type="button"
                onClick={() =>
                  download("secret-clock-template.csv", TEMPLATE_CSV)
                }
              >
                CSV template
              </button>
            ) : null}
            <button
              className="run-button"
              type="button"
              onClick={() => runAudit()}
            >
              Run audit
            </button>
          </div>
          <p className="status-line" aria-live="polite">
            {status}
          </p>
        </div>

        <aside className="clock-panel" aria-label="Rotation status clock">
          <div className="clock" style={clockStyle}>
            <div>
              <strong>{audit.overdueRecords}</strong>
              <span>overdue</span>
            </div>
          </div>
          <dl>
            <div>
              <dt>reviewed</dt>
              <dd>{audit.reviewedRecords}</dd>
            </div>
            <div>
              <dt>affected</dt>
              <dd>{audit.affectedRecords}</dd>
            </div>
            <div>
              <dt>due soon</dt>
              <dd>{audit.dueSoonRecords}</dd>
            </div>
            <div>
              <dt>sources</dt>
              <dd>{audit.sourceCount}</dd>
            </div>
          </dl>
          <p>
            The orange arc is the share of records with an expired or overdue
            deadline. It is not a security score.
          </p>
        </aside>
      </div>

      {imported.blockedPaths.length ? (
        <div className="blocked" role="alert">
          <span>VALUE FIELDS DETECTED</span>
          <h3>Import stopped before parsing records.</h3>
          <p>
            Remove these paths from the export. SecretClock never needs
            credential values.
          </p>
          <ul>
            {imported.blockedPaths.slice(0, 12).map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {imported.issues.length ? (
        <div className="issues" role="alert">
          <strong>Import stopped</strong>
          <ul>
            {imported.issues.slice(0, 12).map((entry) => (
              <li key={`${entry.row}-${entry.message}`}>
                Row {entry.row}: {entry.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {audit.reviewedRecords > 0 ? (
        <div className="results">
          <div className="queue-heading">
            <div>
              <span>02 / decision queue</span>
              <h3>
                {audit.findings.length} findings across {audit.reviewedRecords}{" "}
                {audit.reviewedRecords === 1 ? "record" : "records"}
              </h3>
            </div>
            <label className="name-toggle">
              <input
                type="checkbox"
                checked={showNames}
                onChange={(event) => setShowNames(event.target.checked)}
              />
              Show raw secret names
            </label>
            <button
              type="button"
              onClick={() => {
                download(
                  "secret-clock-rotation-queue.csv",
                  findingsToCsv(audit.findings),
                );
                trackEvent("rotation_queue_exported");
              }}
            >
              Export queue
            </button>
          </div>
          {audit.findings.length ? (
            <div className="finding-register">
              {audit.findings.map((entry, index) => (
                <article key={`${entry.record.id}-${entry.code}-${index}`}>
                  <div className={`priority ${entry.severity}`}>
                    {entry.severity}
                    <small>{entry.code.replaceAll("_", " ")}</small>
                  </div>
                  <div className="secret-id">
                    <strong>
                      {showNames
                        ? entry.record.name
                        : maskSecretName(entry.record.name)}
                    </strong>
                    <small>
                      {entry.record.source} / {entry.record.environment}
                    </small>
                  </div>
                  <div className="finding-evidence">
                    <p>{entry.reason}</p>
                    <small>
                      Evidence: {entry.record.evidenceType.replaceAll("_", " ")}
                      {entry.dueDate ? ` / due ${entry.dueDate}` : ""}
                    </small>
                  </div>
                  <div className="finding-action">{entry.action}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="clean-state">
              <strong>No findings under the supplied policy.</strong>
              <p>
                Confirm that the source export is complete before treating this
                as review evidence.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
