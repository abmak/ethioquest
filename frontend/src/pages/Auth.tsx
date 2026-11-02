import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Compass, Sparkles, Trophy, Users } from "lucide-react";
import { BrandLockup } from "../components/Brand";
import { Button } from "../components/ui";
import { apiError } from "../lib/api";
import { useAuth } from "../store/auth";

interface AuthPageProps {
  mode: "login" | "register";
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-400/10";

export function AuthPage({ mode }: AuthPageProps) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/quiz";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ email, username, displayName, password });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiError(err, "Could not sign you in. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      {/* Brand panel — vivid Ethiopian colours with the product promises. */}
      <aside className="hero-mesh relative hidden flex-col justify-between p-10 text-white lg:flex">
        <div className="relative z-10">
          <span className="rounded-2xl bg-white/95 px-3 py-2 shadow-xl shadow-teal-950/20">
            <BrandLockup size="md" />
          </span>
        </div>

        <div className="relative z-10 flex max-w-md flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Discover · Learn · Share</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
              Ethiopia,
              <br />
              one question at a time.
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Play the daily quiz, plan your next trip across the highlands and the Rift Valley, then share the story
              with travellers who follow you.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {[
              { icon: Trophy, title: "Daily quiz · monthly prizes", text: "Ten questions a day, ETB 100,000 for the top score." },
              { icon: Compass, title: "Places to visit, mapped", text: "OpenStreetMap guides from Addis to the Danakil." },
              { icon: Users, title: "Follow and message", text: "Private conversations with the travellers you meet." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="glass flex items-start gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="block text-xs text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">Made in Ethiopia · Amharic, Afaan Oromoo, Tigrinya and English</p>
        <span className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" aria-hidden />
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center lg:hidden">
            <BrandLockup size="lg" tagline />
          </div>

          <div className="mb-5 hidden flex-col gap-1 lg:flex">
            <h2 className="font-display text-2xl font-extrabold text-ink">
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted">
              {isRegister ? "Join the community and start your first challenge." : "Sign in to continue your streak."}
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              {isRegister && (
                <>
                  <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                    Display name
                    <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} autoComplete="name" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                    Username
                    <input
                      className={inputClass}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                    />
                  </label>
                </>
              )}
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Email
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Password
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : 1}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </p>
              )}

              <Button type="submit" loading={busy} className="mt-2 w-full bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-500">
                <Sparkles className="h-4 w-4" aria-hidden />
                {isRegister ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-3 text-center text-xs text-muted">
              By continuing you agree to our{" "}
              <Link to="/terms" className="font-semibold text-fuchsia-700 hover:underline dark:text-fuchsia-300">
                Terms & conditions
              </Link>
              .
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-fuchsia-700 dark:text-fuchsia-300">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/register" className="font-bold text-fuchsia-700 dark:text-fuchsia-300">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
