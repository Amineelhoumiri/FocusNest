# FocusNest — Terms, Privacy Policy & Consent Modal Specification

> **Document type:** Implementation Specification & Content Reference  
> **Project:** FocusNest (COM629 AE1) — Southampton Solent University  
> **Author:** Amine El Houmiri  
> **Supervisor:** Dr Anthony Skip Basiel  
> **Version:** 1.0 — February 2026  

---

## Prompt: How this should be built

This document specifies the complete terms, privacy, and consent architecture for FocusNest. The system must be implemented as **three interconnected layers**:

1. **A lightweight consent modal** — triggered at registration (FR-L-03 in the SRS). Contains only toggles and links. Zero legal text inside the modal itself. Cognitively minimal by design, per James (2025) and Rehan (2025).

2. **Two dedicated legal pages** — `/terms` for Terms & Conditions, `/privacy` for the Privacy Policy. Full legal text lives here only. Clean, distraction-free, accessible layout per W3C (2022) Cognitive Accessibility guidelines.

3. **A consent audit log** — every toggle interaction is written to the `CONSENT_AUDIT_LOG` table in PostgreSQL with a timestamp, consent type, and boolean value. This satisfies GDPR Art. 7(1) — the controller must be able to *demonstrate* that consent was given.

### Academic justification for this architecture

| Decision | Justification | Source |
|---|---|---|
| Modal is lightweight, no legal text | Minimises extraneous cognitive load at registration | James (2025); Rehan (2025) |
| Dedicated legal pages | Consent must be informed — full text must be accessible | GDPR Art. 7; ICO guidance |
| Non-pre-checked toggles | Consent must be freely given and unambiguous | GDPR Art. 4(11) |
| Core Data toggle is required | Lawful basis for contract performance | GDPR Art. 6(1)(b) |
| AI & Spotify toggles are optional | Processing based on consent, not contract | GDPR Art. 6(1)(a) |
| Consent audit log | Controller must demonstrate consent was given | GDPR Art. 7(1) |
| Settings page re-consent | Right to withdraw consent at any time | GDPR Art. 7(3) |

---

## Consent Modal — Specification (FR-L-03)

### Behaviour

- Appears **once** during registration, after email/password entry, before account creation
- Cannot be dismissed without interacting with it
- "Create account" button is **disabled** until the Core Data toggle is checked
- AI Processing and Spotify toggles are **optional** — user can proceed without them
- All three toggles are **unchecked by default** (GDPR Art. 4(11))
- Links to `/terms` and `/privacy` open in a **new tab** so the modal is not dismissed
- On submission, consent values are written to the `CONSENT_AUDIT_LOG` table via **`POST /api/consent/register`** (recommended for production). **`POST /api/auth/consent`** is also supported for parity with the Better Auth–adjacent API surface.

### Modal content

```
FocusNest needs your agreement before we get started.

[ ] Core data storage (required)
    We store your tasks, sessions, and account credentials
    to make the app work. This is necessary to use FocusNest.

[ ] AI task breakdown (optional)
    Allows FocusNest to send your task text to OpenAI to
    generate subtasks. OpenAI does not train on this data.

[ ] Spotify audio integration (optional)
    Allows FocusNest to connect to your Spotify account
    for 40Hz focus audio. We do not access your listening history.

Read our Terms & Conditions  |  Read our Privacy Policy

[ Create my account ]   (disabled until Core Data is checked)
```

### API call on submission

**Production / SPA:** use `POST /api/consent/register` (same JSON body; avoids infra that routes only part of `/api/auth/*`). `POST /api/auth/consent` accepts the same payload.

```http
POST /api/consent/register
Content-Type: application/json

{
  "user_id": "uuid",
  "is_consented_core": true,
  "is_consented_ai": false,
  "is_consented_spotify": false
}
```

This maps directly to the `is_consented_core`, `is_consented_ai`, and `is_consented_spotify` boolean fields on the `USER` entity in the ERD, and inserts a record into `CONSENT_AUDIT_LOG`.

---

## Terms & Conditions — Full Content

**FocusNest — Terms & Conditions of Use**  
Effective date: February 2026 · Version 1.0

> **Plain-language summary:** These terms explain what FocusNest is, how you may use it, what we are responsible for, and what we are not. Please read this before creating an account.

---

### 1. Acceptance of terms

By creating a FocusNest account or using any part of the application, you agree to be bound by these Terms & Conditions. If you do not agree, you must not use FocusNest.

These terms apply alongside the FocusNest Privacy Policy, which governs how your personal data is handled and forms part of this agreement.

---

### 2. About FocusNest

FocusNest is a web-based productivity application designed as a neuro-cognitive support tool for adults with Attention-Deficit/Hyperactivity Disorder (ADHD) and related executive dysfunction conditions. It provides features including AI-assisted task decomposition, focus session timers, a single-tasking Kanban board, and sensory regulation tools.

FocusNest is developed and operated by Amine El Houmiri as part of an academic software engineering project at Southampton Solent University (COM629). It is **not** a medical device, clinical intervention, or substitute for professional medical or psychological treatment.

---

### 3. Eligibility

You must be at least 18 years of age to create an account and use FocusNest. By registering, you confirm that you meet this requirement. We do not knowingly permit users under 18 to access the platform. If we become aware that a user is under 18, we will immediately delete their account and all associated data.

---

### 4. Your account

**Registration:** You are responsible for providing accurate information when creating your account and for keeping your login credentials secure. You must not share your account with any other person.

**Security:** FocusNest uses bcrypt password hashing and JWT tokens stored in HttpOnly cookies to protect your session. You are responsible for any activity that occurs under your account if you fail to keep your credentials secure.

**Account deletion:** You may delete your account at any time using the Data Nuke feature in your account settings. This action is permanent and irreversible. All data associated with your account will be deleted immediately with no possibility of recovery.

**Inactive accounts:** Accounts that have not been accessed for 90 consecutive days will be automatically and permanently deleted via AWS Lambda. No prior warning will be issued. Log in periodically if you wish to retain your account.

---

### 5. Acceptable use

You agree to use FocusNest only for its intended purpose as a personal productivity tool. You must not:

- Use FocusNest for any unlawful purpose or in violation of any applicable law or regulation
- Attempt to reverse engineer, decompile, or extract the source code of the application
- Attempt to gain unauthorised access to any part of the system, its servers, or any connected databases
- Upload or input content that is defamatory, harmful, abusive, or infringes the intellectual property rights of any third party
- Use automated scripts, bots, or other tools to access or interact with FocusNest in ways not intended by its design
- Attempt to circumvent or disable any security, encryption, or access control mechanism

We reserve the right to suspend or terminate your account immediately if we become aware of any breach of these terms.

---

### 6. AI-powered features

FocusNest includes an optional AI Task Breakdown feature powered by the OpenAI API. By enabling this feature, you consent to the text content of your tasks being transmitted to OpenAI for processing. The following conditions apply:

- You must explicitly enable this feature at registration or in your account settings. It is not active by default.
- Under OpenAI's Enterprise Privacy Framework, your data is not used to train OpenAI models (OpenAI, 2024).
- You may withdraw consent and disable this feature at any time from your account settings.
- FocusNest does not guarantee the accuracy, suitability, or completeness of any AI-generated task suggestions. You are solely responsible for reviewing and acting upon any AI output.
- Do not input sensitive personal, medical, financial, or confidential third-party information into the AI task breakdown feature.

---

### 7. Spotify integration

FocusNest includes an optional 40Hz audio feature powered by the Spotify Web Playback SDK. By enabling this feature:

- You must have a valid, active Spotify account and agree to Spotify's own Terms of Service and Privacy Policy.
- FocusNest accesses only the permissions necessary to enable audio playback. We do not access your listening history, playlists, followers, or any other Spotify profile data.
- FocusNest is not affiliated with, endorsed by, or partnered with Spotify AB.
- Spotify may change or discontinue their SDK at any time. FocusNest cannot guarantee the continued availability of this feature.

---

### 8. Intellectual property

All content, design, code, architecture, and documentation comprising FocusNest is the intellectual property of Amine El Houmiri and Southampton Solent University where applicable.

You are granted a limited, non-exclusive, non-transferable licence to use FocusNest solely for your personal productivity purposes. This licence does not permit you to copy, reproduce, distribute, or create derivative works from any part of FocusNest.

Your task content, session data, and any other data you input into FocusNest remains your own intellectual property at all times.

---

### 9. Disclaimers and limitation of liability

**Not a medical tool:** FocusNest is not a medical device, clinical therapy, or diagnostic tool. It is a productivity application informed by publicly available neuroscience research (CDC, 2025; Huberman Lab, 2026). It does not constitute medical advice. If you have concerns about ADHD or any other health condition, consult a qualified medical professional.

**No guarantee of availability:** FocusNest is provided as an academic project. We do not guarantee uninterrupted, error-free availability. Planned or unplanned maintenance, third-party API outages (OpenAI, Spotify), or infrastructure issues may affect availability. Graceful degradation is implemented via Lite Mode for core features.

**No guarantee of AI output:** AI-generated task suggestions are produced by a third-party model and may be inaccurate, incomplete, or unsuitable. You rely on these suggestions entirely at your own discretion.

**Limitation of liability:** To the fullest extent permitted by applicable law, Amine El Houmiri shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use FocusNest.

---

### 10. Third-party services

FocusNest integrates with the following third-party services, each governed by their own terms and privacy policies:

- **OpenAI** — openai.com/policies
- **Spotify** — spotify.com/legal
- **Amazon Web Services** — aws.amazon.com/legal
- **Sentry** — sentry.io/legal
- **ContentSquare** — contentsquare.com/legal

FocusNest is not responsible for the practices, availability, or content of any third-party service.

---

### 11. Governing law and jurisdiction

These Terms & Conditions are governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. These terms operate in compliance with UK GDPR and, where applicable, EU GDPR.

---

### 12. Changes to these terms

We reserve the right to update these Terms & Conditions at any time. Material changes will be communicated by email and displayed on your next login. Continued use after notification constitutes acceptance. The current version is always available at `/terms`.

---

### 13. Contact

**Amine El Houmiri**  
Southampton Solent University, East Park Terrace, Southampton SO14 0RD  
Email: 6elhom71@solent.ac.uk

*Version 1.0 · February 2026 · Governed by the laws of England and Wales*

---

## Privacy Policy — Full Content

**FocusNest — Privacy Policy**  
Effective date: February 2026 · Version 1.0

> **Plain-language summary:** FocusNest is built for ADHD users. We collect only what we need, we never sell your data, you can delete everything instantly, and we are fully transparent about every third-party service we use.

---

### 1. Who we are

FocusNest is operated by Amine El Houmiri ("we", "us", "our") as data controller under UK GDPR and EU GDPR. Contact: 6elhom71@solent.ac.uk

---

### 2. What data we collect and why

| Data category | Purpose | Legal basis |
|---|---|---|
| Email address | Account authentication | Art. 6(1)(b) — Contract |
| Hashed password | Secure login via bcrypt | Art. 6(1)(b) — Contract |
| Task & subtask content | Kanban board, AI breakdown | Art. 6(1)(b) — Contract |
| Focus session logs | Timing engine, reflections | Art. 6(1)(b) — Contract |
| AI chat messages | Task decomposition (optional) | Art. 6(1)(a) — Consent |
| Spotify OAuth token | 40Hz audio playback (optional) | Art. 6(1)(a) — Consent |
| OpenAI token usage metadata | Admin cost monitoring (content masked) | Art. 6(1)(f) — Legitimate interest |
| Last login timestamp | 90-day idle purge (GDPR Art. 5(1)(e)) | Art. 6(1)(c) — Legal obligation |

We do **not** collect your name, date of birth, phone number, payment information, or any health or diagnostic data.

---

### 3. How we store and protect your data

**Encryption at rest:** AES-256 via Amazon RDS. Covers the database, automated backups, read replicas, and snapshots (AWS, 2026; NIST, 2022).

**Encryption in transit:** TLS 1.2+ on all connections, managed via AWS Certificate Manager.

**Key management:** AWS KMS with FIPS 140-3 Security Level 3 validated HSMs. Plaintext keys never leave the AWS boundary (AWS, 2024a).

**Pseudonymisation:** All primary keys use UUIDv4, structurally decoupling data identity from personal identity (GDPR Art. 32; GDPR, 2018b).

**Authentication:** bcrypt password hashing. JWTs stored in HttpOnly cookies to prevent XSS attacks.

**AWS Shared Responsibility:** Infrastructure security is managed by AWS. Application-level security — including database configuration, encryption, and access control — is the responsibility of FocusNest (AWS, 2024b).

---

### 4. Third-party services

**OpenAI (optional):** Task text is sent to OpenAI only when you enable AI Task Breakdown. Under OpenAI's Enterprise Privacy Framework, API data is not used to train models by default (OpenAI, 2024). Requires explicit consent, withdrawable at any time.

**Spotify (optional):** OAuth 2.0 token stored encrypted. We do not access your listening history, playlists, or profile. Governed by Spotify's own Privacy Policy.

**Sentry:** Real-time error monitoring for system stability. No personally identifiable task content is transmitted (Ewaschuk, 2017).

**ContentSquare:** Anonymised behavioural analytics to detect UI friction (e.g. rage clicks, navigation loops). No PII or task content transmitted.

---

### 5. Your rights under GDPR

**Right to erasure — Data Nuke (GDPR Art. 17):** Settings → "Delete account & wipe all data" triggers an immediate CASCADE DELETE across all records. Irreversible. No residual data is retained (GDPR, 2018a).

**Right to data portability (GDPR Art. 20):** Export all your data as a structured JSON file from Settings at any time.

**Right to rectification (GDPR Art. 16):** Edit any task, profile, or session data directly within the app.

**Right of access (GDPR Art. 15):** Request a full copy of your data by contacting us.

**Right to withdraw consent (GDPR Art. 7):** Disable AI processing or Spotify at any time from Settings. Does not affect prior lawful processing.

**Right to complain:** Lodge a complaint with the UK ICO at ico.org.uk or your local EU supervisory authority.

---

### 6. Data retention

Data is retained while your account is active. Accounts inactive for 90+ days are automatically deleted via AWS Lambda (NFR-SEC-02). You may delete your account instantly at any time using the Data Nuke.

> **Warning:** Account deletion is permanent and irreversible. No grace period or backup restoration applies.

---

### 7. Cookies

FocusNest uses one strictly necessary functional cookie — a JWT stored in an HttpOnly cookie for authentication. No advertising cookies, tracking pixels, or cross-site tracking are used.

---

### 8. Vulnerable users

FocusNest is designed for adults aged 18+. This project received formal ethical clearance via the Solent University Ethics Portal (Appendix C of the project report), with specific protocols for the neurodivergent demographic. Initial validation uses synthetic user simulation to avoid risk to human participants (Koc, 2024).

---

### 9. Policy changes

Material changes will be communicated by email and displayed on login. Continued use after notification constitutes acceptance. Current version always available at `/privacy`.

---

### 10. Contact

**Amine El Houmiri**  
Southampton Solent University, East Park Terrace, Southampton SO14 0RD  
Email: 6elhom71@solent.ac.uk

*Version 1.0 · February 2026 · Governed by UK GDPR and EU GDPR*

---

## References cited in this document

| Reference | Used for |
|---|---|
| GDPR (2018a) — Art. 17 | Right to erasure, Data Nuke feature |
| GDPR (2018b) — Art. 32 | Pseudonymisation, encryption requirement |
| GDPR — Art. 4(11) | Definition of valid consent (unchecked by default) |
| GDPR — Art. 5(1)(e) | Storage limitation principle, 90-day purge |
| GDPR — Art. 6(1)(a)(b)(c)(f) | Lawful bases for each data category |
| GDPR — Art. 7(1) | Demonstrable consent, audit log requirement |
| GDPR — Art. 7(3) | Right to withdraw consent |
| AWS (2024a) | KMS, FIPS 140-3 HSM key management |
| AWS (2024b) | Shared Responsibility Model |
| AWS (2026) | AES-256 encryption on Amazon RDS |
| NIST (2022) | AES endorsement, SP 800-38A |
| OpenAI (2024) | Enterprise privacy, no model training on API data |
| Ewaschuk (2017) | SRE observability, Sentry justification |
| James (2025) | Cognitive Load Management, modal UX design |
| Rehan (2025) | Reducible complexity, low friction for ADHD users |
| Patrickson et al. (2024) | User trust concerns in digital ADHD services |
| Koc (2024) | Synthetic user simulation methodology |
| CDC (2025) | Clinical ADHD definition, not a medical tool disclaimer |
| Huberman Lab (2026) | Neuroscience basis, not a medical tool disclaimer |
| W3C (2022) | Cognitive Accessibility standards for page design |
| Schwaber & Sutherland (2020) | Agile methodology reference |

---

*FocusNest Terms, Privacy & Consent Specification · Version 1.0 · February 2026*  
*COM629 AE1 — Southampton Solent University*
