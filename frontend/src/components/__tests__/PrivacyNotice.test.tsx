import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrivacyNotice } from "../PrivacyNotice";
import { STORAGE_KEYS } from "../../lib/constants";

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
});

function renderNotice() {
  return render(
    <MemoryRouter>
      <PrivacyNotice />
    </MemoryRouter>,
  );
}

describe("PrivacyNotice", () => {
  it("renders when not dismissed", () => {
    renderNotice();
    expect(screen.getByText(/we value your privacy/i)).toBeInTheDocument();
  });

  it("does not render when already dismissed", () => {
    localStorage.setItem(STORAGE_KEYS.PRIVACY_DISMISSED, "1");
    renderNotice();
    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
  });

  it("hides and sets localStorage after clicking the X", async () => {
    renderNotice();
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.PRIVACY_DISMISSED)).toBe("1");
  });

  it("hides and sets localStorage after clicking the Privacy Policy link", async () => {
    renderNotice();
    await userEvent.click(screen.getByRole("link", { name: /privacy policy/i }));
    expect(screen.queryByText(/we value your privacy/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.PRIVACY_DISMISSED)).toBe("1");
  });
});
