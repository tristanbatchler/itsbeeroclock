// KaTeX runtime removed — formulas are pre-rendered at build time.
// Re-run `tsx scripts/prerender-latex.ts` if formulas change.
import { LATEX } from "../lib/latexPrerendered";

interface LatexProps {
  formula: keyof typeof LATEX;
  className?: string;
}

export function Latex({ formula, className }: LatexProps) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: LATEX[formula] }}
    />
  );
}
