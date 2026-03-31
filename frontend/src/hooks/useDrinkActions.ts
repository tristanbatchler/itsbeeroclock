import { api } from "../lib/api";
import { type Drink, type DrinkSize, type UserProfile } from "../types/drinks";

interface UseDrinkActionsOptions {
  drinks: Drink[];
  profile: UserProfile | null;
  addDrink: (drink: Drink) => void;
  removeDrink: (id: string) => void;
  undoLast: () => void;
  clearSession: () => void;
}

/**
 * Wraps session mutations with their corresponding cloud operations.
 * Each action updates local state first, then fires the API call
 * as a side-effect (fire-and-forget with error logging).
 */
export function useDrinkActions({
  drinks,
  profile,
  addDrink,
  removeDrink,
  undoLast,
  clearSession,
}: UseDrinkActionsOptions) {
  const optIn = profile?.optInHistory ?? false;

  const handleAddDrink = async (drink: Drink) => {
    addDrink(drink);
    if (optIn) {
      try {
        await api.addDrink(drink);
      } catch (err) {
        console.error("Failed to back up drink to cloud:", err);
      }
    }
  };

  const handleRemoveDrink = (id: string) => {
    const drink = drinks.find((d) => d.id === id);
    removeDrink(id);
    if (optIn && drink) {
      api.deleteDrink(drink.id, drink.timestamp).catch(console.error);
    }
  };

  const handleUndoLast = () => {
    if (drinks.length === 0) return;
    const last = drinks[drinks.length - 1];
    undoLast();
    if (optIn && last) {
      api.deleteDrink(last.id, last.timestamp).catch(console.error);
    }
  };

  const handleClearSession = () => {
    const all = [...drinks];
    clearSession();
    if (optIn) {
      Promise.all(all.map((d) => api.deleteDrink(d.id, d.timestamp))).catch(
        console.error,
      );
    }
  };

  const handleRepeatDrink = async (drinkToCopy: Drink, newSize: DrinkSize) => {
    const newDrink: Drink = {
      id: window.crypto.randomUUID(),
      beerId: drinkToCopy.beerId,
      size: newSize,
      timestamp: Date.now(),
    };
    await handleAddDrink(newDrink);
  };

  return {
    handleAddDrink,
    handleRemoveDrink,
    handleUndoLast,
    handleClearSession,
    handleRepeatDrink,
  };
}
