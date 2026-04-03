import { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { Mail, ArrowRight } from "lucide-react";

export function SignIn() {
  const { signInWithGoogle, signInWithMagicLink, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    await signInWithMagicLink(email);
    setSent(true);
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setLoading(false);
  };

  const handleOtpChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value.slice(-1); // one digit per cell
    setOtp(next);
    setOtpError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      const token = next.join("");
      setLoading(true);
      const { error } = await verifyOtp(email, token);
      setLoading(false);
      if (error) {
        setOtpError("Invalid code — please check your email and try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        navigate("/profile");
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = async (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length !== 6) return;
    e.preventDefault();
    const next = pasted.split("");
    setOtp(next);
    setOtpError("");
    setLoading(true);
    const { error } = await verifyOtp(email, pasted);
    setLoading(false);
    if (error) {
      setOtpError("Invalid code — please check your email and try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } else {
      navigate("/profile");
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Card className="p-8 max-w-md w-full text-center">
          <Mail className="size-12 mx-auto mb-4 text-foreground" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>

          <div className="flex justify-center gap-2 mb-2" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={loading}
                className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-sm text-destructive mt-2 mb-4">{otpError}</p>
          )}
          {loading && (
            <p className="text-sm text-muted-foreground mt-2 mb-4">Verifying...</p>
          )}

          <Button
            onClick={() => {
              setSent(false);
              setEmail("");
              setOtp(["", "", "", "", "", ""]);
              setOtpError("");
            }}
            className="mt-4 w-full"
            variant="outline"
          >
            Use a different email
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
            {loading ? "Sending..." : "Send one-time code"}
            {!loading && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
