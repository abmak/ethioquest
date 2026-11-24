import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Brain, Compass, LayoutDashboard, LogOut, MessageCircle, Sparkles, Users } from "lucide-react";
import { BrandLockup } from "./components/Brand";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { PageLoader } from "./components/ui";
import { useAuth } from "./store/auth";
import { useI18n } from "./store/i18n";
import { api } from "./lib/api";
import { tt } from "./lib/i18n";
import { cn, initials } from "./lib/utils";
import { AuthPage } from "./pages/Auth";
import { QuizPage } from "./pages/Quiz";
import { TravelPage, DestinationPage } from "./pages/Travel";
import { ExperiencesPage, ExperienceDetailPage, NewExperiencePage } from "./pages/Experiences";
import { AdminPage } from "./pages/Admin";
import { MessagesPage, PeoplePage, ProfilePage } from "./pages/Social";
import { TermsPage } from "./pages/Terms";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status !== "ready") return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/**
 * Any role whose permission list is non-empty may open the console; the API
 * still checks each capability, and the console hides the tabs it lacks.
 */
function isStaff(user: { role: string; permissions?: string[] } | null): boolean {
  if (!user) return false;
  if (user.permissions) return user.permissions.length > 0;
  return user.role === "ADMIN" || user.role === "MODERATOR";
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  if (status !== "ready") return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff(user)) return <Navigate to="/quiz" replace />;
  return <>{children}</>;
}

const TABS = [
  { to: "/quiz", label: "Know Ethiopia", icon: Brain, tint: "from-leaf-300 to-leaf-500" },
  { to: "/travel", label: "Places to Visit", icon: Compass, tint: "from-leaf-200 to-leaf-400" },
  { to: "/experiences", label: "Share", icon: Sparkles, tint: "from-leaf-300 to-leaf-600" },
  { to: "/messages", label: "Messages", icon: MessageCircle, tint: "from-leaf-200 to-leaf-500" },
  { to: "/people", label: "People", icon: Users, tint: "from-leaf-300 to-leaf-400" },
] as const;

function AppChrome({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const isAdmin = isStaff(user);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () =>
      api
        .get<{ count: number }>("/api/social/messages/unread")
        .then((res) => {
          if (active) setUnread(res.data.count);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/80 shadow-[0_10px_30px_-22px_rgba(16,24,20,0.55)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <Link to="/quiz" className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500" aria-label="Ethio Quest home">
            <BrandLockup size="md" />
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            {isAdmin && (
              <Link
                to="/admin"
                // Phones matter as much as desktops here: the console is the only
                // place to manage the queue and members, so the entry stays
                // visible at every width and only the label is dropped on the
                // narrowest screens.
                className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-xl border border-leaf-300/60 bg-leaf-50 text-xs font-semibold text-leaf-700 transition hover:bg-leaf-100 sm:w-auto sm:px-3 dark:border-leaf-400/30 dark:bg-leaf-500/10 dark:text-leaf-200"
                aria-label="Admin dashboard"
                title="Admin dashboard"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {user && (
              <Link
                to="/people"
                className="avatar-ring hidden rounded-full sm:block"
                aria-label="Your profile and people"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-bold text-ink">
                  {initials(user.displayName)}
                </span>
              </Link>
            )}
            {user && (
              <button
                type="button"
                onClick={() => void logout()}
                className="icon-tile h-9 w-9 hover:border-rose-300 hover:text-rose-600"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="eth-band h-[3px]" aria-hidden />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 animate-slide-up px-4 pb-32 pt-5">
        {children}
        <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <span>Ethio Quest</span>
          <span aria-hidden>·</span>
          <Link to="/terms" className="font-semibold transition hover:text-ink hover:underline">
            Terms & conditions
          </Link>
        </footer>
      </main>

      <nav className="fixed inset-x-0 bottom-3 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[1.75rem] border border-line/80 bg-surface/90 p-1.5 shadow-[0_20px_50px_-24px_rgba(16,24,20,0.65)] backdrop-blur-xl">
          {TABS.map(({ to, label, icon: Icon, tint }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-center text-[9px] font-semibold leading-tight transition-all duration-200 sm:text-[11px]",
                    isActive
                      ? `-translate-y-0.5 bg-gradient-to-br ${tint} text-leaf-950 shadow-lg shadow-leaf-500/25`
                      : "text-muted hover:bg-raised hover:text-ink active:scale-95",
                  )
                }
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" aria-hidden />
                  {to === "/messages" && unread > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {tt(label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppChrome>{children}</AppChrome>
    </RequireAuth>
  );
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  // Every screen renders its copy through tt(), which reads the module-level
  // language. Subscribing here re-renders the whole tree when it changes, so a
  // language pick takes effect immediately instead of after a reload.
  const lang = useI18n((s) => s.lang);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <ErrorBoundary>
      <div data-lang={lang} className="contents">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<Navigate to="/quiz" replace />} />
          <Route path="/quiz" element={<Shell><QuizPage /></Shell>} />
          <Route path="/travel" element={<Shell><TravelPage /></Shell>} />
          <Route path="/travel/:slug" element={<Shell><DestinationPage /></Shell>} />
          <Route path="/experiences" element={<Shell><ExperiencesPage /></Shell>} />
          <Route path="/experiences/new" element={<Shell><NewExperiencePage /></Shell>} />
          <Route path="/experiences/:id" element={<Shell><ExperienceDetailPage /></Shell>} />
          <Route path="/messages" element={<Shell><MessagesPage /></Shell>} />
          <Route path="/messages/:userId" element={<Shell><MessagesPage /></Shell>} />
          <Route path="/people" element={<Shell><PeoplePage /></Shell>} />
          <Route path="/u/:username" element={<Shell><ProfilePage /></Shell>} />
          {/* Public, so the terms are readable before signing up or signing in. */}
          <Route path="/terms" element={<AppChrome><TermsPage /></AppChrome>} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AppChrome>
                  <AdminPage />
                </AppChrome>
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/quiz" replace />} />
        </Routes>
      </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}
