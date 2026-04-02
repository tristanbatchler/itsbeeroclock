import { useState, useEffect } from "react";
import { type Drink } from "../types/drinks";
import { STORAGE_KEYS } from "../lib/constants";

function loadSession(): Drink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSession(drinks: Drink[]) {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(drinks));
}

export function useSession() {
  const [drinks, setDrinks] = useState<Drink[]>(loadSession);

  useEffect(() => {
    saveSession(drinks);
  }, [drinks]);

  const addDrink = (drink: Drink) => {
    setDrinks((prev) => [...prev, drink]);
  };

  const undoLast = () => {
    setDrinks((prev) => prev.slice(0, -1));
  };

  const removeDrink = (id: string) => {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
  };

  const clearSession = () => {
    saveSession([]);
    setDrinks([]);
  };

  const setAllDrinks = (newDrinks: Drink[]) => {
    setDrinks(newDrinks);
  };

  return {
    drinks,
    addDrink,
    removeDrink,
    undoLast,
    clearSession,
    setAllDrinks,
  };
}
