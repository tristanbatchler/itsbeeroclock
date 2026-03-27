import { Outlet, Link, useLocation } from 'react-router-dom';
import { Beer, User, History as HistoryIcon, Home as HomeIcon } from 'lucide-react';
import { AppMenu } from './components/AppMenu';
import { useState, useRef, useEffect } from 'react';

export function Root() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Track' },
    { path: '/history', icon: HistoryIcon, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-linear-to-br from-yellow-400 via-amber-400 to-yellow-500 dark:from-yellow-500 dark:via-yellow-400 dark:to-amber-500 text-zinc-900 shadow-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black/10 backdrop-blur-sm p-2 rounded-2xl">
                <Beer className="size-8" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Beer O'clock</h1>
                <p className="text-zinc-800 dark:text-zinc-900 text-xs font-medium">Queensland's Drink Tracker</p>
              </div>
            </div>
            <AppMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 border-t border-border shadow-2xl backdrop-blur-xl z-40">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1.5 py-3 px-6 transition-all rounded-2xl my-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`size-6 ${isActive ? 'animate-bounce' : ''}`} strokeWidth={2.5} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}