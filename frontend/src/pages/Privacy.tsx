import { Card } from "../components/Card";
import { APP_SUPPORT_EMAIL } from "../lib/constants";

export function Privacy() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">
          Last updated: 1 April 2026
        </p>

        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Data we collect</h2>
            <p>
              Beer O&apos;Clock is opt-in by default. You can use the app without
              creating an account, in which case your data stays on your
              device.
            </p>
            <p className="mt-2">
              Depending on what you choose to use, we may process:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-foreground">
              <li>Profile inputs (sex, weight, height, age, history preference).</li>
              <li>Session data (drinks logged, times, BAC estimates, session summaries).</li>
              <li>Beer preferences (favourites and custom beers).</li>
              <li>Account details from sign-in providers (such as your email address).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">How we use data</h2>
            <p>
              We use your data to run core app features, including BAC
              estimates, active session tracking, history, sync between devices
              (if signed in), and account support.
            </p>
            <p className="mt-2">
              We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Where data is stored</h2>
            <p>
              Local app data is stored in your browser/device storage. If you
              choose to sign in, selected data is also stored in our cloud
              services to support authenticated features and cross-device sync.
            </p>
            <p className="mt-2">
              We use infrastructure providers (including AWS and Supabase) to
              host and process data on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your choices and control</h2>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>You can use Beer O&apos;Clock without creating an account.</li>
              <li>You can turn history saving on or off in your profile.</li>
              <li>You can purge local data at any time from the Profile page.</li>
              <li>
                Signed-in users can request full data deletion by contacting{" "}
                <a
                  href={`mailto:${APP_SUPPORT_EMAIL}`}
                  className="text-primary-foreground"
                >
                  {APP_SUPPORT_EMAIL}
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">BAC disclaimer</h2>
            <p>
              BAC values in Beer O&apos;Clock are mathematical estimates only and
              are never a legal, medical, or safety determination. Do not use
              the app to decide whether you are safe or legally permitted to
              drive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Contact</h2>
            <p>
              Questions about privacy can be sent to{" "}
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
