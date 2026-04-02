import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-10 text-center max-w-sm">
        <p className="text-6xl mb-4">🍺</p>
        <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          Nothing here. Maybe you had one too many.
        </p>
        <Link to="/">
          <Button className="w-full">Back home?</Button>
        </Link>
      </Card>
    </div>
  );
}
