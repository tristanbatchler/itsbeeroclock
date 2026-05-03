export interface UserProfile {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  sex: "male" | "female";
  optInHistory: boolean;
  favouriteBeerIds?: string[];
  /** false until the user explicitly saves their profile */
  profileSetup: boolean;
}

export const DRINK_SIZES = {
  pot: 285,
  schooner: 425,
  pint: 570,
  jug: 1140,
  tinnie: 375,
  bottle330: 330,
  bottle375: 375,
  longneck: 750,
} as const;

export type DrinkSize = keyof typeof DRINK_SIZES;

export const DRINK_LABELS: Record<DrinkSize, string> = {
  pot: "Pot",
  schooner: "Schooner",
  pint: "Pint",
  jug: "Jug",
  tinnie: "Tinnie",
  bottle330: "330ml Bottle",
  bottle375: "375ml Stubby",
  longneck: "Longneck",
};

export interface Beer {
  id: string;
  name: string;
  brewery?: string;
  abv: number; // percent
  image?: string;
  isCustom?: boolean;
}

export interface Drink {
  id: string;
  beerId: string;
  size: DrinkSize;
  timestamp: number;
}

export interface BACSnapshot {
  timestamp: number;
  bac: number;
}

export type CheckInFeeling =
  | "happy"
  | "relaxed"
  | "social"
  | "energetic"
  | "tired"
  | "bored"
  | "anxious"
  | "sad"
  | "nauseous"
  | "other";

export type CheckInIntoxication =
  | "not_at_all"
  | "small_buzz"
  | "somewhat"
  | "very"
  | "plastered";

export type CheckInSocialContext = "alone" | "with_others";

export type CheckInQuestionKey =
  | "feelings"
  | "intoxication"
  | "hadWater"
  | "hadFood"
  | "socialContext"
  | "timeUntilSoberConsent";

export interface CheckInResponse {
  id: string;
  timestamp: number;
  drinkId: string;
  lastDrinkDeltaMs: number | null;
  lastDrinkDeltaWasRevealed: boolean;
  feelings: CheckInFeeling[];
  feelingsOtherText?: string;
  intoxication?: CheckInIntoxication;
  hadWater?: boolean;
  hadFood?: boolean;
  socialContext?: CheckInSocialContext;
  timeUntilSoberMs: number | null;
  timeUntilSoberConsent?: boolean;
  isComplete: boolean;
  skippedQuestionKeys?: CheckInQuestionKey[];
}

export interface SessionArchive {
  startTimestamp: number; // epoch ms — first drink timestamp
  endTimestamp: number; // epoch ms — last drink timestamp + 7_200_000
  durationMinutes: number; // (endTimestamp - startTimestamp) / 60_000
  totalStandardDrinks: number;
  peakBAC: number;
  drinks: Drink[];
  bacCurve?: BACSnapshot[];
  checkIns?: CheckInResponse[];
}
