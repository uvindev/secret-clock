# SecretClock

SecretClock turns secret metadata into a browser-local rotation evidence queue. It accepts AWS Secrets Manager `ListSecrets` JSON, GitHub Actions secret-list JSON, or a normalized CSV.

The workbench never needs credential values. Recognized value-bearing fields stop the import before records are parsed. SecretClock does not rotate, revoke, disable, reveal, transmit, or persist credentials.

![SecretClock on load: the rotation review queue built from secret metadata](docs/screenshot.png)

## Who pays

Platform and security teams can evaluate the local audit for free.

Demand, customer count, and willingness to pay are unverified. No checkout is configured.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Accepted inputs

- AWS Secrets Manager `ListSecrets` response JSON
- GitHub Actions “List repository secrets” response JSON
- Normalized UTF-8 CSV using the downloadable template

For AWS and GitHub imports, the operator supplies an environment, optional owner, and organization-approved rotation interval. A zero-day interval means policy is unknown.

GitHub `updated_at` is displayed as update evidence, not verified rotation evidence. Rotation periods and warning windows are operator policy, not universal recommendations.

## Verify

```bash
pnpm verify
pnpm audit --prod --audit-level=high
```

The opportunity evidence and product boundary are recorded in [docs/OPPORTUNITY.md](docs/OPPORTUNITY.md) and [docs/SPEC.md](docs/SPEC.md).

## Limits

- Version 0.1 does not call a cloud API or secret manager.
- Metadata completeness and timestamps are not independently verified.
- One record can produce several findings.
- An empty queue only means the supplied metadata passed the supplied policy.
- Exported queues contain raw secret names because the file is generated locally for operational review.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
