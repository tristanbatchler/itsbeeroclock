import { useState } from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Latex } from "../components/Latex";
import "katex/dist/katex.min.css";
import { Beer, FlaskConical } from "lucide-react";

function BACExplainerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="How BAC is calculated">
      <div className="space-y-3 text-sm text-muted-foreground max-h-[70vh] overflow-y-auto pr-1">
        <p>
          We use <strong className="text-foreground">Watson's formula</strong> because it
          tends to be more accurate than other models, though it requires sex, weight, height,
          and age to personalise the estimate to your body composition.
        </p>
        <p className="text-foreground font-medium">The calculation happens in three steps:</p>

        <div className="space-y-2">
          <p className="font-medium text-foreground">1. Total body water (TBW)</p>
          <p>
            TBW measures how much water is in your body. Because alcohol dissolves in water
            and not fat, it's not enough to just look at weight — we need these other factors
            to get a solid baseline.
          </p>
          <p>Dr. P.E. Watson's 1980 research gives us:</p>
          <div className="overflow-x-auto py-1"><Latex formula="tbwFormula" /></div>
          <p>Where people identifying as female use:</p>
          <div className="overflow-x-auto py-1"><Latex formula="tbwFemale" /></div>
          <p>And all others use:</p>
          <div className="overflow-x-auto py-1"><Latex formula="tbwMale" /></div>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">2. The alcohol jump</p>
          <p>
            Each drink causes a spike in BAC. One Australian standard drink = 10g of ethanol.
            Because alcohol distributes through body water, and blood is ~80.6% water:
          </p>
          <div className="overflow-x-auto py-1"><Latex formula="bacJump" /></div>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">3. Metabolism</p>
          <p>
            Alcohol burns off at a consistent flat rate of 0.015% BAC per hour. Your BAC at
            any moment is the sum of all drink spikes minus what your liver has cleared:
          </p>
          <div className="overflow-x-auto py-1"><Latex formula="bacNow" /></div>
        </div>

        <hr className="border-border" />
        <p className="text-xs italic">
          <strong className="not-italic text-foreground">Disclaimer:</strong> This is a
          mathematical estimate. Food, genetics, and liver health all affect real BAC.
          Never use this as a definitive test of whether you can legally or safely drive.
        </p>
      </div>
    </Modal>
  );
}

export function About() {
  const [bacModalOpen, setBacModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Beer className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">About Beer O'Clock</h1>
        </div>
        <div className="space-y-3 text-sm">
          <p>Hey, thanks for checking out Beer O'Clock!</p>
          <p>
            The app is an almost stupidly specific idea: simple and accurate drink tracking for 
            Queensland beers. This makes it really useful for people in Queensland, since our 
            beer glasses are all standard sizes. And our beers all have their own ABV content which 
            is easy to find. This solves the very niche problem of too many generalised drink trackers 
            either making extra steps, or not providing the most accurate measurements!
          </p>
          <p>
            It's free, it has no ads, and it doesn't sell your data. It's built and maintained
            by <a href="https://www.tbat.me/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">this guy</a> who got tired of how surprisingly hard it can be to track your drinks on 
            a night out. It's also <a href="https://github.com/tristanbatchler/itsbeeroclock" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">open source</a>.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/20 p-2 rounded-xl">
            <FlaskConical className="size-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">The science bit</h2>
        </div>
        <p className="text-sm mb-4">
          BAC estimates use Watson's formula, a pretty good model that accounts for your
          sex, weight, height, and age to personalise the calculation. It's more accurate than
          flat-average methods, but it's still an estimate.
        </p>
        <Button variant="outline" onClick={() => setBacModalOpen(true)}>
          How is BAC calculated?
        </Button>
      </Card>

      <BACExplainerModal open={bacModalOpen} onClose={() => setBacModalOpen(false)} />
    </div>
  );
}
