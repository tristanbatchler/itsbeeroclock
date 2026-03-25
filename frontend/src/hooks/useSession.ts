import { useState, useEffect } from 'react';
import { type Drink } from '../types/drinks';

const SESSION_KEY = 'beeroclock_session';

function loadSession(): Drink[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSession(drinks: Drink[]) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(drinks));
}

export function useSession() {
  const [drinks, setDrinks] = useState<Drink[]>(loadSession);

  useEffect(() => {
    saveSession(drinks);
  }, [drinks]);

  const addDrink = (drink: Drink) => {
    setDrinks(prev => [...prev, drink]);
  };

  const undoLast = () => {
    setDrinks(prev => prev.slice(0, -1));
  };

  const removeDrink = (id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id));
  };

  const clearSession = () => {
    setDrinks([]);
  };

  return { drinks, addDrink, removeDrink, undoLast, clearSession };
}