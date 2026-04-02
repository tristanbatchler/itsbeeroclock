import { Link } from "react-router-dom";
import {
  Menu as MenuIcon,
  X as XIcon,
  Sun,
  Moon,
  Shield,
  Text,
} from "lucide-react";
import { useState, useRef } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { useEscapeKey } from "../hooks/useEscapeKey";

// Bug G fix: replaced next-themes with simple localStorage pattern.
// The inline script in index.html already handles FOUC.
function useThemeToggle() {
  const [theme, setThemeState] = useState<string>(
    () => localStorage.getItem("vite-ui-theme") ?? "system"
  );
  const setTheme = (t: string) => {
    localStorage.setItem("vite-ui-theme", t);
    setThemeState(t);
    if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };
  return { theme, setTheme };
}

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useThemeToggle();

  useClickOutside(menuRef, () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  return (
    <div className="relative">
      <button
        className={`p-2 rounded-full bg-muted/60 hover:bg-muted transition-all duration-300 ${open ? "rotate-90" : "rotate-0"}`}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <XIcon className="size-6 text-foreground" /> : <MenuIcon className="size-6 text-foreground" />}
      </button>
      <div
        ref={menuRef}
        className={`absolute right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl py-2 px-4 z-50 min-w-40 flex flex-col gap-2 transition-all duration-200 origin-top-right ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"}`}
        style={{ top: "100%" }}
      >
        <button
          className="flex items-center gap-2 py-1 hover:underline cursor-pointer text-foreground"
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
            setOpen(false);
          }}
        >
          {theme === "dark" ? (
            <Sun className="size-4 text-foreground" />
          ) : (
            <Moon className="size-4 text-foreground" />
          )}
          Go {theme === "dark" ? "light" : "dark"}
        </button>
        <Link
          to="/privacy"
          className="flex items-center gap-2 py-1 hover:underline text-foreground"
          onClick={() => setOpen(false)}
        >
          <Shield className="size-4 text-foreground" /> Privacy
        </Link>
        <Link
          to="/tos"
          className="flex items-center gap-2 py-1 hover:underline text-foreground"
          onClick={() => setOpen(false)}
        >
          <Text className="size-4 text-foreground" /> Terms
        </Link>
      </div>
    </div>
  );
}
