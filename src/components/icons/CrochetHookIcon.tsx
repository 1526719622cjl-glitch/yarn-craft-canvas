import { LucideProps } from 'lucide-react';

export function CrochetHookIcon({ size = 24, className, ...props }: LucideProps) {
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
      {/* Hook head - J shape */}
      <path d="M8 3c-2 0-3.5 1.5-3.5 3.5S6 10 8 10" />
      {/* Straight handle */}
      <line x1="8" y1="10" x2="18" y2="22" />
      {/* Small grip detail */}
      <line x1="12" y1="14.5" x2="14" y2="17" strokeWidth="3" strokeOpacity="0.3" />
    </svg>
  );
}
