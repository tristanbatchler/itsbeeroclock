import { Card } from '../components/Card';
import { APP_SUPPORT_EMAIL } from '../lib/constants';

export function Privacy() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: 27 March 2026</p>
        
        <div className="space-y-4">
          <section>
            <h2 className="text-lg font-semibold mb-2">Data We Collect</h2>
            <p>Beer O'Clock collects your email address, weight, gender, and drinking 
              sessions only with your explicit consent.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">How We Use Data</h2>
            <p>Your data is used exclusively to provide BAC estimates and for you to track your 
              drinking history across multiple devices. 
                We <strong>never</strong> share your data with third parties.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">Data Storage</h2>
            <p>All data is stored securely. You can delete your data at any time by contacting 
              <a href={`mailto:${APP_SUPPORT_EMAIL}`} className="text-blue-500">{APP_SUPPORT_EMAIL}</a>.</p>
          </section>
        </div>
      </Card>
    </div>
  );
}