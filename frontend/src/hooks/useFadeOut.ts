import { useEffect, useState } from "react";

// Keeps content mounted for durationMs after `visible` turns false, so it can fade out.
export function useFadeOut(visible: boolean, durationMs: number) {
  const [lingering, setLingering] = useState(visible);
  if (visible && !lingering) setLingering(true);

  useEffect(() => {
    if (visible || !lingering) return;
    const t = setTimeout(() => setLingering(false), durationMs);
    return () => clearTimeout(t);
  }, [visible, lingering, durationMs]);

  return { mounted: visible || lingering, fadingOut: !visible && lingering };
}
