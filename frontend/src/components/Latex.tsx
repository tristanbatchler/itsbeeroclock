import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexProps {
  children: string;
  display?: boolean;
  className?: string;
}

export function Latex({ children, display = false, className }: LatexProps) {
  const html = katex.renderToString(children, {
    displayMode: display,
    throwOnError: false,
  });
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
