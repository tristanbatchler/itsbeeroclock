import { Link } from 'react-router-dom';
import { Menu as MenuIcon, X as XIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        className="p-2 rounded-full bg-black/10 hover:bg-black/20 transition-all"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>
      <div
        ref={menuRef}
        className={`absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 px-4 z-50 min-w-40 flex flex-col gap-2 transition-all duration-200 origin-top-right ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}`}
        style={{ top: '100%' }}
      >
        <button
          className="flex items-center gap-2 py-1 hover:underline"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>Toggle Theme</span>
        </button>
        <Link to="/privacy" className="hover:underline py-1" onClick={() => setOpen(false)}>Privacy</Link>
        <Link to="/tos" className="hover:underline py-1" onClick={() => setOpen(false)}>Terms of Service</Link>
      </div>
    </div>
  );
}
