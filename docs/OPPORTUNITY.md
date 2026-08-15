# SecretClock opportunity brief

## Decision

Build a metadata-only secret rotation audit for platform and security teams that operate credentials across several stores.

## Recurring job

An operator reviews secret names, owners, environments, rotation timestamps, explicit next dates, expiry, and policy intervals. They need to find missing evidence and approaching deadlines without collecting credential values or migrating every source into a new vault.

AWS exposes `LastRotatedDate`, `NextRotationDate`, and `RotationEnabled` through [`ListSecrets`](https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_ListSecrets.html) without calling the value-retrieval APIs. GitHub’s [Actions secrets list endpoint](https://docs.github.com/en/rest/actions/secrets) returns secret names plus creation and update timestamps without encrypted values. These primary sources support a narrow cross-source metadata workflow.

AWS supports scheduled rotation windows through [Secrets Manager rotation schedules](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_schedule.html). HashiCorp documents built-in 30, 60, and 90-day policies for [HCP Vault Secrets auto-rotation](https://developer.hashicorp.com/hcp/docs/vault-secrets/auto-rotation). Those products can execute rotation inside their platforms; SecretClock only prepares review evidence across sources.

## Candidate comparison

| Candidate                     | Recurring job                                                                                   | Existing coverage                                                                                                                                                                                                                                      | Bounded differentiator                                         | Decision                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Secret rotation evidence      | Weekly review of owners, update evidence, explicit dates, and organization policy across stores | AWS, Azure, HashiCorp, Doppler, GitHub                                                                                                                                                                                                                 | Metadata-only import across sources with value-field rejection | Build                                                                                  |
| Vendor contract notice window | Monthly review of renewal, cancellation-notice, and owner dates                                 | [Tropic](https://help.tropicapp.io/hc/en-us/articles/22939801387035-Managing-Renewal-Reminders), [Cledara](https://help.cledara.com/hc/en-gb/articles/30575217794834-Set-the-next-renewal-date-of-an-application), and Vendr include renewal reminders | Local notice-window queue                                      | Hold; overlaps the existing SeatProof renewal buyer and product motion                 |
| OAuth grant access review     | Quarterly review of app publishers, scopes, users, and access settings                          | [Google Workspace API controls](https://support.google.com/a/answer/7281227) and Microsoft Entra consent policies                                                                                                                                      | Cross-tenant local review register                             | Hold; strong workflow, but adjacent to SeatProof’s SaaS access inventory               |
| Backup restore drill record   | Periodic proof that restores meet workload RTO and RPO                                          | [AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/back-up-data.html) prescribes periodic recovery tests                                                                                                     | Provider-neutral drill evidence pack                           | Hold; lower workflow frequency and a larger evidence schema for a useful first release |

## Target user

Platform engineers, security engineers, DevOps leads, and fractional infrastructure operators responsible for long-lived application credentials in AWS, GitHub, vendor APIs, CI, and internal systems.

## Existing alternatives

- Native vault rotation inside AWS, Azure, or HashiCorp
- Centralized secrets-management platforms such as Doppler
- Spreadsheets, security tickets, and calendar reminders
- Provider-specific scripts that output names and timestamps

[Doppler’s published pricing](https://www.doppler.com/pricing) includes recurring reminders in its Developer plan and automatic rotation in its Team plan. The current Team price shown by Doppler is $21 per user per month. SecretClock does not match that feature set; the comparison only confirms that teams pay for secret governance and rotation workflows.

## Paid value

Team at `[TARGET] $29/workspace/month` would add:

- read-only AWS, GitHub, Azure, and vendor connectors;
- saved evidence history without credential values;
- owner reminders and ticket assignment;
- reviewed policy exceptions and approval records;
- comparison between audit periods;
- export formats for security reviews.

The target price is a hypothesis. Willingness to pay is `[UNVERIFIED]`.

## Distribution

GitHub, search intent around secret rotation audits, DevOps and platform-engineering communities, security consultants, and teams already using native cloud secret stores.

## Assumptions

- `[UNVERIFIED]` Teams operate enough credentials across separate sources to need a provider-neutral review queue.
- `[UNVERIFIED]` A local metadata import is an acceptable first step before authorizing read-only connectors.
- `[UNVERIFIED]` Teams will pay for connectors, history, reminders, exceptions, and ticket handoff.
- `[TARGET]` Recruit five platform or security design partners after an approved deployment and outreach plan.

## Risks

- GitHub `updated_at` proves an update timestamp, not a completed rotation across every consumer.
- AWS list operations are eventually consistent according to the API documentation.
- Organization policy varies by credential, source, consumer, and incident context.
- Secret names can expose system topology even without values, so the UI masks names by default.
- A metadata queue cannot prove that consumers accepted a new credential or an old version was revoked.
