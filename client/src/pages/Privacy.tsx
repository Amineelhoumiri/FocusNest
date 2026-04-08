import { LegalLayout } from "@/components/legal/LegalLayout";

const Privacy = () => (
  <LegalLayout
    title="Privacy Policy"
    meta={[
      { label: "Effective Date", value: "1 April 2026" },
      { label: "Last Updated", value: "1 April 2026" },
      {
        label: "Data Controller",
        value: "Amine El Houmiri (Academic Project)",
      },
      {
        label: "Legal Basis",
        value: "General Data Protection Regulation (GDPR) 2018",
      },
    ]}
  >
    <h2>1. Introduction</h2>
    <p>
      Your privacy is a core design principle of FocusNest, not an afterthought.
      This Privacy Policy explains what data we collect, why we collect it, how
      we protect it, and what rights you have over it.
    </p>
    <p>
      FocusNest is designed with <strong>Privacy by Design</strong> principles
      embedded at the architectural level, including pseudonymisation via UUIDv4
      keys, AES-256 encryption at rest, and TLS 1.2+ for all data in transit.
    </p>

    <h2>2. What Data We Collect</h2>
    <p>We collect only the minimum data necessary to operate the Service.</p>

    <h3>2.1 Account Data (Required)</h3>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Email address
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Account identification and login
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Hashed password
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Authentication (bcrypt, never stored in plaintext)
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Full name
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Personalisation
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Account creation date
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Audit and security
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Last login timestamp
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              90-day idle purge compliance
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>2.2 Task &amp; Session Data (Required)</h3>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Task names and descriptions
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Core app functionality
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Task status and energy level
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Kanban board and activity switching
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Subtask content
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AI breakdown output
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Session start/end times
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Productivity analytics
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Distraction count
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Reflection and observability
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Reflection logs
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Post-session capture
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>
        All task names, subtask content, and reflection logs are stored as{" "}
        <strong>encrypted blobs</strong> using AES-256. The raw content is never
        stored in plaintext.
      </p>
    </blockquote>

    <h3>2.3 AI Interaction Data (Optional — Requires Consent)</h3>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Task text submitted to OpenAI
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AI task decomposition
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Token usage counts
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Cost tracking and admin visibility
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Model type used
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Technical auditing
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>
        This data is only collected if you explicitly consent to{" "}
        <strong>AI Processing</strong> during registration. You can withdraw
        consent at any time in Settings.
      </p>
    </blockquote>

    <h3>2.4 Spotify Data (Optional — Requires Consent)</h3>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Spotify user ID
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              SDK authentication
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Access and refresh tokens
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Playback control
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Token expiry and scopes
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Session management
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>
        All Spotify tokens are stored as <strong>encrypted blobs</strong>. This
        data is only collected if you explicitly consent to{" "}
        <strong>Spotify Integration</strong> during registration.
      </p>
    </blockquote>

    <h3>2.5 Technical Data (Automatic)</h3>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Hashed IP address (not raw IP)
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Security auditing and abuse prevention
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Error logs via Sentry
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Bug detection and system reliability
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Interaction analytics via ContentSquare
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              UX friction identification (rage clicks, navigation loops)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>
        Raw IP addresses are <strong>never stored</strong>. Only a one-way hash
        of the IP is retained for security purposes.
      </p>
    </blockquote>

    <h2>3. What We Do NOT Collect</h2>
    <ul>
      <li>We do not collect raw IP addresses</li>
      <li>We do not use advertising cookies or tracking pixels</li>
      <li>We do not sell your data to any third party</li>
      <li>We do not use your data to train AI models</li>
      <li>
        We do not collect sensitive special category data (health records,
        medical history)
      </li>
      <li>We do not collect payment information</li>
    </ul>

    <h2>4. Legal Basis for Processing</h2>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data Category
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Legal Basis
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Account data
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Contract (GDPR Art. 6(1)(b)) — necessary to provide the Service
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Task and session data
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Contract (GDPR Art. 6(1)(b)) — core functionality
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AI processing data
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Consent (GDPR Art. 6(1)(a)) — explicit opt-in required
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Spotify data
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Consent (GDPR Art. 6(1)(a)) — explicit opt-in required
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Security and error logs
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Legitimate interests (GDPR Art. 6(1)(f)) — system stability
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>5. How We Protect Your Data</h2>
    <p>FocusNest implements a layered security architecture:</p>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Layer
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Implementation
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Encryption at rest
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AES-256 via Amazon RDS (covers storage, backups, snapshots,
              replicas)
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Key management
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AWS Key Management Service (KMS) — FIPS 140-3 Level 3 HSMs. Keys
              never leave the secure boundary unencrypted.
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Encryption in transit
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              TLS 1.2+ for all connections. Certificates managed via AWS
              Certificate Manager (ACM).
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Pseudonymisation
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              All database primary keys use UUIDv4 — no sequential integers. Data
              identity is structurally decoupled from user identity.
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Password security
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              bcrypt hashing with minimum 12 rounds. Passwords never stored in
              plaintext.
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Session security
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              JWT stored in HttpOnly, Secure, SameSite=Strict cookies. Never
              accessible via JavaScript.
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Admin data masking
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Task content displayed as{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                *******
              </code>{" "}
              in admin views. Content never exposed to administrators.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>6. Third-Party Processors</h2>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Processor
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Privacy Policy
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Amazon Web Services (AWS)
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Cloud hosting, database, encryption
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <a
                href="https://aws.amazon.com/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                aws.amazon.com/privacy
              </a>
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              OpenAI
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AI task decomposition (consent required)
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <a
                href="https://openai.com/enterprise-privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                openai.com/enterprise-privacy
              </a>
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Spotify
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Audio playback SDK (consent required)
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <a
                href="https://www.spotify.com/legal/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                spotify.com/privacy
              </a>
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Sentry
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Error monitoring and performance
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                sentry.io/privacy
              </a>
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              ContentSquare
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              UX analytics
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <a
                href="https://contentsquare.com/privacy-center/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                contentsquare.com/privacy-center
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>
        <strong>OpenAI:</strong> Under the OpenAI Enterprise API agreement, your
        data is not used to train OpenAI models by default. API data is processed
        under strict confidentiality obligations.
      </p>
    </blockquote>

    <h2>7. Data Retention</h2>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Data Type
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Retention Period
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Account and task data
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Until you delete your account
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Session and reflection logs
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Until you delete your account
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Consent audit log
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              6 years (legal compliance)
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Error logs (Sentry)
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              90 days
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              AI usage logs
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Until account deletion
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Inactive accounts
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <strong>Automatically purged after 90 days of inactivity</strong>{" "}
              via AWS Lambda
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>8. Your Rights Under GDPR</h2>
    <p>
      As a data subject under GDPR, you have the following rights. All rights can
      be exercised directly within the app:
    </p>

    <h3>8.1 Right of Access (Art. 15)</h3>
    <p>
      You can view all data associated with your account at any time in{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → My Data
      </code>
      .
    </p>

    <h3>8.2 Right to Portability (Art. 20) — FR-L-02</h3>
    <p>
      You can download a complete export of your data as a structured JSON file
      at{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Export My Data
      </code>
      . This includes your profile, all tasks, sessions, and reflection logs.
    </p>

    <h3>8.3 Right to Erasure / &quot;Right to be Forgotten&quot; (Art. 17) — FR-L-01</h3>
    <p>
      You can permanently delete your account and all associated data via{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Danger Zone → Delete Account &amp; Wipe All Data
      </code>
      .
    </p>
    <p>This triggers an atomic <strong>CASCADE DELETE</strong> across all tables linked to your User ID, including:</p>
    <ul>
      <li>Tasks and subtasks</li>
      <li>Sessions and reflections</li>
      <li>Chat history</li>
      <li>AI usage logs</li>
      <li>Spotify account data</li>
      <li>Consent records (except the legally required audit log)</li>
    </ul>
    <p>
      The operation is <strong>immediate and irreversible.</strong> A
      confirmation step requiring you to type &quot;DELETE&quot; is required
      before execution.
    </p>

    <h3>8.4 Right to Withdraw Consent (Art. 7(3))</h3>
    <p>
      You can withdraw AI Processing or Spotify Integration consent at any time
      in{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Privacy
      </code>
      . Withdrawal is immediate and stops all future processing under that
      consent type.
    </p>

    <h3>8.5 Right to Rectification (Art. 16)</h3>
    <p>
      You can update your name and email in{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
        Settings → Account
      </code>
      .
    </p>

    <h3>8.6 Right to Restriction (Art. 18)</h3>
    <p>
      If you believe your data is being processed incorrectly, contact us to
      restrict processing while the matter is investigated.
    </p>

    <h3>8.7 Right to Object (Art. 21)</h3>
    <p>
      You have the right to object to processing based on legitimate interests.
      Contact us to exercise this right.
    </p>

    <h2>9. Cookies</h2>
    <p>FocusNest uses a minimal set of cookies:</p>
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Cookie
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Type
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Purpose
            </th>
            <th className="border-b border-border/60 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">
              Duration
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                focusnest_session
              </code>
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              HttpOnly, Secure
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              JWT authentication
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              7 days
            </td>
          </tr>
          <tr>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                sentry_session
              </code>
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Technical
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Error tracking session
            </td>
            <td className="border-b border-border/40 px-3 py-2 align-top">
              Session
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      We do not use advertising cookies, tracking pixels, or third-party
      marketing cookies. No cookie consent banner is required beyond the
      technical session cookie.
    </p>

    <h2>10. Children&apos;s Privacy</h2>
    <p>
      FocusNest is not directed at anyone under the age of 18. We do not
      knowingly collect personal data from minors. If we become aware that a
      minor has registered, the account will be deleted immediately.
    </p>

    <h2>11. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy to reflect changes in the Service or
      legal requirements. The &quot;Last Updated&quot; date at the top will
      always reflect the most recent revision. We will notify you of material
      changes via an in-app notification.
    </p>

    <h2>12. Contact &amp; Complaints</h2>
    <p>
      <strong>Data Controller:</strong>
      <br />
      Amine El Houmiri
      <br />
      Southampton Solent University, School of Technology and Maritime
      Industries
      <br />
      Email: available via university correspondence
    </p>
    <p>
      <strong>Supervisory Authority:</strong>
      <br />
      If you believe your data rights have been violated, you have the right to
      lodge a complaint with the UK Information Commissioner&apos;s Office
      (ICO):
    </p>
    <ul>
      <li>
        Website:{" "}
        <a
          href="https://ico.org.uk"
          target="_blank"
          rel="noopener noreferrer"
        >
          ico.org.uk
        </a>
      </li>
      <li>Phone: 0303 123 1113</li>
    </ul>

    <p className="not-prose mt-10 text-center text-sm italic text-muted-foreground">
      FocusNest — Built with Privacy by Design | GDPR Compliant | Academic
      Prototype
    </p>
  </LegalLayout>
);

export default Privacy;
