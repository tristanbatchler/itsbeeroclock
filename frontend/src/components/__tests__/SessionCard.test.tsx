import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionCard } from "../SessionCard";
import type { SessionArchive, Beer, CheckInResponse } from "../../types/drinks";

const BEER: Beer = { id: "b1", name: "Test Lager", abv: 4.5 };
const T0 = 1_700_000_000_000;

function makeArchive(overrides: Partial<SessionArchive> = {}): SessionArchive {
  return {
    startTimestamp: T0,
    endTimestamp: T0 + 7_200_000,
    durationMinutes: 120,
    totalStandardDrinks: 3,
    peakBAC: 0.08,
    drinks: [{ id: "d1", beerId: "b1", size: "pot", timestamp: T0 }],
    ...overrides,
  };
}

function makeCheckIn(id: string): CheckInResponse {
  return {
    id,
    timestamp: T0 + 60_000,
    drinkId: "d1",
    lastDrinkDeltaMs: 600_000,
    lastDrinkDeltaWasRevealed: false,
    feelings: ["happy"],
    intoxication: "somewhat",
    hadWater: true,
    hadFood: true,
    socialContext: "with_others",
    timeUntilSoberMs: 3_600_000,
    timeUntilSoberConsent: true,
    isComplete: true,
    skippedQuestionKeys: [],
  };
}

describe("SessionCard — BACGraph conditional rendering", () => {
  it("does not render BACGraph when bacCurve is absent", async () => {
    const archive = makeArchive({ bacCurve: undefined });
    render(<SessionCard archive={archive} allBeers={[BEER]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("img", { name: /bac.*graph/i })).not.toBeInTheDocument();
    // svg with aria-label containing "BAC" should not be present
    expect(document.querySelector('svg[aria-label*="BAC over time"]')).toBeNull();
  });

  it("does not render BACGraph when bacCurve is all zeros", async () => {
    const archive = makeArchive({
      bacCurve: [
        { timestamp: T0, bac: 0 },
        { timestamp: T0 + 300_000, bac: 0 },
      ],
    });
    render(<SessionCard archive={archive} allBeers={[BEER]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(document.querySelector('svg[aria-label="BAC over time graph"]')).toBeNull();
  });

  it("renders BACGraph when expanded and bacCurve has non-zero values", async () => {
    const archive = makeArchive({
      bacCurve: [
        { timestamp: T0, bac: 0.05 },
        { timestamp: T0 + 300_000, bac: 0.08 },
      ],
    });
    render(<SessionCard archive={archive} allBeers={[BEER]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(document.querySelector('svg[aria-label="BAC over time graph"]')).toBeInTheDocument();
  });

  it("does not render BACGraph when collapsed even with valid bacCurve", () => {
    const archive = makeArchive({
      bacCurve: [{ timestamp: T0, bac: 0.08 }],
    });
    render(<SessionCard archive={archive} allBeers={[BEER]} />);
    // not expanded — graph should not be in DOM
    expect(document.querySelector('svg[aria-label="BAC over time graph"]')).toBeNull();
  });

  it("renders check-ins in expanded view", async () => {
    const archive = makeArchive({
      checkIns: [makeCheckIn("c1")],
    });
    render(<SessionCard archive={archive} allBeers={[BEER]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Notes Check-Ins")).toBeInTheDocument();
    expect(screen.getByText(/Feelings: happy/i)).toBeInTheDocument();
  });

  it("requires confirmation before deleting a check-in", async () => {
    const archive = makeArchive({
      checkIns: [makeCheckIn("c1"), makeCheckIn("c2")],
    });
    const updates: SessionArchive[] = [];

    render(
      <SessionCard
        archive={archive}
        allBeers={[BEER]}
        onUpdateArchive={async (updated) => {
          updates.push(updated);
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    expect(screen.getByText("Delete check-in?")).toBeInTheDocument();
    expect(updates).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: /delete check-in/i }));

    await waitFor(() => {
      expect(updates).toHaveLength(1);
    });
    expect(updates[0].checkIns).toHaveLength(1);
  });
});
