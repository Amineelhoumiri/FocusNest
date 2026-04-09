import { LegalLayout, type LegalTocItem } from "@/components/legal/LegalLayout";

const PRIVACY_TOC: LegalTocItem[] = [
  { id: "summary", label: "At a glance" },
  { id: "who-we-are", label: "1 · Who we are" },
  { id: "what-we-collect", label: "2 · What we collect" },
  { id: "storage", label: "3 · Storage & security" },
  { id: "third-parties", label: "4 · Third parties" },
  { id: "rights", label: "5 · Your rights" },
  { id: "retention", label: "6 · Retention" },
  { id: "cookies", label: "7 · Cookies" },
  { id: "vulnerable", label: "8 · Vulnerable users" },
  { id: "changes", label: "9 · Changes" },
  { id: "contact", label: "10 · Contact" },
];

const Privacy = () => (
  <LegalLayout
    title="Privacy Policy"
    subtitle="What we process, how we protect it, third parties involved, and your rights under UK & EU GDPR."
    meta={[
      { label: "Effective Date", value: "February 2026" },
      { label: "Version", value: "1.0" },
      { label: "Data Controller", value: "Amine El Houmiri (Academic Project)" },
      { label: "Legal Basis", value: "UK GDPR & EU GDPR" },
    ]}
    toc={PRIVACY_TOC}
  >
    <h2 id="summary">At a glance</h2>
    <blockquote>
      <p>
        <strong>Plain-language summary:</strong> FocusNest is built for ADHD users. We collect
        only what we need, we never sell your data, you can delete everything instantly, and we
        are fully transparent about every third-party service we use.
      </p>
    </blockquote>

    <h2 id="who-we-are">1. Who We Are</h2>
    <p>
      FocusNest is operated by Amine El Houmiri (&quot;we&quot;, &quot;us&quot;,
      &quot;our&quot;) as data controller under UK GDPR and EU GDPR. Contact:{" "}
      <a href="mailto:6elhom71@solent.ac.uk" className="text-primary">
        6elhom71@solent.ac.uk
      </a>
    </p>

    <h2 id="what-we-collect">2. What Data We Collect and Why</h2>
    <h3>Summary table</h3>
    <div className="not-prose my-6 overflow-x-auto rounded-2xl border border-border/50 bg-card/45 shadow-sm ring-1 ring-border/30 dark:bg-card/30">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/55 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/90">Data category</th>
            <th className="border-b border-border/55 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/90">Purpose</th>
            <th className="border-b border-border/55 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/90">Legal basis</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Email address</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Account authentication</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(b) — Contract</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Hashed password</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Secure login via bcrypt</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(b) — Contract</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Task &amp; subtask content</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Kanban board, AI breakdown</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(b) — Contract</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Focus session logs</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Timing engine, reflections</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(b) — Contract</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">AI chat messages</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Task decomposition (optional)</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(a) — Consent</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Spotify OAuth token</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">40Hz audio playback (optional)</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(a) — Consent</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top">OpenAI token usage metadata</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Admin cost monitoring (content masked)</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">Art. 6(1)(f) — Legitimate interest</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="px-4 py-2.5 align-top">Last login timestamp</td>
            <td className="px-4 py-2.5 align-top">90-day idle purge (GDPR Art. 5(1)(e))</td>
            <td className="px-4 py-2.5 align-top">Art. 6(1)(c) — Legal obligation</td>
          </tr>
        </tbody>
      </table>
    </div>
    <h3>What we do <em>not</em> collect</h3>
    <p>
      We do <strong>not</strong> collect your name, date of birth, phone number, payment
      information, or any health or diagnostic data.
    </p>

    <h2 id="storage">3. How We Store and Protect Your Data</h2>
    <h3>Security layers</h3>
    <div className="not-prose my-6 overflow-x-auto rounded-2xl border border-border/50 bg-card/45 shadow-sm ring-1 ring-border/30 dark:bg-card/30">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/55 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/90">Layer</th>
            <th className="border-b border-border/55 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/90">Implementation</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top font-medium text-foreground/85">Encryption at rest</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">AES-256 via Amazon RDS — covers the database, automated backups, read replicas, and snapshots</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top font-medium text-foreground/85">Encryption in transit</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">TLS 1.2+ on all connections, managed via AWS Certificate Manager</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top font-medium text-foreground/85">Key management</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">AWS KMS with FIPS 140-3 Security Level 3 validated HSMs. Plaintext keys never leave the AWS boundary</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top font-medium text-foreground/85">Pseudonymisation</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">All primary keys use UUIDv4, structurally decoupling data identity from personal identity (GDPR Art. 32)</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="border-b border-border/35 px-4 py-2.5 align-top font-medium text-foreground/85">Authentication</td>
            <td className="border-b border-border/35 px-4 py-2.5 align-top">bcrypt password hashing. JWTs stored in HttpOnly cookies to prevent XSS attacks</td>
          </tr>
          <tr className="transition-colors hover:bg-muted/25">
            <td className="px-4 py-2.5 align-top font-medium text-foreground/85">Shared responsibility</td>
            <td className="px-4 py-2.5 align-top">Infrastructure security managed by AWS. Application-level security — encryption, access control — is the responsibility of FocusNest</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 id="third-parties">4. Third-Party Services</h2>
    <h3>OpenAI (optional)</h3>
    <p>
      Task text is sent to OpenAI only when you enable AI Task Breakdown. Under OpenAI&apos;s
      Enterprise Privacy Framework, API data is not used to train models by default. Requires
      explicit consent, withdrawable at any time.
    </p>
    <h3>Spotify (optional)</h3>
    <p>
      OAuth 2.0 token stored encrypted. We do not access your listening history, playlists, or
      profile. Governed by Spotify&apos;s own Privacy Policy.
    </p>
    <h3>Sentry</h3>
    <p>
      Real-time error monitoring for system stability. No personally identifiable task content
      is transmitted.
    </p>
    <h3>Amazon Web Services</h3>
    <p>
      Cloud hosting, database storage, and encryption key management for all FocusNest
      infrastructure.
    </p>
    <h3>ContentSquare</h3>
    <p>
      Anonymised behavioural analytics to detect UI friction (for example rage clicks and
      navigation loops). No PII or task content is transmitted.
    </p>

    <h2 id="rights">5. Your Rights Under GDPR</h2>

    <h3>Right to Erasure — Data Nuke (Art. 17)</h3>
    <p>
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Danger Zone → Delete account &amp; wipe all data
      </code>{" "}
      triggers an immediate CASCADE DELETE across all records. Irreversible. No residual data
      is retained.
    </p>

    <h3>Right to Data Portability (Art. 20)</h3>
    <p>
      Export all your data as a structured JSON file from{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Export My Data
      </code>{" "}
      at any time.
    </p>

    <h3>Right to Rectification (Art. 16)</h3>
    <p>Edit your profile and account details directly within the app at any time.</p>

    <h3>Right of Access (Art. 15)</h3>
    <p>Request a full copy of your data by contacting us or using the export feature.</p>

    <h3>Right to Withdraw Consent (Art. 7)</h3>
    <p>
      Disable AI processing or Spotify at any time from{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Privacy
      </code>
      . Does not affect prior lawful processing.
    </p>

    <h3>Right to Complain</h3>
    <p>
      Lodge a complaint with the UK ICO at{" "}
      <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
        ico.org.uk
      </a>{" "}
      or your local EU supervisory authority. Phone: 0303 123 1113.
    </p>

    <h2 id="retention">6. Data Retention</h2>
    <p>
      Data is retained while your account is active. Accounts inactive for 90+ days are
      automatically deleted via AWS Lambda. You may delete your account instantly at any time
      using the Data Nuke.
    </p>
    <blockquote>
      <p>
        <strong>Warning:</strong> Account deletion is permanent and irreversible. No grace
        period or backup restoration applies.
      </p>
    </blockquote>

    <h2 id="cookies">7. Cookies</h2>
    <p>
      FocusNest uses one strictly necessary functional cookie — a JWT stored in an HttpOnly
      cookie for authentication. No advertising cookies, tracking pixels, or cross-site
      tracking are used.
    </p>

    <h2 id="vulnerable">8. Vulnerable Users</h2>
    <p>
      FocusNest is designed for adults aged 18+. This project received formal ethical clearance
      via the Solent University Ethics Portal (Appendix C of the project report), with specific
      protocols for the neurodivergent demographic. Initial validation uses synthetic user
      simulation to avoid risk to human participants.
    </p>

    <h2 id="changes">9. Changes to This Policy</h2>
    <p>
      Material changes will be communicated by email and displayed on login. Continued use after
      notification constitutes acceptance. Current version always available at{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">/privacy</code>.
    </p>

    <h2 id="contact">10. Contact</h2>
    <p>
      <strong>Amine El Houmiri</strong>
      <br />
      Southampton Solent University, East Park Terrace, Southampton SO14 0RD
      <br />
      Email:{" "}
      <a href="mailto:6elhom71@solent.ac.uk" className="text-primary">
        6elhom71@solent.ac.uk
      </a>
    </p>

    <div className="not-prose mt-14 rounded-2xl border border-border/50 bg-muted/30 px-5 py-4 text-center text-[13px] text-muted-foreground dark:bg-muted/15">
      <p className="font-medium text-foreground/90">Document version</p>
      <p className="mt-1 text-muted-foreground">
        Version 1.0 · Effective February 2026 · UK GDPR &amp; EU GDPR
      </p>
    </div>
  </LegalLayout>
);

export default Privacy;
