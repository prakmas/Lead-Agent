import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Lead Agent",
  description: "How the Lead Agent app collects, uses and protects your information.",
};

const UPDATED = "June 20, 2026";
const CONTACT = "praveenmaddela7848@gmail.com";

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px 80px", lineHeight: 1.6, color: "#1f2430", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>Lead Agent — last updated {UPDATED}</p>

      <p>
        This Privacy Policy explains how the <strong>Lead Agent</strong> mobile and web application
        (&quot;Lead Agent&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses, and protects information when you use our
        service to list local businesses and manage customer leads.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your name, email and/or phone number, and a securely hashed password, used to create and sign in to your account.</li>
        <li><strong>Location data</strong> — when you tap &quot;Use my current location&quot; to list a business, we capture the device&apos;s GPS coordinates and the reverse-geocoded address. Location is only collected with your permission and only while you are using the app.</li>
        <li><strong>Business listing data</strong> — details you enter about a business, including business name, category, address, timings, the owner&apos;s name and phone number, and pricing.</li>
        <li><strong>Verification data</strong> — phone numbers you submit for one-time-password (OTP) verification.</li>
        <li><strong>Usage data</strong> — basic technical information needed to operate and secure the service.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To authenticate you and provide the core features (creating and managing listings, leads, and conversations).</li>
        <li>To capture an accurate business location on a map.</li>
        <li>To send and verify OTP codes that confirm a business owner&apos;s phone number.</li>
        <li>To match customer requirements with relevant business listings.</li>
        <li>To secure the service and prevent abuse.</li>
      </ul>

      <h2>Third-party services</h2>
      <p>We use trusted providers strictly to deliver the features above:</p>
      <ul>
        <li><strong>Twilio</strong> — sends and validates OTP verification codes (Twilio Verify).</li>
        <li><strong>Meta / WhatsApp Business Platform</strong> — delivers customer conversation messages.</li>
        <li><strong>Google Maps / device location</strong> — resolves coordinates to addresses.</li>
        <li><strong>MongoDB Atlas &amp; Railway</strong> — securely host our database and backend.</li>
        <li><strong>Expo</strong> — builds and delivers the mobile application.</li>
      </ul>

      <h2>Data sharing</h2>
      <p>
        We do not sell your personal information. Business listing details (such as business name,
        location and the contact number you provide) may be shared with prospective customers as part
        of the matching service — that is the purpose of a listing. We share data with the processors
        above only as needed to run the service, and when required by law.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain account and listing data for as long as your account is active or as needed to provide
        the service. OTP codes are short-lived and expire automatically. You may request deletion of your
        data at any time (see below).
      </p>

      <h2>Security</h2>
      <p>
        Passwords are stored hashed, access tokens are kept in the device&apos;s secure storage, and data is
        transmitted over encrypted connections (HTTPS). No method of transmission or storage is 100%
        secure, but we take reasonable measures to protect your information.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of your personal data by contacting us at{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will respond within a reasonable timeframe.
      </p>

      <h2>Children</h2>
      <p>Lead Agent is intended for business use and is not directed to children under 13.</p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The &quot;last updated&quot; date above reflects the latest
        revision. Continued use of the service after changes constitutes acceptance of the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </main>
  );
}
