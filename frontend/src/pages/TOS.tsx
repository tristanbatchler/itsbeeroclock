import { Card } from "../components/Card";
import { APP_SUPPORT_EMAIL } from "../lib/constants";

export function TOS() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: 1 April 2026</p>

        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance and eligibility</h2>
            <p className="text-foreground">
              By using Beer O&apos;Clock, you agree to these terms. You are
              responsible for complying with all local laws and for your own
              decisions while consuming alcohol.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Service description</h2>
            <p className="text-foreground">
              Beer O&apos;Clock helps you log drinks and view estimated BAC over
              time. Some features are available without an account, while cloud
              sync and authenticated history features require sign-in.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. BAC estimates and safety warning</h2>
            <p className="text-foreground">
              BAC values are estimates only and are not legal, medical, or
              safety advice. The estimate may differ from your actual BAC due to
              factors such as food intake, hydration, health, medication, and
              individual metabolism.
            </p>
            <p className="text-foreground mt-2">
              Never use Beer O&apos;Clock as the basis for deciding whether to
              drive or operate machinery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Accounts and data</h2>
            <p className="text-foreground">
              You may use Beer O&apos;Clock anonymously. If you sign in, you are
              responsible for account access under your credentials and for the
              accuracy of information you provide in your profile.
            </p>
            <p className="text-foreground mt-2">
              Your use of personal data is governed by our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Acceptable use</h2>
            <p className="text-foreground">You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-foreground">
              <li>Use the service for unlawful purposes.</li>
              <li>Attempt to interfere with or disrupt the service.</li>
              <li>Attempt to gain unauthorised access to systems or data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Availability and changes</h2>
            <p className="text-foreground">
              We may update, suspend, or discontinue parts of the service at
              any time, including to improve safety, reliability, or legal
              compliance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Limitation of liability</h2>
            <p className="text-foreground">
              To the maximum extent permitted by law, Beer O&apos;Clock is
              provided on an &quot;as is&quot; basis without warranties of uninterrupted
              availability or fitness for a particular purpose. We are not
              liable for losses resulting from reliance on BAC estimates or
              service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
            <p className="text-foreground">
              Questions about these terms can be sent to{" "}
              <a href={`mailto:${APP_SUPPORT_EMAIL}`} className="text-primary-foreground">
                {APP_SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}