import { Link } from 'react-router-dom';
import { Shield, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const PRIVACY_DISMISSED_KEY = 'beeroclock_privacy_dismissed';


export function PrivacyNotice() {
  const [visible, setVisible] = useState(true); // default to visible

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(PRIVACY_DISMISSED_KEY);
      setVisible(!dismissed);
    } catch (e) {
      // If localStorage is unavailable (e.g. private mode), always show
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(PRIVACY_DISMISSED_KEY, '1');
    } catch (e) {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-2xl px-4 py-2 mt-2 mb-4 shadow-sm animate-fade-in">
      <Shield className="size-4 text-amber-600 dark:text-amber-200" />
      <span className="text-xs text-amber-900 dark:text-amber-100">
        We value your privacy. <Link to="/privacy" className="underline hover:text-amber-700 dark:hover:text-amber-300 font-semibold">Read our Privacy Policy</Link>
      </span>
      <button onClick={handleDismiss} className="ml-auto p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition" aria-label="Dismiss">
        <X className="size-4 text-amber-600 dark:text-amber-200" />
      </button>
    </div>
  );
}
