import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { isInstalledIOS } from "../utils/platform";

export function SignIn() {
  const { signInWithGoogle } = useAuth();
  const isOnline = useOnlineStatus();
  const [searchParams] = useSearchParams();
  const failed = searchParams.get("error") === "failed";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-foreground text-center mb-8">
          Sign in to Beer O'Clock
        </h1>

        {isInstalledIOS() ? (
          <p className="text-sm text-muted-foreground text-center">
            Signing in isn't available in the installed iPhone app. To sync your
            drinks, open itsbeeroclock.au in Safari and sign in there. You can
            keep logging drinks here without signing in.
          </p>
        ) : (
          <>
            {failed && (
              <p role="alert" className="text-sm text-destructive text-center mb-4">
                Sign-in didn't work. Please try again.
              </p>
            )}
            <Button
              onClick={signInWithGoogle}
              disabled={!isOnline}
              className="w-full h-12"
            >
              Continue with Google
            </Button>
            {!isOnline && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Signing in needs a connection.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
