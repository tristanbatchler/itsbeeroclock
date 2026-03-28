import { Link } from "react-router-dom";
import {
  Menu as MenuIcon,
  X as XIcon,
  Sun,
  Moon,
  Shield,
  Text,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";

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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        className={`p-2 rounded-full bg-black/10 hover:bg-black/20 transition-all duration-300 ${open ? "rotate-90" : "rotate-0"}`}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>
      <div
        ref={menuRef}
        className={`absolute right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 px-4 z-50 min-w-40 flex flex-col gap-2 transition-all duration-200 origin-top-right ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"}`}
        style={{ top: "100%" }}
      >
        <button
          className="flex items-center gap-2 py-1 hover:underline cursor-pointer"
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
            setOpen(false);
          }}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          Go {theme === "dark" ? "light" : "dark"}
        </button>
        <Link
          to="/privacy"
          className="flex items-center gap-2 py-1 hover:underline"
          onClick={() => setOpen(false)}
        >
          <Shield className="size-4" /> Privacy
        </Link>
        <Link
          to="/tos"
          className="flex items-center gap-2 py-1 hover:underline"
          onClick={() => setOpen(false)}
        >
          <Text className="size-4" /> Terms
        </Link>
      </div>
    </div>
  );
}
