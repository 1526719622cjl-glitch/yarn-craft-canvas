import { KnittingNeedlesIcon } from '@/components/icons';
import { PatternLibrary } from '@/components/pattern/PatternLibrary';

export default function KnittingEngine() {
  return (
    <PatternLibrary
      category="knitting"
      icon={<KnittingNeedlesIcon className="w-6 h-6 text-primary" />}
    />
  );
}
