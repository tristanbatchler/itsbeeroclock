# Tasks: BAC Graph

## Task List

- [x] 1. Add `BACSnapshot` type and extend `SessionArchive`
  - [x] 1.1 Add `BACSnapshot` interface (`{ timestamp: number; bac: number }`) to `frontend/src/types/drinks.ts`
  - [x] 1.2 Add optional `bacCurve?: BACSnapshot[]` field to `SessionArchive` in `frontend/src/types/drinks.ts`

- [x] 2. Implement `computeBACCurve` pure utility
  - [x] 2.1 Add `computeBACCurve(drinks, allBeers, profile, startTime, endTime, intervalMs?)` to `frontend/src/utils/calculations.ts`
  - [x] 2.2 Return `[]` when `profile` is null or `drinks` is empty or `endTime < startTime`
  - [x] 2.3 Sample BAC at every `intervalMs` (default 300 000) from `startTime` to `endTime` inclusive, always appending a snapshot at exactly `endTime`
  - [x] 2.4 Write unit tests for `computeBACCurve` in `frontend/src/utils/__tests__/computeBACCurve.test.ts`
  - [x] 2.5 Write property tests for `computeBACCurve` (Properties 1, 2, 3) in the same test file

- [x] 3. Extend `archiveSession` to store `bacCurve`
  - [x] 3.1 Call `computeBACCurve(drinks, allBeers, profile, startTimestamp, endTimestamp)` inside `archiveSession` in `frontend/src/utils/sessionArchive.ts`
  - [x] 3.2 Include the result as `bacCurve` in the returned `SessionArchive`
  - [x] 3.3 Write unit tests and property test (Property 7) for the extended `archiveSession` in `frontend/src/utils/__tests__/archiveSession.test.ts`

- [x] 4. Build `BACGraph` SVG component
  - [x] 4.1 Create `frontend/src/components/BACGraph.tsx` with props `{ snapshots, startTime, endTime, className? }`
  - [x] 4.2 Implement SVG coordinate mapping with `viewBox="0 0 600 200"`, padding `{ top:10, right:10, bottom:24, left:40 }`
  - [x] 4.3 Render BAC line path from snapshots
  - [x] 4.4 Render dashed horizontal reference line at BAC 0.05 with "0.05 limit" label
  - [x] 4.5 Render y-axis tick labels at 0.05 BAC intervals
  - [x] 4.6 Render x-axis tick labels showing hours elapsed since `startTime`
  - [x] 4.7 Render peak BAC annotation dot and label
  - [x] 4.8 Render empty state `<text>` message when snapshots is empty or all-zero
  - [x] 4.9 Use CSS variables (`var(--color-foreground)`, `var(--color-muted-foreground)`, `var(--color-primary)`) for all colours
  - [x] 4.10 Write unit tests for `BACGraph` in `frontend/src/components/__tests__/BACGraph.test.tsx`
  - [x] 4.11 Write property tests for `BACGraph` (Properties 5, 6) in the same test file

- [x] 5. Implement `useBACGraph` hook
  - [x] 5.1 Create `frontend/src/hooks/useBACGraph.ts` returning `{ snapshots, startTime, endTime }`
  - [x] 5.2 Set up 300 000 ms `setInterval` to update `currentTime` state
  - [x] 5.3 Use `useMemo` to recompute snapshots when `drinks`, `allBeers`, `profile`, or `currentTime` changes
  - [x] 5.4 Derive `startTime` from first drink timestamp, `endTime` from `currentTime`
  - [x] 5.5 Write unit tests for `useBACGraph` in `frontend/src/hooks/__tests__/useBACGraph.test.ts` (Property 4)

- [x] 6. Integrate live graph into `Home.tsx`
  - [x] 6.1 Call `useBACGraph(drinks, allBeers, profile)` in `Home.tsx`
  - [x] 6.2 Render `<ErrorBoundary><BACGraph .../></ErrorBoundary>` below `BACCard` when `profile` is set and `drinks.length > 0`

- [x] 7. Integrate archived graph into `SessionCard`
  - [x] 7.1 In `SessionCard.tsx`, when expanded and `archive.bacCurve?.some(s => s.bac > 0)` is true, render `<ErrorBoundary><BACGraph .../></ErrorBoundary>` below the drink list
  - [x] 7.2 Pass `archive.bacCurve`, `archive.startTimestamp`, `archive.endTimestamp` as props
  - [x] 7.3 Write unit tests for the conditional rendering in `frontend/src/components/__tests__/SessionCard.test.tsx`
