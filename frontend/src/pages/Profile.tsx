import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, saveUserProfile } from '../utils/storage';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

export function Profile() {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const existing = getUserProfile();
  const [gender, setGender] = useState<'male' | 'female'>(existing?.gender || 'male');
  const [weight, setWeight] = useState(existing?.weight?.toString() || '80');
  const [optInHistory, setOptInHistory] = useState(existing?.optInHistory || false);

  const handleSave = () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return;
    saveUserProfile({ gender, weight: weightNum, optInHistory });
    navigate('/');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-40">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Card className="p-6 w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Sign in to continue</h2>
          <Button onClick={signInWithGoogle} className="w-full mb-2">Sign in with Google</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Details</h2>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Used to calculate accurate BAC estimates
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <div className="flex gap-4">
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`px-6 py-2 rounded-xl font-medium transition-all ${
                    gender === g 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Weight (kg)</label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="80"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={optInHistory}
              onChange={(e) => setOptInHistory(e.target.checked)}
              className="size-5 rounded border-border accent-primary"
            />
            <span className="text-sm">Save my drinking history</span>
          </label>

          <Button onClick={handleSave} className="w-full mt-4">
            Save Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}