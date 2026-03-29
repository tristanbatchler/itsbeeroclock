import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveCustomBeer } from '../utils/storage';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function AddBeer() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [brewery, setBrewery] = useState('');
  const [abv, setAbv] = useState('5.0');

  const handleSave = () => {
    if (!name.trim() || !abv) return;
    
    saveCustomBeer({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      brewery: brewery.trim() || 'Custom',
      abv: parseFloat(abv),
      isCustom: true,
    });
    
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Add Custom Beer</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Beer Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Hazy IPA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Brewery (optional)</label>
            <Input
              value={brewery}
              onChange={(e) => setBrewery(e.target.value)}
              placeholder="Local Brew Co"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">ABV (%)</label>
            <Input
              type="number"
              step="0.1"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="5.0"
            />
          </div>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Beer
          </Button>
        </div>
      </Card>
    </div>
  );
}