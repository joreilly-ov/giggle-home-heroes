import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, ArrowLeft } from "lucide-react";

type View = "sign-in" | "sign-up" | "forgot-password";

const Auth = () => {
  const [view, setView] = useState<View>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const next = searchParams.get("next");
    if (next?.startsWith("/")) {
      navigate(next, { replace: true });
      return;
    }

    supabase
      .from("contractors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: contractorData }) => {
        if (contractorData) {
          navigate("/contractor/profile", { replace: true });
          return;
        }
        supabase
          .from("profiles")
          .select("postcode, interests")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const hasAddress = !!data?.postcode;
            const hasInterests = Array.isArray((data as any)?.interests) && (data as any).interests.length > 0;
            if (hasAddress && hasInterests) {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/profile", { replace: true });
            }
          });
      });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    toast({ title: "Check your email", description: "If an account exists with that address, we sent a reset link." });
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) {
      toast({ title: "Google sign in failed", description: error.message, variant: "destructive" });
    }
  };

  const mapTwitterOAuthError = (error: { message?: string; status?: number; name?: string }) => {
    const raw = (error?.message || "").toLowerCase();
    const status = error?.status;

    if (raw.includes("provider is not enabled") || raw.includes("unsupported provider") || raw.includes("provider not enabled")) {
      return {
        title: "Twitter sign-in unavailable",
        description: "Twitter login isn't enabled yet. Please try Google or email instead.",
      };
    }
    if (raw.includes("popup") && raw.includes("closed")) {
      return {
        title: "Sign-in cancelled",
        description: "The Twitter sign-in window was closed before finishing. Please try again.",
      };
    }
    if (raw.includes("popup") && raw.includes("block")) {
      return {
        title: "Popup blocked",
        description: "Your browser blocked the Twitter sign-in popup. Allow popups for this site and retry.",
      };
    }
    if (raw.includes("redirect") && raw.includes("not allowed")) {
      return {
        title: "Redirect not allowed",
        description: "This site isn't on Twitter's allowed redirect list. Please contact support.",
      };
    }
    if (raw.includes("network") || raw.includes("failed to fetch") || error?.name === "AuthRetryableFetchError") {
      return {
        title: "Network error",
        description: "We couldn't reach Twitter. Check your connection and try again.",
      };
    }
    if (raw.includes("rate limit") || status === 429) {
      return {
        title: "Too many attempts",
        description: "You've tried signing in too many times. Please wait a minute and try again.",
      };
    }
    if (raw.includes("email") && raw.includes("already")) {
      return {
        title: "Email already in use",
        description: "An account with this email already exists. Try signing in with that method instead.",
      };
    }
    if (raw.includes("access_denied") || raw.includes("denied")) {
      return {
        title: "Permission denied",
        description: "You declined to share your Twitter account. Approve access to continue.",
      };
    }
    if (status && status >= 500) {
      return {
        title: "Twitter is having issues",
        description: "Twitter's sign-in service is temporarily unavailable. Please try again shortly.",
      };
    }
    return {
      title: "Twitter sign-in failed",
      description: error?.message || "Something went wrong while contacting Twitter. Please try again.",
    };
  };

  const handleTwitterOAuth = async (intent: "sign-in" | "sign-up") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        options: { redirectTo: window.location.origin + "/auth" },
      });
      if (error) {
        const mapped = mapTwitterOAuthError(error);
        toast({
          title: intent === "sign-up" ? mapped.title.replace("sign-in", "sign-up") : mapped.title,
          description: mapped.description,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      const mapped = mapTwitterOAuthError(err ?? {});
      toast({
        title: intent === "sign-up" ? "Twitter sign-up failed" : "Twitter sign-in failed",
        description: mapped.description,
        variant: "destructive",
      });
    }
  };

  const handleTwitterSignIn = () => handleTwitterOAuth("sign-in");

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
            Kis<span className="text-accent">X</span>Cars
          </a>
          <p className="text-muted-foreground mt-2">Connect with trusted contractors</p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-heading font-bold text-foreground mb-6">
            {view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Reset password"}
          </h2>

          {view === "forgot-password" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button onClick={() => setView("sign-in")} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to sign in
                </button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={view === "sign-in" ? handleSignIn : handleSignUp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10"
                    />
                  </div>
                </div>

                {view === "sign-in" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                {view === "sign-up" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : view === "sign-in" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                type="button"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 mt-3"
                onClick={() => handleTwitterOAuth(view === "sign-up" ? "sign-up" : "sign-in")}
                type="button"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                {view === "sign-up" ? "Sign up with Twitter" : "Sign in with Twitter"}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {view === "sign-in" ? (
                  <>No account?{" "}<button onClick={() => setView("sign-up")} className="text-primary font-medium hover:underline">Create one</button></>
                ) : (
                  <button onClick={() => setView("sign-in")} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Back to sign in
                  </button>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
