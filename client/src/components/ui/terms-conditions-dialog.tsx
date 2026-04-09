import { LegalDocumentDialog } from "@/components/ui/legal-document-dialog";

type Props = {
  agreed: boolean;
  onAgreed: () => void;
};

/** Sign-up modal: FocusNest Terms summary + scroll gate (full /terms unchanged). */
export function TermsConditionsDialog({ agreed, onAgreed }: Props) {
  return (
    <LegalDocumentDialog
      title="Terms & Conditions"
      fullPageHref="/terms"
      triggerLabel="Terms & Conditions"
      agreed={agreed}
      onAgreed={onAgreed}
      accent="violet"
    >
      <div className="space-y-4">
        <section className="space-y-1">
          <p>
            <strong>Acceptance</strong>
          </p>
          <p>
            By creating a FocusNest account you agree to these terms and our Privacy Policy. If you do not
            agree, do not use the service.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>About FocusNest</strong>
          </p>
          <p>
            FocusNest is a productivity app for adults 18+. It is{" "}
            <strong>not</strong> a medical device or substitute for professional care.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Your account</strong>
          </p>
          <p>
            Keep your login secure. You may delete all data anytime (Data Nuke). Inactive accounts may be
            removed after 90 days.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Acceptable use</strong>
          </p>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/60">
            <li>No unlawful use, abuse, or attempts to break security.</li>
            <li>No scraping or misuse of the platform.</li>
            <li>Respect intellectual property and other users.</li>
          </ul>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Optional features</strong>
          </p>
          <p>
            AI and Spotify integrations are optional and governed by separate provider terms. You enable them
            only if you choose to.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Liability</strong>
          </p>
          <p>
            The service is provided as an academic project &ldquo;as is&rdquo;. We limit liability where the law
            allows. AI output may be wrong — you are responsible for how you use it.
          </p>
        </section>
        <section className="space-y-1">
          <p>
            <strong>Governing law</strong>
          </p>
          <p>These terms are governed by the laws of England and Wales.</p>
        </section>
      </div>
    </LegalDocumentDialog>
  );
}
