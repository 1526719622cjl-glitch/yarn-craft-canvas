import { LucideProps } from 'lucide-react';

export function KnittingNeedlesIcon({ size = 24, className, ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Left needle */}
      <line x1="3" y1="21" x2="14" y2="3" />
      <circle cx="15" cy="2" r="1" fill="currentColor" />
      
      {/* Right needle */}
      <line x1="21" y1="21" x2="10" y2="3" />
      <circle cx="9" cy="2" r="1" fill="currentColor" />
      
      {/* Yarn loop on needles */}
      <path d="M8 10c2 1 4 1 6 0" />
    </svg>
  );
}
