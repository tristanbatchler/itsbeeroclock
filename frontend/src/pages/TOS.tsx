import { Card } from '../components/Card';

export function TOS() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: 27 March 2026</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. BAC Estimates</h2>
            <p>BAC calculations are estimates only. Never drink and drive. Always use a certified breathalyzer.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">2. Privacy</h2>
            <p>We respect your privacy. All data is opt-in and can be deleted at any time.</p>
          </section>
        </div>
      </Card>
    </div>
  );
}