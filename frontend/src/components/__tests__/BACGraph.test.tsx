import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as fc from "fast-check";
import { BACGraph } from "../BACGraph";
import type { BACSnapshot } from "../../types/drinks";

const T0 = 1_700_000_000_000;

function snap(offsetMs: number, bac: number): BACSnapshot {
  return { timestamp: T0 + offsetMs, bac };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("BACGraph — unit tests", () => {
  it("renders empty state when snapshots is empty", () => {
    render(<BACGraph snapshots={[]} startTime={T0} endTime={T0 + 3_600_000} />);
    expect(screen.getByText(/no bac data/i)).toBeInTheDocument();
  });

  it("renders empty state when all bac values are zero", () => {
    render(
      <BACGraph
        snapshots={[snap(0, 0), snap(300_000, 0)]}
        startTime={T0}
        endTime={T0 + 300_000}
      />,
    );
    expect(screen.getByText(/no bac data/i)).toBeInTheDocument();
  });

  it("renders svg with width=100% for valid snapshots", () => {
    const { container } = render(
      <BACGraph
        snapshots={[snap(0, 0.05), snap(300_000, 0.08)]}
        startTime={T0}
        endTime={T0 + 300_000}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("width")).toBe("100%");
  });

  it("renders dashed reference line at 0.05", () => {
    const { container } = render(
      <BACGraph
        snapshots={[snap(0, 0.1), snap(300_000, 0.08)]}
        startTime={T0}
        endTime={T0 + 300_000}
      />,
    );
    const dashed = container.querySelector("line[stroke-dasharray]");
    expect(dashed).toBeInTheDocument();
    expect(screen.getByText("0.05 limit")).toBeInTheDocument();
  });

  it("renders peak BAC annotation label", () => {
    render(
      <BACGraph
        snapshots={[snap(0, 0.05), snap(300_000, 0.12), snap(600_000, 0.08)]}
        startTime={T0}
        endTime={T0 + 600_000}
      />,
    );
    expect(screen.getByText("0.12")).toBeInTheDocument();
  });
});

// ── Property tests ────────────────────────────────────────────────────────────

const NUM_RUNS = 25;

// Feature: bac-graph, Property 5: Peak BAC annotation is present and correct
describe("Property 5 — peak BAC annotation is correct", () => {
  it("annotation label equals max BAC formatted to 2dp", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            offsetMs: fc.integer({ min: 0, max: 7_200_000 }),
            bac: fc.float({ min: 0.01, max: 0.3, noNaN: true }),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        (items) => {
          const snapshots = items.map((x) => snap(x.offsetMs, x.bac));
          const maxBac = Math.max(...snapshots.map((s) => s.bac));
          const startTime = T0;
          const endTime = T0 + 7_200_000;

          const { getByText } = render(
            <BACGraph snapshots={snapshots} startTime={startTime} endTime={endTime} />,
          );
          expect(getByText(maxBac.toFixed(2))).toBeInTheDocument();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// Feature: bac-graph, Property 6: Axis labels reflect session time range and BAC range
describe("Property 6 — axis labels reflect time range and BAC range", () => {
  it("x-axis has labels 0h through floor(durationHours)h, y-axis has 0.05 interval labels", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }), // duration in hours
        fc.float({ min: 0.06, max: 0.25, noNaN: true }), // peak BAC
        (durationHours, peakBac) => {
          const endTime = T0 + durationHours * 3_600_000;
          const snapshots = [snap(0, peakBac), snap(durationHours * 3_600_000, 0.01)];

          const { getAllByText, getByText } = render(
            <BACGraph snapshots={snapshots} startTime={T0} endTime={endTime} />,
          );

          // x-axis: 0h through durationHours h
          for (let h = 0; h <= durationHours; h++) {
            expect(getAllByText(`${h}h`).length).toBeGreaterThan(0);
          }

          // y-axis: at least 0.00 label present
          expect(getByText("0.00")).toBeInTheDocument();
          // and 0.05 label
          expect(getByText("0.05")).toBeInTheDocument();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
