import { Header } from '@/components/layout/Header';
import { LegalLayout, Section, P, H2 } from './LegalLayout';

export function PrivacyPage() {
  return (
    <>
      <Header title="Privacy Policy" showBack />
      <LegalLayout title="Privacy Policy" lastUpdated="2026-10-01">
        <Section>
          <P>
            Doctor Cares takes your privacy seriously. This Policy explains what information we
            collect, how we use it, and your rights under Ghana's Data Protection Act, 2012
            (Act 843) and, where applicable, the EU General Data Protection Regulation (GDPR).
          </P>
        </Section>

        <H2>1. Information we collect</H2>
        <Section>
          <P>
            <strong>Account data</strong>: name, email, phone, role (patient/doctor/nurse/admin),
            password hash.
            <br />
            <strong>Health data</strong>: medical history you choose to enter (allergies, chronic
            conditions, medications, surgeries, family history, lifestyle, vitals, NHIS number).
            <br />
            <strong>Clinical records</strong>: appointments, prescriptions, chat messages,
            reviews, referrals, NHIS claims.
            <br />
            <strong>Device and usage</strong>: IP address, push-notification tokens, basic
            telemetry needed to run the Service.
          </P>
        </Section>

        <H2>2. How we use your information</H2>
        <Section>
          <P>
            To provide the Service — scheduling, messaging, prescriptions, calls — and to improve
            and secure it. We do <strong>not</strong> sell your personal data to third parties.
            Push notifications are used only for appointment reminders, chat messages, referral
            updates, and health tips you have subscribed to.
          </P>
        </Section>

        <H2>3. Who sees your data</H2>
        <Section>
          <P>
            Your clinicians see what you share with them (profile, medical history, vitals,
            messages, prescriptions issued by them). Administrators see aggregate operational
            data and specific records only to resolve a report. We never share identifiable
            health data with marketing partners.
          </P>
        </Section>

        <H2>4. Vendors we rely on</H2>
        <Section>
          <P>
            Supabase (data storage, authentication, realtime), Vercel (hosting), Firebase Cloud
            Messaging + VAPID Web Push (notifications), Jitsi Meet (video calls), OpenFDA
            (public drug reference data). Each operates under their own privacy terms.
          </P>
        </Section>

        <H2>5. Retention</H2>
        <Section>
          <P>
            Health records are retained for as long as your account is active. If you delete
            your account, we delete your profile and chat messages within 30 days; clinical
            records (prescriptions, appointment logs) may be retained longer where law requires.
          </P>
        </Section>

        <H2>6. Your rights</H2>
        <Section>
          <P>
            You can access, correct, download, or delete your data from the Profile screen.
            Use <strong>Export medical record (PDF)</strong> to download your record at any
            time. To delete your account, email <a href="mailto:privacy@doctor-cares.app" className="text-brand-600 dark:text-brand-300 underline">privacy@doctor-cares.app</a>.
          </P>
        </Section>

        <H2>7. Children</H2>
        <Section>
          <P>
            The Service is not directed at children under 13. Minors between 13 and 17 may use
            the Service with a parent or guardian's consent.
          </P>
        </Section>

        <H2>8. Security</H2>
        <Section>
          <P>
            Data is encrypted in transit (HTTPS) and at rest where supported by our vendors.
            Access is restricted via row-level security so you only see your own records.
            No system is perfectly secure; please use a strong, unique password.
          </P>
        </Section>

        <H2>9. Updates</H2>
        <Section>
          <P>
            We will post material changes to this Policy here and, where appropriate, notify
            you by email.
          </P>
        </Section>

        <H2>10. Contact</H2>
        <Section>
          <P>
            Privacy questions: <a href="mailto:privacy@doctor-cares.app" className="text-brand-600 dark:text-brand-300 underline">privacy@doctor-cares.app</a>.
          </P>
        </Section>
      </LegalLayout>
    </>
  );
}
