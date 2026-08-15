# SecretClock v0.1 specification

## User journey

1. Select AWS JSON, GitHub JSON, or normalized CSV.
2. Supply environment, optional owner, organization policy interval, warning window, and reference date.
3. Paste metadata or load a file no larger than 1 MB.
4. Run the audit.
5. Stop before analysis if a recognized value-bearing field exists.
6. Review masked findings and their evidence type.
7. Reveal names deliberately or export the local queue for source-system work.

## Data contracts

Zod schemas define AWS, GitHub, source-kind, and import-context inputs in `lib/schemas/secret-metadata.ts`.

The normalized CSV requires:

```text
source,secret_name,environment,owner,last_rotated_date,next_rotation_date,expires_at,rotation_enabled,policy_days
```

Dates use `YYYY-MM-DD`. `rotation_enabled` accepts true, false, enabled, disabled, yes, no, 1, 0, or blank. `policy_days` accepts 1 through 999 or blank. The import caps at 5,000 records.

## Blocking fields

The JSON and CSV importers stop when they find normalized field names matching:

- `value`
- `secret_value`
- `secret_string`
- `secret_binary`
- `plaintext`
- `password`
- `private_key`
- `client_secret`
- `access_token`
- `refresh_token`

This is a safety boundary, not a complete secret detector. Operators must export metadata-only provider shapes.

## Rules

| Code                        | Condition                                                    | Priority |
| --------------------------- | ------------------------------------------------------------ | -------- |
| `expired`                   | Supplied expiry date is before the reference date            | High     |
| `rotation_overdue`          | Explicit or calculated due date is before the reference date | High     |
| `rotation_due_soon`         | Due date is within the supplied warning window               | Medium   |
| `rotation_disabled`         | Supplied metadata explicitly disables automatic rotation     | Medium   |
| `rotation_evidence_missing` | No last-rotation or update timestamp exists                  | Medium   |
| `policy_missing`            | No explicit next date or interval exists                     | Low      |
| `owner_missing`             | Owner is empty                                               | Low      |
| `duplicate_record`          | Source, environment, and name repeat case-insensitively      | High     |

An explicit next date takes precedence over a calculated date. A calculated date adds the supplied policy interval to the last rotation or update timestamp. A date equal to the reference date is due soon, not overdue.

## Evidence types

- AWS `LastRotatedDate`: `rotation_timestamp`
- GitHub `updated_at`: `update_timestamp`
- Normalized CSV last-rotation date: `user_supplied`
- Missing timestamp: `none`

## Privacy and security

- Source content stays in client component memory.
- No record is written to local storage, cookies, analytics, or an API route.
- Secret names are masked until the operator checks the reveal control.
- Exported CSV cells beginning with `=`, `+`, `-`, or `@` receive a leading apostrophe.
- Analytics include event names only and are disabled without a configured Plausible domain.
- Security headers deny framing, object sources, camera, microphone, and geolocation.

## Analytics

| Stage           | Event                     |
| --------------- | ------------------------- |
| Acquisition     | `workbench_viewed`        |
| Activation      | `metadata_audited`        |
| Retention proxy | `rotation_queue_exported` |
| Paid conversion | `pricing_intent`          |
| Feedback        | `feedback_intent`         |

## Acceptance checks

- Valid AWS, GitHub, and CSV samples parse into the documented evidence types.
- Recognized credential-value fields block the import and list their paths.
- Invalid JSON, missing CSV columns, invalid dates, invalid booleans, and invalid policy intervals return specific errors.
- Exact due-date and warning-window boundaries are deterministic in UTC.
- Duplicate findings include every repeated source record.
- Raw names remain masked until explicitly revealed.
- Queue exports are deterministic and formula-neutralized.
- `pnpm verify` and the IAMUVIN signature gate pass.

## Non-goals

- Credential storage, generation, retrieval, rotation, or revocation
- Cloud authentication or direct API calls
- Universal rotation-period recommendations
- Consumer rollout verification
- Persistent accounts, projects, evidence history, or tickets
- Security certification or breach-prevention claims
