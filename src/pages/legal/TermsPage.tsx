import { Header } from '@/components/layout/Header';
import { LegalLayout, Section, P, H2 } from './LegalLayout';

export function TermsPage() {
  return (
    <>
      <Header title="Terms of Service" showBack />
      <LegalLayout title="Terms of Service" lastUpdated="2026-10-01">
        <Section>
          <P>
            Welcome to Doctor Cares. By creating an account or using the Doctor Cares app, website,
            or any related services (collectively, the "Service"), you agree to these Terms of Service.
            If you do not agree, do not use the Service.
          </P>
        </Section>

        <H2>1. What Doctor Cares is</H2>
        <Section>
          <P>
            Doctor Cares is a technology platform that connects patients in Ghana with verified
            doctors, nurses, and healthcare administrators. The Service enables appointments,
            messaging, video consultations, prescriptions, vital tracking, and claims management.
            Doctor Cares does not itself provide medical advice or treatment — all clinical
            decisions are made by independent, licensed clinicians who use the platform.
          </P>
        </Section>

        <H2>2. Eligibility</H2>
        <Section>
          <P>
            You must be at least 18 years old to create an account, or have the consent of a
            parent or legal guardian. Clinicians must hold current Ghanaian licensure in their
            field.
          </P>
        </Section>

        <H2>3. Accounts and security</H2>
        <Section>
          <P>
            You are responsible for keeping your password confidential. Notify us immediately
            if you believe your account has been compromised. We may suspend accounts that
            violate these Terms or local law.
          </P>
        </Section>

        <H2>4. Clinical disclaimer</H2>
        <Section>
          <P>
            Information shown in the Service is not a substitute for in-person medical care
            when such care is needed. In an emergency, call <strong>112</strong> (Ghana unified
            emergency) or go to the nearest hospital. The Service's drug information is sourced
            from OpenFDA and is for reference only; always confirm with your clinician.
          </P>
        </Section>

        <H2>5. Payments</H2>
        <Section>
          <P>
            Consultation fees are set by individual clinicians and shown before you book. NHIS
            claims filed through the Service are subject to approval by the National Health
            Insurance Authority.
          </P>
        </Section>

        <H2>6. Prohibited conduct</H2>
        <Section>
          <P>
            You may not use the Service for anything unlawful or abusive. This includes
            impersonation, harassment, misrepresentation of qualifications, or attempting to
            circumvent clinical safeguards.
          </P>
        </Section>

        <H2>7. Limitation of liability</H2>
        <Section>
          <P>
            To the maximum extent permitted by law, Doctor Cares is not liable for indirect,
            incidental, or consequential damages arising from your use of the Service. Nothing
            in these Terms limits liability that cannot be excluded under Ghanaian law.
          </P>
        </Section>

        <H2>8. Changes</H2>
        <Section>
          <P>
            We may update these Terms from time to time. Material changes will be notified in
            the app. Continued use after an update means you accept the new Terms.
          </P>
        </Section>

        <H2>9. Contact</H2>
        <Section>
          <P>
            Questions: email <a href="mailto:support@doctor-cares.app" className="text-brand-600 dark:text-brand-300 underline">support@doctor-cares.app</a>.
          </P>
        </Section>
      </LegalLayout>
    </>
  );
}
