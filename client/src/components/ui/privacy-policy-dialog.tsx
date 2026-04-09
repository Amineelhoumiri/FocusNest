import { LegalDocumentDialog } from "@/components/ui/legal-document-dialog";

type Props = {
  agreed: boolean;
  onAgreed: () => void;
};

/** Sign-up modal: FocusNest Privacy summary + scroll gate (full /privacy unchanged). */
export function PrivacyPolicyDialog({ agreed, onAgreed }: Props) {
  return (
    <LegalDocumentDialog
      title="Privacy Policy"
      fullPageHref="/privacy"
      triggerLabel="Privacy Policy"
      agreed={agreed}
      onAgreed={onAgreed}
      accent="teal"
    >
      <div className="space-y-4">
        <section className="space-y-1">
          <p>
            <strong>Who we are</strong>
          </p>
          <p>
            FocusNest is operated as an academic project. The controller is Amine El Houmiri (contact on the
            full policy page).
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>What we process</strong>
          </p>
          <p>
            We collect what we need to run the app (e.g. account data, tasks, sessions). Optional AI and Spotify
            features rely on your consent. We do not sell your personal data.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Security</strong>
          </p>
          <p>
            We use encryption in transit and at rest, strong authentication practices, and access controls as
            described in the full policy.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Third parties</strong>
          </p>
          <p>
            Providers such as hosting, error monitoring, or optional OpenAI/Spotify each have their own
            policies; we only send what is needed for the feature you use.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Your rights (UK / EU GDPR)</strong>
          </p>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/60">
            <li>Access, rectification, erasure, and portability where applicable.</li>
            <li>Withdraw consent for optional processing in Settings.</li>
            <li>Lodge a complaint with a supervisory authority.</li>
          </ul>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Retention</strong>
          </p>
          <p>
            Data is kept while your account is active; you can permanently delete everything. Long-inactive
            accounts may be purged as described in the full policy.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Cookies</strong>
          </p>
          <p>We use essential cookies for authentication — not ad tracking.</p>
        </section>
      </div>
    </LegalDocumentDialog>
  );
}
