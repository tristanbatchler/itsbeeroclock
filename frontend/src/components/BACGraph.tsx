import type { BACSnapshot } from "../types/drinks";

interface BACGraphProps {
  snapshots: BACSnapshot[];
  startTime: number;
  endTime: number;
  className?: string;
}

const VIEW_W = 600;
const VIEW_H = 200;
const PAD = { top: 10, right: 10, bottom: 24, left: 40 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

function xScale(t: number, startTime: number, endTime: number): number {
  if (endTime === startTime) return PAD.left;
  return PAD.left + ((t - startTime) / (endTime - startTime)) * PLOT_W;
}

function yScale(bac: number, maxY: number): number {
  return PAD.top + PLOT_H - (bac / maxY) * PLOT_H;
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
  const maxY = Math.max(0.15, maxBAC * 1.2);

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

  // Line path
  const points = snapshots
    .map((s) => `${xScale(s.timestamp, startTime, endTime).toFixed(1)},${yScale(s.bac, maxY).toFixed(1)}`)
    .join(" ");

  // Reference line y = 0.05
  const refY = yScale(0.05, maxY);

  const peakX = xScale(peakSnap.timestamp, startTime, endTime);
  const peakY = yScale(peakSnap.bac, maxY);

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
              x={PAD.left - 4}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--color-muted-foreground)"
              fontSize="9"
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
            y={VIEW_H - PAD.bottom + 12}
            textAnchor="middle"
            fill="var(--color-muted-foreground)"
            fontSize="9"
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
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text
        x={VIEW_W - PAD.right - 2}
        y={refY - 3}
        textAnchor="end"
        fill="var(--color-muted-foreground)"
        fontSize="8"
      >
        0.05 limit
      </text>

      {/* BAC line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Peak annotation */}
      <circle cx={peakX} cy={peakY} r="3" fill="var(--color-primary)" />
      <text
        x={peakX}
        y={peakY - 6}
        textAnchor="middle"
        fill="var(--color-foreground)"
        fontSize="9"
        fontWeight="bold"
      >
        {peakSnap.bac.toFixed(2)}
      </text>
    </svg>
  );
}
