# Requirements Document

## Introduction

The BAC Graph feature adds a visual time-series chart of Blood Alcohol Concentration (BAC) to Beer O'Clock. During an active session the graph is shown on the Home page and refreshes approximately every 5 minutes, giving the user a live picture of how their BAC has risen and is falling. When a session ends and is archived, the completed BAC curve is stored with the archive and rendered inside the expanded `SessionCard` on the History page.

Because no charting library is currently installed, the graph is rendered as an inline SVG built from the existing `calculateBAC` pure function — no new runtime dependency is required.

## Glossary

- **BAC_Graph**: The SVG line-chart component that renders a BAC-over-time curve.
- **BAC_Curve**: The ordered sequence of `(timestamp, bac)` data points that describe BAC over a session.
- **Active_Session**: A session that has drinks recorded and has not yet been archived (i.e. `useSession` drinks array is non-empty).
- **Archived_Session**: A completed session stored as a `SessionArchive` in localStorage / remote history.
- **Graph_Interval**: The time resolution used when sampling BAC for the live graph — 5 minutes (300 000 ms).
- **BAC_Snapshot**: A single `{ timestamp: number; bac: number }` data point on the BAC_Curve.
- **Session_Archive**: The existing `SessionArchive` type in `frontend/src/types/drinks.ts`.
- **calculateBAC**: The pure function in `frontend/src/utils/calculations.ts` that computes BAC at a given moment.
- **UserProfile**: The existing `UserProfile` type containing weight and sex used by `calculateBAC`.
- **Home_Page**: The route-level `Home` component in `frontend/src/pages/Home.tsx`.
- **History_Page**: The route-level `History` component in `frontend/src/pages/History.tsx`.
- **SessionCard**: The existing expandable card component in `frontend/src/components/SessionCard.tsx`.

---

## Requirements

### Requirement 1: Generate BAC Curve Data Points

**User Story:** As a user, I want the app to compute my BAC at regular intervals across a session, so that a smooth curve can be drawn on the graph.

#### Acceptance Criteria

1. THE BAC_Graph SHALL accept a `drinks` array, a `profile` (`UserProfile | null`), a `startTime` (epoch ms), and an `endTime` (epoch ms) as inputs.
2. WHEN `profile` is `null`, THE BAC_Graph SHALL render an empty state message instead of a curve.
3. THE BAC_Graph SHALL sample BAC at every Graph_Interval (5 minutes) between `startTime` and `endTime` inclusive, producing an ordered array of BAC_Snapshots.
4. THE BAC_Graph SHALL include a final BAC_Snapshot at exactly `endTime` to ensure the curve reaches the end of the time axis.
5. WHEN all sampled BAC values are zero, THE BAC_Graph SHALL render an empty state message instead of a curve.
6. THE BAC_Graph SHALL use `calculateBAC` from `frontend/src/utils/calculations.ts` to compute each BAC_Snapshot value, ensuring consistency with the rest of the app.

---

### Requirement 2: Live BAC Graph on the Home Page

**User Story:** As a user tracking an active session, I want to see my BAC curve update in near-real-time on the Home page, so that I can monitor how my BAC is changing.

#### Acceptance Criteria

1. WHEN an Active_Session exists and `profile` is set, THE Home_Page SHALL render the BAC_Graph below the `BACCard` component.
2. THE BAC_Graph SHALL refresh its BAC_Curve at a Graph_Interval of 5 minutes (300 000 ms) using a `setInterval` timer.
3. WHEN a new drink is added during an Active_Session, THE BAC_Graph SHALL recompute the BAC_Curve immediately without waiting for the next Graph_Interval tick.
4. WHEN a drink is removed during an Active_Session, THE BAC_Graph SHALL recompute the BAC_Curve immediately without waiting for the next Graph_Interval tick.
5. THE BAC_Graph SHALL use the timestamp of the first drink as `startTime` and the current wall-clock time as `endTime` when computing the live BAC_Curve.
6. WHEN an Active_Session has fewer than 2 drinks, THE BAC_Graph SHALL still render if a non-zero BAC_Curve can be computed.

---

### Requirement 3: Store BAC Curve in Session Archive

**User Story:** As a user reviewing past sessions, I want the completed BAC curve to be saved when a session ends, so that I can see the full shape of my BAC for that session on the History page.

#### Acceptance Criteria

1. WHEN a session is archived via `archiveSession` in `frontend/src/utils/sessionArchive.ts`, THE Session_Archive SHALL include a `bacCurve` field containing the ordered array of BAC_Snapshots for that session.
2. THE `bacCurve` SHALL be sampled at Graph_Interval (5 minutes) from `startTimestamp` to `endTimestamp` of the archive.
3. THE `bacCurve` SHALL include a BAC_Snapshot at `endTimestamp` to capture the tail of the curve.
4. IF `profile` is `null` at archive time, THEN THE Session_Archive SHALL store an empty `bacCurve` array.
5. THE `SessionArchive` type in `frontend/src/types/drinks.ts` SHALL be extended with an optional `bacCurve?: BACSnapshot[]` field to maintain backwards compatibility with existing archives that lack the field.

---

### Requirement 4: BAC Graph in Session History

**User Story:** As a user reviewing past sessions, I want to see the BAC curve for each archived session, so that I can understand how my BAC evolved during that session.

#### Acceptance Criteria

1. WHEN a `SessionCard` is expanded and the archive's `bacCurve` contains at least one non-zero BAC_Snapshot, THE SessionCard SHALL render the BAC_Graph below the drink list.
2. WHEN a `SessionCard` is expanded and the archive's `bacCurve` is empty or absent, THE SessionCard SHALL not render the BAC_Graph.
3. THE BAC_Graph rendered inside a `SessionCard` SHALL be read-only and SHALL NOT use a refresh timer.
4. THE BAC_Graph SHALL display the peak BAC value as an annotation on the curve.

---

### Requirement 5: BAC Graph Visual Design

**User Story:** As a user, I want the BAC graph to be readable at a glance, so that I can understand my BAC trend without needing to study it carefully.

#### Acceptance Criteria

1. THE BAC_Graph SHALL render as an inline SVG with a responsive width and a fixed aspect ratio.
2. THE BAC_Graph SHALL display a horizontal reference line at BAC 0.05 (the Australian legal driving limit) with a label.
3. THE BAC_Graph SHALL label the x-axis with time markers showing hours elapsed since the first drink.
4. THE BAC_Graph SHALL label the y-axis with BAC values at regular intervals (e.g. 0.00, 0.05, 0.10, 0.15).
5. THE BAC_Graph SHALL use the app's existing Tailwind CSS design tokens (foreground, muted-foreground, primary) for all colours so that it respects the current theme.
6. THE BAC_Graph SHALL be wrapped in an `<ErrorBoundary>` at every call site to prevent graph rendering errors from crashing the parent page.
