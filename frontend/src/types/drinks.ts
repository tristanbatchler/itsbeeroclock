
export interface UserProfile {
  gender: 'male' | 'female';
  weight: number;
  optInHistory: boolean;
}

export const DRINK_SIZES = {
  pot: 285,
  schooner: 425,
  pint: 570,
  jug: 1140,
  tinnie: 375,
  can440: 440,
  bottle330: 330,
  bottle375: 375,
  longneck: 750,
} as const;

export type DrinkSize = keyof typeof DRINK_SIZES;

export const DRINK_LABELS: Record<DrinkSize, string> = {
  pot: 'Pot',
  schooner: 'Schooner',
  pint: 'Pint',
  jug: 'Jug',
  tinnie: 'Tinnie',
  can440: 'Can 440ml',
  bottle330: '330ml Bottle',
  bottle375: '375ml Stubby',
  longneck: 'Longneck',
};



export interface Beer {
  id: string;
  name: string;
  brewery?: string;
  abv: number; // percent
  imageUrl?: string;
  isCustom?: boolean;
}

export interface Drink {
  id: string;
  beerId: string;
  size: DrinkSize;
  timestamp: number;
}
