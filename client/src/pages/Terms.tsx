import { LegalLayout } from "@/components/legal/LegalLayout";

const Terms = () => (
  <LegalLayout
    title="Terms of Service"
    meta={[
      { label: "Effective Date", value: "1 April 2026" },
      { label: "Last Updated", value: "1 April 2026" },
      { label: "Product", value: "FocusNest" },
      {
        label: "Operated by",
        value:
          "Amine El Houmiri, Southampton Solent University (Academic Project)",
      },
    ]}
  >
    <h2>1. Acceptance of Terms</h2>
    <p>
      By creating an account or using FocusNest (&quot;the Service&quot;), you
      agree to be bound by these Terms of Service (&quot;Terms&quot;). If you
      do not agree to these Terms, do not use the Service.
    </p>
    <p>
      FocusNest is currently an academic research prototype developed as part of
      a BSc Software Engineering dissertation at Southampton Solent University.
      It is not a commercial medical product.
    </p>

    <h2>2. Description of Service</h2>
    <p>
      FocusNest is a web-based productivity application designed as a cognitive
      support tool for individuals who experience executive dysfunction,
      including but not limited to those with Attention-Deficit/Hyperactivity
      Disorder (ADHD). The Service provides:
    </p>
    <ul>
      <li>AI-assisted task decomposition via the OpenAI API</li>
      <li>Single-tasking enforcement via a Kanban-style task board</li>
      <li>Focus session timers with temporal anchoring tools</li>
      <li>Auditory focus support via Spotify integration</li>
      <li>Personal session analytics and reflection logging</li>
    </ul>
    <p>
      <strong>
        FocusNest is not a medical device, clinical tool, or substitute for
        professional diagnosis or treatment.
      </strong>{" "}
      It is a productivity and accessibility aid. If you have concerns about
      ADHD or executive dysfunction, consult a qualified healthcare professional.
    </p>

    <h2>3. Eligibility</h2>
    <p>
      You must be at least 18 years old to use FocusNest. By registering, you
      confirm you meet this requirement. The Service is not directed at children
      under 18.
    </p>

    <h2>4. User Accounts</h2>
    <ul>
      <li>
        You are responsible for maintaining the confidentiality of your login
        credentials.
      </li>
      <li>You must provide accurate information during registration.</li>
      <li>You must not share your account with others.</li>
      <li>
        You must notify us immediately of any unauthorised access to your
        account.
      </li>
      <li>
        We reserve the right to suspend or terminate accounts that violate these
        Terms.
      </li>
    </ul>

    <h2>5. Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the Service for any unlawful purpose</li>
      <li>
        Attempt to reverse-engineer, decompile, or extract the source code of
        the Service
      </li>
      <li>Use automated tools to scrape, stress-test, or abuse the API</li>
      <li>
        Submit content that is harmful, offensive, or violates third-party
        rights
      </li>
      <li>
        Attempt to bypass authentication, access other users&apos; data, or
        exploit security vulnerabilities
      </li>
      <li>
        Use the AI features to generate harmful, misleading, or abusive content
      </li>
    </ul>

    <h2>6. AI-Generated Content</h2>
    <p>
      FocusNest uses the OpenAI API to generate task breakdowns and productivity
      suggestions. You acknowledge that:
    </p>
    <ul>
      <li>
        AI-generated suggestions are not guaranteed to be accurate, complete,
        or appropriate
      </li>
      <li>
        You retain full responsibility for decisions made based on AI output
      </li>
      <li>
        AI features are only active if you have explicitly consented to AI
        Processing during registration
      </li>
      <li>
        OpenAI processes your task text in accordance with OpenAI&apos;s
        Enterprise Privacy Policy — your data is not used to train OpenAI models
        by default
      </li>
    </ul>

    <h2>7. Spotify Integration</h2>
    <p>
      The 40Hz audio feature uses the Spotify Web Playback SDK. Use of this
      feature:
    </p>
    <ul>
      <li>Requires a valid Spotify Premium account</li>
      <li>Is subject to Spotify&apos;s Terms of Service and Privacy Policy</li>
      <li>
        Is only activated if you have explicitly consented to Spotify
        Integration during registration
      </li>
      <li>Can be revoked at any time in Settings</li>
    </ul>

    <h2>8. Intellectual Property</h2>
    <p>
      All software, design, and documentation within FocusNest is the
      intellectual property of Amine El Houmiri unless otherwise stated.
      Third-party libraries, APIs, and SDKs remain the property of their
      respective owners.
    </p>
    <p>
      You retain ownership of all personal data and task content you create
      within the Service.
    </p>

    <h2>9. Disclaimer of Warranties</h2>
    <p>
      FocusNest is provided <strong>&quot;as is&quot;</strong> without warranties
      of any kind, express or implied. As an academic prototype, the Service
      may contain bugs, experience downtime, or undergo significant changes
      without notice.
    </p>
    <p>
      We do not warrant that the Service will be uninterrupted, error-free, or
      free of harmful components.
    </p>

    <h2>10. Limitation of Liability</h2>
    <p>
      To the fullest extent permitted by law, FocusNest and its developer shall
      not be liable for any indirect, incidental, special, consequential, or
      punitive damages arising from your use of the Service, including loss of
      data, loss of productivity, or any harm resulting from reliance on
      AI-generated content.
    </p>

    <h2>11. Changes to Terms</h2>
    <p>
      We may update these Terms at any time. Continued use of the Service after
      changes constitutes acceptance of the updated Terms. The &quot;Last
      Updated&quot; date at the top of this document will reflect any changes.
    </p>

    <h2>12. Governing Law</h2>
    <p>
      These Terms are governed by the laws of England and Wales. Any disputes
      arising from these Terms shall be subject to the exclusive jurisdiction of
      the courts of England and Wales.
    </p>

    <h2>13. Contact</h2>
    <p>For any questions regarding these Terms, contact:</p>
    <p>
      <strong>Amine El Houmiri</strong>
      <br />
      Southampton Solent University
      <br />
      Email: available via university correspondence
    </p>
  </LegalLayout>
);

export default Terms;
