/**
 * @project  SecretClock — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

import { IntentLink } from "@/components/intent-link";
import { Workbench } from "@/components/workbench";

export default function Home() {
  const teamUrl =
    process.env.NEXT_PUBLIC_TEAM_URL ||
    "mailto:uvin95dev@gmail.com?subject=SecretClock%20Team%20pilot";
  const feedbackUrl =
    process.env.NEXT_PUBLIC_FEEDBACK_URL ||
    "mailto:uvin95dev@gmail.com?subject=SecretClock%20feedback";
  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top">
          SECRET<span>CLOCK</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Audit</a>
          <a href="#boundary">Boundary</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <span className="build-tag">METADATA / LOCAL / 0.1</span>
      </header>
      <section className="hero" id="top">
        <div className="hero-index">
          <span>ROTATION CONTROL</span>
          <strong>10</strong>
          <small>PORTFOLIO ITERATION</small>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">For platform and security operators</p>
          <h1>Every credential needs a clock and an owner.</h1>
          <p>
            Audit rotation metadata from AWS, GitHub, or a normalized register.
            SecretClock rejects value-bearing fields, keeps the file in your
            browser, and produces a queue for source-system review.
          </p>
          <a className="primary-action" href="#workbench">
            Audit metadata
          </a>
        </div>
        <div className="tick-strip" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </section>
      <Workbench />
      <section className="boundary" id="boundary">
        <div className="section-heading">
          <span>03 / operating boundary</span>
          <h2>Evidence, never custody</h2>
        </div>
        <div className="boundary-list">
          <article>
            <b>INPUT</b>
            <h3>Metadata shapes only</h3>
            <p>
              AWS list output, GitHub secret-list output, or a normalized CSV.
              Recognized value fields stop the import.
            </p>
          </article>
          <article>
            <b>POLICY</b>
            <h3>Your interval, not ours</h3>
            <p>
              Rotation periods and warning windows come from the operator.
              SecretClock does not prescribe a universal deadline.
            </p>
          </article>
          <article>
            <b>ACTION</b>
            <h3>Review before rotation</h3>
            <p>
              The queue does not change credentials. Owners confirm consumers
              and rollout order in the source system.
            </p>
          </article>
          <article>
            <b>EVIDENCE</b>
            <h3>Timestamp quality stays visible</h3>
            <p>
              AWS rotation dates and GitHub update dates carry different
              meanings. The finding register labels the source.
            </p>
          </article>
        </div>
      </section>
      <section className="pricing" id="pricing">
        <div>
          <p className="eyebrow">Commercial hypothesis</p>
          <h2>Keep the local audit free.</h2>
          <p>
            Team would add read-only source connectors, saved evidence history,
            owner reminders, exception approvals, and ticket handoff without
            storing credential values.
          </p>
        </div>
        <div className="price">
          <span>TEAM / [TARGET]</span>
          <strong>
            $29<small>/ workspace / month</small>
          </strong>
          <IntentLink
            event="pricing_intent"
            className="primary-action inverse"
            href={teamUrl}
          >
            Request pilot access
          </IntentLink>
        </div>
      </section>
      <section className="feedback">
        <p>
          <strong>Which metadata source is missing?</strong> Send one field
          list, with no credential values.
        </p>
        <IntentLink event="feedback_intent" href={feedbackUrl}>
          Send product feedback
        </IntentLink>
      </section>
      <footer>
        <p>
          SecretClock is a review surface. It does not rotate, revoke, reveal,
          or store credentials.
        </p>
        <p>
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>{" "}
          ·{" "}
          <a
            href="https://asiresearch.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            ASI Research Labs
          </a>
        </p>
      </footer>
    </main>
  );
}
