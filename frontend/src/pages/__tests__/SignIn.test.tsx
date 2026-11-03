import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignIn } from "../SignIn";
import { API_ROUTES } from "../../lib/constants";

let online = true;
vi.mock("../../hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => online,
}));

function renderAt(path = "/sign-in") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SignIn />
    </MemoryRouter>,
  );
}

function setStandalone(value: boolean | undefined) {
  Object.defineProperty(window.navigator, "standalone", {
    value,
    configurable: true,
  });
}

const googleButton = () =>
  screen.queryByRole("button", { name: "Continue with Google" });

beforeEach(() => {
  online = true;
  setStandalone(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SignIn", () => {
  it("offers Google as the only sign-in method when online", () => {
    renderAt();

    expect(googleButton()).toBeEnabled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("navigates the full page to the backend when pressed", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    renderAt();

    await userEvent.click(googleButton()!);

    expect(assign).toHaveBeenCalledWith(API_ROUTES.GOOGLE_START);
  });

  it("disables the button with a message when offline", () => {
    online = false;
    renderAt();

    expect(googleButton()).toBeDisabled();
    expect(screen.getByText("Signing in needs a connection.")).toBeInTheDocument();
  });

  it("shows a plain message after a failed sign-in", () => {
    renderAt("/sign-in?error=failed");

    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in didn't work");
    expect(googleButton()).toBeEnabled();
  });

  it("shows no message after a cancel", () => {
    renderAt("/sign-in");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the Safari message instead of the button in the installed iOS app", () => {
    setStandalone(true);
    renderAt();

    expect(googleButton()).not.toBeInTheDocument();
    expect(screen.getByText(/open itsbeeroclock\.au in Safari/)).toBeInTheDocument();
  });

  it("treats standalone false as a normal browser", () => {
    setStandalone(false);
    renderAt();

    expect(googleButton()).toBeInTheDocument();
  });
});
