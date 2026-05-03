import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesCheckIn } from "../NotesCheckIn";
import type { Beer, Drink, UserProfile, CheckInResponse } from "../../types/drinks";

const BEER: Beer = { id: "b1", name: "Test Lager", abv: 4.5 };
const PROFILE: UserProfile = {
  weight: 80,
  height: 180,
  age: 34,
  sex: "male",
  optInHistory: true,
  profileSetup: true,
};
const T0 = 1_700_000_000_000;

function makeDrink(id: string, timestamp: number): Drink {
  return {
    id,
    beerId: "b1",
    size: "pot",
    timestamp,
  };
}

describe("NotesCheckIn", () => {
  it("shows N/A when there is no previous drink and reveals it on demand", async () => {
    const drink = makeDrink("d1", T0);
    render(
      <NotesCheckIn
        isOpen={true}
        drink={drink}
        drinks={[drink]}
        allBeers={[BEER]}
        profile={PROFILE}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText(/it has been/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reveal time since last drink/i }));
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText(/since your last drink/i)).toBeInTheDocument();
  });

  it("opens close confirmation and can stop all with partial save", async () => {
    const drink1 = makeDrink("d1", T0);
    const drink2 = makeDrink("d2", T0 + 600_000);
    const onSubmit = vi.fn<(entry: CheckInResponse) => void>();
    const onClose = vi.fn();

    render(
      <NotesCheckIn
        isOpen={true}
        drink={drink2}
        drinks={[drink1, drink2]}
        allBeers={[BEER]}
        profile={PROFILE}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.getByText(/stop check-in\?/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /stop all questions/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].isComplete).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });
});
