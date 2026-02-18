"use client";

import { useEffect, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { GithubIcon, MailIcon, EyeIcon, EyeOffIcon, ArrowRightIcon } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AuthNavbar } from "./auth-navbar";
import { Boxes } from "@/components/ui/background-boxes";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Step = "credentials" | "otp-fallback" | "second-factor";
type LastAuth = "github" | "google" | "email" | null;

export function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [lastAuth, setLastAuth] = useState<LastAuth>(null);

  useEffect(() => {
    const stored = localStorage.getItem("aura:last-auth");
    if (stored === "github" || stored === "google" || stored === "email") {
      setLastAuth(stored);
    }
  }, []);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        localStorage.setItem("aura:last-auth", "email");
        router.push("/");
      } else if (result.status === "needs_second_factor") {
        // Client Trust is enabled — Clerk requires a second factor (OTP to email)
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setStep("second-factor");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ code?: string; message: string }> };
      const code = clerkError.errors?.[0]?.code;

      if (code === "strategy_for_user_invalid" || code === "verification_strategy_invalid") {
        // Account was created with social login — no password set yet.
        // Fall back to OTP: sign in via email code, then they can set a password after.
        try {
          await signIn.create({ strategy: "email_code", identifier: email });
          setStep("otp-fallback");
        } catch {
          setError("Could not send verification code. Try signing in with GitHub or Google.");
        }
      } else {
        setError(clerkError.errors?.[0]?.message ?? "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSecondFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: otp,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        localStorage.setItem("aura:last-auth", "email");
        router.push("/");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message ?? "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOtpFallback(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: otp,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        localStorage.setItem("aura:last-auth", "email");
        router.push("/");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message ?? "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuth(strategy: "oauth_github" | "oauth_google") {
    if (!isLoaded) return;
    setError("");
    const method = strategy === "oauth_github" ? "github" : "google";
    setOauthLoading(method);
    // Write to sessionStorage only — promoted to localStorage in /sso-callback
    // after Clerk confirms successful authentication (avoids false "Last used" on cancel)
    sessionStorage.setItem("aura:pending-auth", method);

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message ?? "OAuth sign-in failed.");
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuthNavbar page="sign-in" />

      <div className="flex flex-1 pt-14">
        {/* Left branding column */}
        <div className="landing-gradient relative hidden w-1/2 flex-col items-center justify-center overflow-hidden p-12 lg:flex">
          <Boxes />
          {/* Radial fade — transparent centre lets boxes show, opaque edges blend into bg */}
          <div className="landing-gradient pointer-events-none absolute inset-0 z-20 [mask-image:radial-gradient(transparent,white)]" />
          <div className="glow-orb left-1/4 top-20 size-60 bg-purple-600" />
          <div
            className="glow-orb right-1/4 bottom-20 size-48 bg-[#1F84EF]"
            style={{ animationDelay: "2s" }}
          />
          <div className="relative z-30 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-6">
              <Image src="/logo.svg" alt="Aura" width={40} height={40} />
              <span className={cn("text-3xl font-bold text-white", poppins.className)}>
                Aura
              </span>
            </div>
            <h2 className={cn("text-2xl font-semibold text-white leading-tight", poppins.className)}>
              Build. Edit. Preview.
              <br />
              <span className="bg-gradient-to-r from-[#FFD200] via-[#1F84EF] to-[#06E07F] bg-clip-text text-transparent">
                All with AI.
              </span>
            </h2>
            <p className="mt-4 max-w-xs text-sm text-white/50 leading-relaxed">
              An AI-powered code editor with in-browser runtime. Write code through
              conversation, see it run instantly.
            </p>
          </div>
        </div>

        {/* Right form column */}
        <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-sm">

            {step === "credentials" ? (
              <>
                <div className="mb-8">
                  <h1 className={cn("text-2xl font-semibold text-white", poppins.className)}>
                    Welcome back
                  </h1>
                  <p className="mt-1.5 text-sm text-white/50">Sign in to your Aura account</p>
                </div>

                {/* OAuth buttons */}
                <div className="space-y-3">
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
                      onClick={() => handleOAuth("oauth_github")}
                      disabled={!!oauthLoading || isLoading}
                    >
                      {oauthLoading === "github" ? <Spinner className="size-4" /> : <GithubIcon className="size-4" />}
                      Continue with GitHub
                    </Button>
                    {lastAuth === "github" && (
                      <span className="absolute -top-2.5 right-3 rounded-full border border-[#7c5aed]/50 bg-[#1e1b2e] px-1.5 py-0.5 text-[9px] text-[#a78bfa]">
                        Last used
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
                      onClick={() => handleOAuth("oauth_google")}
                      disabled={!!oauthLoading || isLoading}
                    >
                      {oauthLoading === "google" ? <Spinner className="size-4" /> : <FcGoogle className="size-4" />}
                      Continue with Google
                    </Button>
                    {lastAuth === "google" && (
                      <span className="absolute -top-2.5 right-3 rounded-full border border-[#7c5aed]/50 bg-[#1e1b2e] px-1.5 py-0.5 text-[9px] text-[#a78bfa]">
                        Last used
                      </span>
                    )}
                  </div>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <Separator className="flex-1 bg-white/10" />
                  <span className="text-xs text-white/30">or</span>
                  <Separator className="flex-1 bg-white/10" />
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm text-white/70">Email</Label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-[#7c5aed] focus-visible:ring-0"
                        required
                        disabled={isLoading || !!oauthLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm text-white/70">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-9 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-[#7c5aed] focus-visible:ring-0"
                        required
                        disabled={isLoading || !!oauthLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="relative">
                    <Button type="submit" className="w-full gap-2" disabled={isLoading || !!oauthLoading}>
                      {isLoading ? <Spinner className="size-4" /> : <ArrowRightIcon className="size-4" />}
                      Sign in
                    </Button>
                    {lastAuth === "email" && (
                      <span className="absolute -top-2.5 right-3 rounded-full border border-[#7c5aed]/50 bg-[#1e1b2e] px-1.5 py-0.5 text-[9px] text-[#a78bfa]">
                        Last used
                      </span>
                    )}
                  </div>
                </form>

                <p className="mt-6 text-center text-sm text-white/40">
                  Don&apos;t have an account?{" "}
                  <Link href="/sign-up" className="text-[#7c5aed] underline-offset-4 hover:underline">
                    Sign up
                  </Link>
                </p>
              </>
            ) : step === "otp-fallback" ? (
              <>
                <div className="mb-8">
                  <h1 className={cn("text-2xl font-semibold text-white", poppins.className)}>
                    Verify your identity
                  </h1>
                  <p className="mt-1.5 text-sm text-white/50">
                    Your account uses social login. We sent a 6-digit code to{" "}
                    <span className="text-white/70">{email}</span> to confirm it&apos;s you.
                  </p>
                  <p className="mt-2 text-xs text-white/35">
                    After signing in you can set a password in your account settings.
                  </p>
                </div>

                <form onSubmit={handleOtpFallback} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp-fallback" className="text-sm text-white/70">
                      Verification code
                    </Label>
                    <Input
                      id="otp-fallback"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center tracking-[0.5em] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-[#7c5aed] focus-visible:ring-0"
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? <Spinner className="size-4" /> : <ArrowRightIcon className="size-4" />}
                    Verify & sign in
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(""); setOtp(""); }}
                  className="mt-4 w-full text-center text-sm text-white/40 hover:text-white/60"
                >
                  ← Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className={cn("text-2xl font-semibold text-white", poppins.className)}>
                    Check your email
                  </h1>
                  <p className="mt-1.5 text-sm text-white/50">
                    We sent a verification code to{" "}
                    <span className="text-white/70">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleSecondFactor} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-sm text-white/70">
                      Verification code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="text-center tracking-[0.5em] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-[#7c5aed] focus-visible:ring-0"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                    {isLoading ? <Spinner className="size-4" /> : <ArrowRightIcon className="size-4" />}
                    Verify & sign in
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(""); setOtp(""); }}
                  className="mt-4 w-full text-center text-sm text-white/40 hover:text-white/60"
                >
                  ← Back to sign in
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
