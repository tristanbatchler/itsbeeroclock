import { useMemo, useState } from "react";
import type {
  Beer,
  CheckInFeeling,
  CheckInQuestionKey,
  CheckInResponse,
  CheckInSocialContext,
  Drink,
  UserProfile,
} from "../types/drinks";
import { calculateTimeUntilSober, getStandardDrinks } from "../utils/calculations";
import { formatHours } from "../utils/time";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

interface NotesCheckInProps {
  isOpen: boolean;
  drink: Drink | null;
  drinks: Drink[];
  allBeers: Beer[];
  profile: UserProfile | null;
  onClose: () => void;
  onSubmit: (entry: CheckInResponse) => void;
}

const QUESTION_ORDER: CheckInQuestionKey[] = [
  "feelings",
  "intoxication",
  "hadWater",
  "hadFood",
  "socialContext",
  "timeUntilSoberConsent",
];

const FEELINGS: Array<{ value: CheckInFeeling; label: string }> = [
  { value: "happy", label: "Happy" },
  { value: "relaxed", label: "Relaxed" },
  { value: "social", label: "Social" },
  { value: "energetic", label: "Energetic" },
  { value: "tired", label: "Tired" },
  { value: "bored", label: "Bored" },
  { value: "anxious", label: "Anxious" },
  { value: "sad", label: "Sad" },
  { value: "nauseous", label: "Nauseous" },
  { value: "other", label: "Other" },
];

const INTOXICATION_OPTIONS = [
  { value: "not_at_all", label: "Not at all" },
  { value: "small_buzz", label: "I have a small buzz" },
  { value: "somewhat", label: "Somewhat" },
  { value: "very", label: "Very" },
  { value: "plastered", label: "I'm plastered" },
] as const;

function makeGetGramsAlcohol(allBeers: Beer[]) {
  return (drink: Drink): number => {
    const beer = allBeers.find((b) => b.id === drink.beerId);
    if (!beer) return 0;
    return getStandardDrinks(drink, beer) * 10;
  };
}

function formatElapsed(ms: number | null): string {
  if (ms === null) return "N/A";
  return formatHours(ms / 3_600_000);
}

function formatSober(ms: number | null): string {
  if (ms === null) return "N/A";
  return formatHours(ms / 3_600_000);
}

interface RedactedTimeProps {
  revealed: boolean;
  value: string;
  onReveal: () => void;
}

function RedactedTime({ revealed, value, onReveal }: RedactedTimeProps) {
  if (revealed) {
    return <span className="font-semibold text-foreground">{value}</span>;
  }

  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label="Reveal time since last drink"
      className="inline-flex items-center rounded-md bg-black px-2 py-0.5 text-black"
      title="Tap to reveal"
    >
      redacted
    </button>
  );
}

export function NotesCheckIn({
  isOpen,
  drink,
  drinks,
  allBeers,
  profile,
  onClose,
  onSubmit,
}: NotesCheckInProps) {
  if (!isOpen || !drink) return null;

  return (
    <NotesCheckInFlow
      key={drink.id}
      drink={drink}
      drinks={drinks}
      allBeers={allBeers}
      profile={profile}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface NotesCheckInFlowProps {
  drink: Drink;
  drinks: Drink[];
  allBeers: Beer[];
  profile: UserProfile | null;
  onClose: () => void;
  onSubmit: (entry: CheckInResponse) => void;
}

function NotesCheckInFlow({
  drink,
  drinks,
  allBeers,
  profile,
  onClose,
  onSubmit,
}: NotesCheckInFlowProps) {
  const [phase, setPhase] = useState<"prompt" | "questions">("prompt");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const previousDrink = useMemo(() => {
    const idx = drinks.findIndex((d) => d.id === drink.id);
    if (idx <= 0) return null;
    return drinks[idx - 1];
  }, [drinks, drink]);

  const lastDrinkDeltaMs = previousDrink ? drink.timestamp - previousDrink.timestamp : null;

  const [draft, setDraft] = useState<CheckInResponse>(() => {
    const getGramsAlcohol = makeGetGramsAlcohol(allBeers);
    const sober = profile
      ? calculateTimeUntilSober(drinks, profile, openedAt, getGramsAlcohol)
      : { hoursUntilSober: null };
    const timeUntilSoberMs =
      sober.hoursUntilSober === null
        ? null
        : Math.max(0, Math.round(sober.hoursUntilSober * 3_600_000));

    return {
      id: window.crypto.randomUUID(),
      timestamp: openedAt,
      drinkId: drink.id,
      lastDrinkDeltaMs,
      lastDrinkDeltaWasRevealed: false,
      feelings: [],
      feelingsOtherText: "",
      timeUntilSoberMs,
      isComplete: false,
      skippedQuestionKeys: [],
    };
  });

  const currentQuestion = QUESTION_ORDER[questionIndex];
  const isLastQuestion = questionIndex === QUESTION_ORDER.length - 1;

  const goToNextQuestion = () => {
    if (isLastQuestion) {
      const skipped = draft.skippedQuestionKeys ?? [];
      const isComplete =
        skipped.length === 0 &&
        draft.feelings.length > 0 &&
        !!draft.intoxication &&
        typeof draft.hadWater === "boolean" &&
        typeof draft.hadFood === "boolean" &&
        !!draft.socialContext &&
        typeof draft.timeUntilSoberConsent === "boolean";

      onSubmit({
        ...draft,
        isComplete,
        timestamp: Date.now(),
        lastDrinkDeltaWasRevealed: revealed,
      });
      onClose();
      return;
    }

    setQuestionIndex((idx) => idx + 1);
  };

  const skipCurrentQuestion = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const skipped = new Set(prev.skippedQuestionKeys ?? []);
      skipped.add(currentQuestion);
      return {
        ...prev,
        skippedQuestionKeys: Array.from(skipped),
      };
    });
    setShowCloseConfirm(false);
    goToNextQuestion();
  };

  const stopAndSavePartial = () => {
    onSubmit({
      ...draft,
      isComplete: false,
      timestamp: Date.now(),
      lastDrinkDeltaWasRevealed: revealed,
    });
    setShowCloseConfirm(false);
    onClose();
  };

  const handleQuestionClose = () => {
    setShowCloseConfirm(true);
  };

  const updateSocialContext = (value: CheckInSocialContext) => {
    setDraft((prev) => (prev ? { ...prev, socialContext: value } : prev));
  };

  const renderQuestion = () => {
    switch (currentQuestion) {
      case "feelings":
        return (
          <div className="space-y-4">
            <p className="text-lg font-bold text-foreground">
              How are you feeling right now? Select all that apply.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FEELINGS.map((f) => {
                const selected = draft.feelings.includes(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                    onClick={() => {
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const has = prev.feelings.includes(f.value);
                        const feelings = has
                          ? prev.feelings.filter((x) => x !== f.value)
                          : [...prev.feelings, f.value];
                        return { ...prev, feelings };
                      });
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {draft.feelings.includes("other") && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Other (optional)
                </label>
                <Input
                  value={draft.feelingsOtherText ?? ""}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, feelingsOtherText: e.target.value } : prev,
                    )
                  }
                  placeholder="Share if you want"
                />
              </div>
            )}
          </div>
        );

      case "intoxication":
        return (
          <div className="space-y-4">
            <p className="text-lg font-bold text-foreground">How intoxicated do you feel right now?</p>
            <div className="grid gap-2">
              {INTOXICATION_OPTIONS.map((opt) => {
                const selected = draft.intoxication === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                    onClick={() =>
                      setDraft((prev) =>
                        prev ? { ...prev, intoxication: opt.value } : prev,
                      )
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "hadWater":
        return (
          <BinaryQuestion
            title="Did you have any water since your last drink?"
            value={draft.hadWater}
            onSelect={(value) =>
              setDraft((prev) => (prev ? { ...prev, hadWater: value } : prev))
            }
          />
        );

      case "hadFood":
        return (
          <BinaryQuestion
            title="Did you eat anything since your last drink?"
            value={draft.hadFood}
            onSelect={(value) =>
              setDraft((prev) => (prev ? { ...prev, hadFood: value } : prev))
            }
          />
        );

      case "socialContext":
        return (
          <div className="space-y-4">
            <p className="text-lg font-bold text-foreground">Are you currently drinking alone or with others?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  draft.socialContext === "alone"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => updateSocialContext("alone")}
              >
                Alone
              </button>
              <button
                type="button"
                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  draft.socialContext === "with_others"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => updateSocialContext("with_others")}
              >
                With others
              </button>
            </div>
          </div>
        );

      case "timeUntilSoberConsent":
        return (
          <BinaryQuestion
            title={`If you stop drinking now, it will take ${formatSober(draft.timeUntilSoberMs)} for you to be sober again. Does that sound good to you?`}
            value={draft.timeUntilSoberConsent}
            onSelect={(value) =>
              setDraft((prev) =>
                prev ? { ...prev, timeUntilSoberConsent: value } : prev,
              )
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {phase === "prompt" && (
        <Modal isOpen={true} onClose={onClose} title="Quick check-in">
          <div className="space-y-4">
            <p className="text-lg font-bold text-foreground">Hey! Are you open to a quick check-in?</p>
            <p className="text-sm text-muted-foreground">
              It has been {" "}
              <RedactedTime
                revealed={revealed}
                value={formatElapsed(lastDrinkDeltaMs)}
                onReveal={() => setRevealed(true)}
              />{" "}
              since your last drink.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                No
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setPhase("questions")}>
                Yes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {phase === "questions" && (
        <Modal
          isOpen={true}
          onClose={handleQuestionClose}
          title={`Check-in ${questionIndex + 1}/${QUESTION_ORDER.length}`}
        >
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              It has been {" "}
              <RedactedTime
                revealed={revealed}
                value={formatElapsed(lastDrinkDeltaMs)}
                onReveal={() => setRevealed(true)}
              />{" "}
              since your last drink.
            </div>

            {renderQuestion()}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={skipCurrentQuestion}>
                Skip
              </Button>
              <Button variant="primary" className="flex-1" onClick={goToNextQuestion}>
                {isLastQuestion ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Stop check-in?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Do you want to stop answering all questions, or just skip this one?
          </p>
          <div className="grid gap-2">
            <Button variant="destructive" onClick={stopAndSavePartial}>
              Stop all questions
            </Button>
            <Button variant="outline" onClick={skipCurrentQuestion}>
              Skip this question
            </Button>
            <Button variant="ghost" onClick={() => setShowCloseConfirm(false)}>
              Continue check-in
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

interface BinaryQuestionProps {
  title: string;
  value: boolean | undefined;
  onSelect: (value: boolean) => void;
}

function BinaryQuestion({ title, value, onSelect }: BinaryQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-bold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            value === true
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          }`}
          onClick={() => onSelect(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            value === false
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          }`}
          onClick={() => onSelect(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}
