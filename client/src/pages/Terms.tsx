import { LegalLayout, type LegalTocItem } from "@/components/legal/LegalLayout";

const TERMS_TOC: LegalTocItem[] = [
  { id: "summary", label: "At a glance" },
  { id: "acceptance", label: "1 · Acceptance" },
  { id: "about", label: "2 · About FocusNest" },
  { id: "eligibility", label: "3 · Eligibility" },
  { id: "account", label: "4 · Your account" },
  { id: "acceptable-use", label: "5 · Acceptable use" },
  { id: "ai", label: "6 · AI features" },
  { id: "spotify", label: "7 · Spotify" },
  { id: "ip", label: "8 · Intellectual property" },
  { id: "disclaimers", label: "9 · Disclaimers" },
  { id: "third-parties", label: "10 · Third parties" },
  { id: "law", label: "11 · Governing law" },
  { id: "changes", label: "12 · Changes" },
  { id: "contact", label: "13 · Contact" },
];

const Terms = () => (
  <LegalLayout
    title="Terms & Conditions of Use"
    subtitle="How you may use FocusNest, our optional integrations (AI, Spotify), and important limitations."
    meta={[
      { label: "Effective Date", value: "February 2026" },
      { label: "Version", value: "1.0" },
      { label: "Product", value: "FocusNest" },
      { label: "Operated by", value: "Amine El Houmiri — Southampton Solent University (COM629)" },
    ]}
    toc={TERMS_TOC}
  >
    <h2 id="summary">At a glance</h2>
    <blockquote>
      <p>
        <strong>Plain-language summary:</strong> These terms explain what FocusNest is, how
        you may use it, what we are responsible for, and what we are not. Please read this
        before creating an account.
      </p>
    </blockquote>

    <h2 id="acceptance">1. Acceptance of Terms</h2>
    <p>
      By creating a FocusNest account or using any part of the application, you agree to be
      bound by these Terms &amp; Conditions. If you do not agree, you must not use FocusNest.
    </p>
    <p>
      These terms apply alongside the FocusNest Privacy Policy, which governs how your
      personal data is handled and forms part of this agreement.
    </p>

    <h2 id="about">2. About FocusNest</h2>
    <h3>What the product is</h3>
    <p>
      FocusNest is a web-based productivity application designed as a neuro-cognitive support
      tool for adults with Attention-Deficit/Hyperactivity Disorder (ADHD) and related
      executive dysfunction conditions. It provides features including AI-assisted task
      decomposition, focus session timers, a single-tasking Kanban board, and sensory
      regulation tools.
    </p>
    <h3>Project context &amp; medical disclaimer</h3>
    <p>
      FocusNest is developed and operated by Amine El Houmiri as part of an academic software
      engineering project at Southampton Solent University (COM629).{" "}
      <strong>
        It is not a medical device, clinical intervention, or substitute for professional
        medical or psychological treatment.
      </strong>
    </p>

    <h2 id="eligibility">3. Eligibility</h2>
    <p>
      You must be at least 18 years of age to create an account and use FocusNest. By
      registering, you confirm that you meet this requirement. We do not knowingly permit
      users under 18 to access the platform. If we become aware that a user is under 18, we
      will immediately delete their account and all associated data.
    </p>

    <h2 id="account">4. Your Account</h2>
    <h3>Registration</h3>
    <p>
      You are responsible for providing accurate information when creating your account and for
      keeping your login credentials secure. You must not share your account with any other
      person.
    </p>
    <h3>Security</h3>
    <p>
      FocusNest uses bcrypt password hashing and JWT tokens stored in HttpOnly cookies to
      protect your session. You are responsible for any activity that occurs under your account
      if you fail to keep your credentials secure.
    </p>
    <h3>Account deletion</h3>
    <p>
      You may delete your account at any time using the Data Nuke feature in your account
      settings. This action is permanent and irreversible. All data associated with your
      account will be deleted immediately with no possibility of recovery.
    </p>
    <h3>Inactive accounts</h3>
    <p>
      Accounts that have not been accessed for 90 consecutive days will be automatically and
      permanently deleted via AWS Lambda. No prior warning will be issued. Log in periodically
      if you wish to retain your account.
    </p>

    <h2 id="acceptable-use">5. Acceptable Use</h2>
    <p>
      You agree to use FocusNest only for its intended purpose as a personal productivity tool.
      You must not:
    </p>
    <ul>
      <li>Use FocusNest for any unlawful purpose or in violation of any applicable law or regulation</li>
      <li>Attempt to reverse engineer, decompile, or extract the source code of the application</li>
      <li>Attempt to gain unauthorised access to any part of the system, its servers, or any connected databases</li>
      <li>Upload or input content that is defamatory, harmful, abusive, or infringes the intellectual property rights of any third party</li>
      <li>Use automated scripts, bots, or other tools to access or interact with FocusNest in ways not intended by its design</li>
      <li>Attempt to circumvent or disable any security, encryption, or access control mechanism</li>
    </ul>
    <p>
      We reserve the right to suspend or terminate your account immediately if we become aware
      of any breach of these terms.
    </p>

    <h2 id="ai">6. AI-Powered Features</h2>
    <p>
      FocusNest includes an optional AI Task Breakdown feature powered by the OpenAI API. By
      enabling this feature, you consent to the text content of your tasks being transmitted to
      OpenAI for processing. The following conditions apply:
    </p>
    <ul>
      <li>You must explicitly enable this feature at registration or in your account settings. It is not active by default.</li>
      <li>
        Under OpenAI&apos;s Enterprise Privacy Framework, your data is not used to train OpenAI
        models (OpenAI, 2024).
      </li>
      <li>You may withdraw consent and disable this feature at any time from your account settings.</li>
      <li>
        FocusNest does not guarantee the accuracy, suitability, or completeness of any
        AI-generated task suggestions. You are solely responsible for reviewing and acting upon
        any AI output.
      </li>
      <li>
        Do not input sensitive personal, medical, financial, or confidential third-party
        information into the AI task breakdown feature.
      </li>
    </ul>

    <h2 id="spotify">7. Spotify Integration</h2>
    <p>
      FocusNest includes an optional 40Hz audio feature powered by the Spotify Web Playback
      SDK. By enabling this feature:
    </p>
    <ul>
      <li>
        You must have a valid, active Spotify account and agree to Spotify&apos;s own Terms of
        Service and Privacy Policy.
      </li>
      <li>
        FocusNest accesses only the permissions necessary to enable audio playback. We do not
        access your listening history, playlists, followers, or any other Spotify profile
        data.
      </li>
      <li>FocusNest is not affiliated with, endorsed by, or partnered with Spotify AB.</li>
      <li>
        Spotify may change or discontinue their SDK at any time. FocusNest cannot guarantee the
        continued availability of this feature.
      </li>
    </ul>

    <h2 id="ip">8. Intellectual Property</h2>
    <p>
      All content, design, code, architecture, and documentation comprising FocusNest is the
      intellectual property of Amine El Houmiri and Southampton Solent University where
      applicable.
    </p>
    <p>
      You are granted a limited, non-exclusive, non-transferable licence to use FocusNest solely
      for your personal productivity purposes. This licence does not permit you to copy,
      reproduce, distribute, or create derivative works from any part of FocusNest.
    </p>
    <p>
      Your task content, session data, and any other data you input into FocusNest remains your
      own intellectual property at all times.
    </p>

    <h2 id="disclaimers">9. Disclaimers and Limitation of Liability</h2>
    <h3>Not a medical tool</h3>
    <p>
      FocusNest is not a medical device, clinical therapy, or diagnostic tool. It is a
      productivity application informed by publicly available neuroscience research. It does
      not constitute medical advice. If you have concerns about ADHD or any other health
      condition, consult a qualified medical professional.
    </p>
    <h3>No guarantee of availability</h3>
    <p>
      FocusNest is provided as an academic project. We do not guarantee uninterrupted,
      error-free availability. Planned or unplanned maintenance, third-party API outages
      (OpenAI, Spotify), or infrastructure issues may affect availability. Graceful degradation
      is implemented via Lite Mode for core features.
    </p>
    <h3>No guarantee of AI output</h3>
    <p>
      AI-generated task suggestions are produced by a third-party model and may be inaccurate,
      incomplete, or unsuitable. You rely on these suggestions entirely at your own
      discretion.
    </p>
    <h3>Limitation of liability</h3>
    <p>
      To the fullest extent permitted by applicable law, Amine El Houmiri shall not be liable
      for any indirect, incidental, special, consequential, or punitive damages arising from
      your use of or inability to use FocusNest.
    </p>

    <h2 id="third-parties">10. Third-Party Services</h2>
    <p>
      FocusNest integrates with the following third-party services, each governed by their own
      terms and privacy policies:
    </p>
    <ul>
      <li><strong>OpenAI</strong> — openai.com/policies</li>
      <li><strong>Spotify</strong> — spotify.com/legal</li>
      <li><strong>Amazon Web Services</strong> — aws.amazon.com/legal</li>
      <li><strong>Sentry</strong> — sentry.io/legal</li>
      <li><strong>ContentSquare</strong> — contentsquare.com/legal</li>
    </ul>
    <p>
      FocusNest is not responsible for the practices, availability, or content of any
      third-party service.
    </p>

    <h2 id="law">11. Governing Law and Jurisdiction</h2>
    <p>
      These Terms &amp; Conditions are governed by and construed in accordance with the laws of
      England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the
      courts of England and Wales. These terms operate in compliance with UK GDPR and, where
      applicable, EU GDPR.
    </p>

    <h2 id="changes">12. Changes to These Terms</h2>
    <p>
      We reserve the right to update these Terms &amp; Conditions at any time. Material changes
      will be communicated by email and displayed on your next login. Continued use after
      notification constitutes acceptance. The current version is always available at{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">/terms</code>.
    </p>

    <h2 id="contact">13. Contact</h2>
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
        Version 1.0 · Effective February 2026 · Governed by the laws of England and Wales
      </p>
    </div>
  </LegalLayout>
);

export default Terms;
