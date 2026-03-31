import { Outlet, Link, useLocation } from "react-router-dom";
import { User, History as HistoryIcon, Home as HomeIcon } from "lucide-react";
import { AppMenu } from "./components/AppMenu";
import { useRef, useEffect, useReducer } from "react";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { InitialLoading } from "./components/InitialLoading";
import { useInitialLoad } from "./hooks/useInitialLoad";

export function Root() {
  const location = useLocation();
  const [bounceKey, triggerBounce] = useReducer((k) => k + 1, 0);
  const prevPathRef = useRef(location.pathname);

  const isOnline = useOnlineStatus();
  const { isLoading: isInitialLoading, initialLoadFailed } = useInitialLoad();
  const showOfflineBanner = initialLoadFailed || !isOnline;

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      triggerBounce();
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const navItems = [
    { path: "/", icon: HomeIcon, label: "Track" },
    { path: "/history", icon: HistoryIcon, label: "History" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-primary bg-linear-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground shadow-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <div className="bg-primary/10 backdrop-blur-sm p-2 rounded-2xl">
                  <img
                    src="/favicon.png"
                    alt="Logo"
                    className="w-8 h-8 rounded-xl"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Beer O'Clock
                  </h1>
                  <p className="text-muted-foreground text-xs font-medium">
                    Queensland's Simple Drink Tracker
                  </p>
                </div>
              </Link>
            </div>
            <AppMenu />
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {!isInitialLoading && showOfflineBanner && (
        <div className="bg-destructive text-destructive-foreground text-center py-2 text-xs font-bold">
          Offline: Changes will sync when reconnected
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {isInitialLoading ? (
          <InitialLoading />
        ) : (
          <Outlet />
        )}
      </main>

      {/* Bottom navigation */}
      {!isInitialLoading && (
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 border-t border-border shadow-2xl backdrop-blur-xl z-40">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const bounce = bounceKey > 0 && isActive;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1.5 py-3 px-6 transition-all rounded-2xl my-2 ${
                    isActive
                      ? "bg-primary/20 text-primary-foreground shadow-lg scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon
                    className={`size-6${bounce ? " animate-bounce-short" : ""}`}
                    strokeWidth={2.5}
                  />
                  <span className="text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      )}
    </div>
  );
}
