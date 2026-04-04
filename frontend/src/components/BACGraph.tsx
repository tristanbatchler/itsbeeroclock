import type { BACSnapshot } from "../types/drinks";

interface BACGraphProps {
  snapshots: BACSnapshot[];
  startTime: number;
  endTime: number;
  className?: string;
}

const VIEW_W = 600;
const VIEW_H = 220;
const PAD = { top: 20, right: 16, bottom: 30, left: 48 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

function xScale(t: number, startTime: number, endTime: number): number {
  if (endTime === startTime) return PAD.left;
  return PAD.left + ((t - startTime) / (endTime - startTime)) * PLOT_W;
}

function yScale(bac: number, maxY: number): number {
  return PAD.top + PLOT_H - (bac / maxY) * PLOT_H;
}

/** Build a polyline points string from an array of [x, y] pairs. */
function buildPoints(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function BACGraph({ snapshots, startTime, endTime, className }: BACGraphProps) {
  const hasData = snapshots.length > 0 && snapshots.some((s) => s.bac > 0);

  if (!hasData) {
    return (
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        aria-label="BAC graph — no data"
        className={className}
      >
        <text
          x={VIEW_W / 2}
          y={VIEW_H / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-muted-foreground)"
          fontSize="14"
        >
          No BAC data to display
        </text>
      </svg>
    );
  }

  const maxBAC = Math.max(...snapshots.map((s) => s.bac));
  // Y-max: at least the legal limit (0.05), or peak + 25% padding — whichever is higher
  const rawMax = Math.max(0.05, maxBAC * 1.25);
  // Round up to nearest 0.05 so ticks land cleanly
  const maxY = Math.ceil(rawMax / 0.05) * 0.05;

  // Y-axis ticks at 0.05 intervals
  const yTicks: number[] = [];
  for (let v = 0; v <= maxY + 0.001; v += 0.05) {
    yTicks.push(parseFloat(v.toFixed(2)));
  }

  // X-axis ticks at whole hours
  const durationHours = (endTime - startTime) / 3_600_000;
  const xTicks: number[] = [];
  for (let h = 0; h <= Math.floor(durationHours); h++) {
    xTicks.push(h);
  }

  // Peak snapshot
  const peakSnap = snapshots.reduce((best, s) => (s.bac > best.bac ? s : best), snapshots[0]);

  // Polyline points
  const pts: [number, number][] = snapshots.map((s) => [
    xScale(s.timestamp, startTime, endTime),
    yScale(s.bac, maxY),
  ]);
  const points = buildPoints(pts);

  // Reference line y = 0.05
  const refY = yScale(0.05, maxY);

  const peakX = xScale(peakSnap.timestamp, startTime, endTime);
  const peakY = yScale(peakSnap.bac, maxY);

  // Clamp peak label so it doesn't clip at the top
  const peakLabelY = Math.max(PAD.top + 10, peakY - 8);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      aria-label="BAC over time graph"
      className={className}
    >
      {/* Y-axis ticks */}
      {yTicks.map((v) => {
        const y = yScale(v, maxY);
        return (
          <g key={v}>
            <text
              x={PAD.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--color-muted-foreground)"
              fontSize="11"
            >
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* X-axis ticks */}
      {xTicks.map((h) => {
        const x = xScale(startTime + h * 3_600_000, startTime, endTime);
        return (
          <text
            key={h}
            x={x}
            y={VIEW_H - PAD.bottom + 16}
            textAnchor="middle"
            fill="var(--color-muted-foreground)"
            fontSize="11"
          >
            {h}h
          </text>
        );
      })}

      {/* Reference line at 0.05 */}
      <line
        x1={PAD.left}
        y1={refY}
        x2={VIEW_W - PAD.right}
        y2={refY}
        stroke="var(--color-muted-foreground)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <text
        x={VIEW_W - PAD.right - 4}
        y={refY - 5}
        textAnchor="end"
        fill="var(--color-muted-foreground)"
        fontSize="10"
      >
        0.05 limit
      </text>

      {/* BAC line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-info)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Peak dot */}
      <circle cx={peakX} cy={peakY} r="4" fill="var(--color-info)" />

      {/* Peak label */}
      <text
        x={peakX}
        y={peakLabelY}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="12"
        fontWeight="bold"
      >
        {peakSnap.bac.toFixed(2)}
      </text>
    </svg>
  );
}
