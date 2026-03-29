import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { Mail, ArrowRight } from "lucide-react";

export function SignIn() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    await signInWithMagicLink(email);
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Card className="p-8 max-w-md text-center">
          <Mail className="size-12 mx-auto mb-4 text-primary-foreground" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-muted-foreground">
            We sent a magic link to <span className="font-medium text-foreground">{email}</span>
          </p>
          <Button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-6"
            variant="outline"
          >
            Send to another email
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-foreground text-center mb-8">
          Sign in to Beer O'Clock
        </h1>

        <Button onClick={signInWithGoogle} className="w-full mb-6 h-12">
          Continue with Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-4">or</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleMagicLink();
          }}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="ilovebeer@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send magic link"}
            {!loading && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
