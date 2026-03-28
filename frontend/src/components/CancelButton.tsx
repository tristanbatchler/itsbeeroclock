import { X } from "lucide-react";
import { Button } from "./Button";

export function CancelButton({
  onClick,
  ...props
}: { onClick: () => void } & React.ComponentProps<typeof Button>) {
  return (
    <Button {...props} variant="ghost" size="icon" onClick={onClick}>
      <X className="size-4 text-muted-foreground hover:text-red-500 hover:scale-110 hover:rotate-90 transition-all duration-200" />
    </Button>
  );
}
