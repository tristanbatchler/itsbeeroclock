import { Card } from '../components/Card';

export function AddBeer() {
  return (
    <div className="p-6 space-y-6">
      <Card className="p-8 text-center bg-muted/30 shadow-sm border-dashed">
        <h2 className="text-2xl font-bold mb-2">Add Custom Beer</h2>
        <p className="text-muted-foreground">Coming soon</p>
      </Card>
    </div>
  );
}