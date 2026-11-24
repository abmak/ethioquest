import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  AtSign,
  Brain,
  Compass,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandLockup } from "../components/Brand";
import { Button } from "../components/ui";
import { apiError } from "../lib/api";
import { useAuth } from "../store/auth";

interface AuthPageProps {
  mode: "login" | "register";
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base text-ink outline-none transition focus:border-leaf-400 focus:ring-4 focus:ring-leaf-400/10";

/** What the product actually does, each with the icon the app uses for it. */
const PROMISES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Brain, title: "Daily quiz · monthly prizes", text: "Ten questions a day, ETB 100,000 for the top score." },
  { icon: Compass, title: "Places to visit, mapped", text: "OpenStreetMap guides from Addis to the Danakil." },
  { icon: Users, title: "Follow and message", text: "Private conversations with the travellers you meet." },
];

/** One labelled input with the field's own icon inside it. */
function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
      {label}
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-leaf-600 dark:text-leaf-300"
          aria-hidden
        />
        {children}
      </span>
    </label>
  );
}

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
          <span className="rounded-2xl bg-white/95 px-3 py-2 shadow-xl shadow-leaf-950/20">
            <BrandLockup size="md" />
          </span>
        </div>

        <div className="relative z-10 flex max-w-md flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Discover · Learn · Share</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
              Ethiopia,
              <br /> one question at a time.
            </h1>
            <p className="mt-3 text-sm text-white/80">
              Play the daily quiz, plan your next trip across the highlands and the Rift Valley, then share the story
              with travellers who follow you.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {PROMISES.map(({ icon: Icon, title, text }) => (
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
        <span className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-leaf-300/25 blur-3xl" aria-hidden />
      </aside>

      <main className="flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-sm">
          {/* Phones get the same brand panel, compacted above the form. */}
          <div className="hero-mesh relative mb-5 overflow-hidden rounded-3xl px-5 pb-5 pt-5 text-white shadow-soft lg:hidden">
            <span className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-leaf-300/25 blur-3xl" aria-hidden />
            <span className="relative inline-flex rounded-2xl bg-white/95 px-2.5 py-1.5 shadow-lg">
              <BrandLockup size="sm" />
            </span>
            <h1 className="relative mt-4 font-display text-2xl font-extrabold leading-tight">
              Ethiopia, one question at a time.
            </h1>
            <p className="relative mt-1.5 text-xs leading-relaxed text-white/80">
              The daily quiz, the places worth the trip, and the travellers who went first.
            </p>
            <ul className="relative mt-4 flex flex-wrap gap-1.5">
              {[
                { icon: Trophy, label: "Daily quiz" },
                { icon: Compass, label: "Places to visit" },
                { icon: Users, label: "Travellers" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-5 flex flex-col gap-1">
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
                  <Field icon={UserRound} label="Display name">
                    <input
                      className={inputClass}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      maxLength={60}
                      autoComplete="name"
                      placeholder="Abebe Bikila"
                    />
                  </Field>
                  <Field icon={AtSign} label="Username">
                    <input
                      className={inputClass}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                      placeholder="abebe"
                    />
                  </Field>
                </>
              )}
              <Field icon={Mail} label="Email">
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Field>
              <Field icon={Lock} label="Password">
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : 1}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "At least 8 characters" : "Your password"}
                />
              </Field>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </p>
              )}

              <Button type="submit" loading={busy} className="mt-2 w-full bg-gradient-to-br from-leaf-700 via-leaf-600 to-leaf-500">
                {isRegister ? <Sparkles className="h-4 w-4" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
                {isRegister ? "Create account" : "Sign in"}
              </Button>

              {isRegister && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-leaf-600 dark:text-leaf-300" aria-hidden />
                  Your password is hashed, never stored in plain text.
                </p>
              )}
            </form>

            <p className="mt-3 text-center text-xs text-muted">
              By continuing you agree to our{" "}
              <Link to="/terms" className="font-semibold text-leaf-700 hover:underline dark:text-leaf-300">
                Terms & conditions
              </Link>
              .
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-leaf-700 dark:text-leaf-300">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/register" className="font-bold text-leaf-700 dark:text-leaf-300">
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
