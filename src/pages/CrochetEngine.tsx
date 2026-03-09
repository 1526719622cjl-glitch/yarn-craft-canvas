import { CrochetHookIcon } from '@/components/icons';
import { PatternLibrary } from '@/components/pattern/PatternLibrary';

export default function CrochetEngine() {
  return (
    <PatternLibrary
      category="crochet"
      icon={<CrochetHookIcon className="w-6 h-6 text-primary" />}
    />
  );
}
