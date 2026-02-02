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
      {/* Hook head */}
      <path d="M6 4c-1.5 0-3 1.5-3 3s1 2.5 2.5 3c1 .3 1.5 1 1.5 2" />
      {/* Handle */}
      <line x1="7" y1="12" x2="19" y2="22" />
      {/* Ergonomic grip detail */}
      <ellipse cx="13" cy="17" rx="1.5" ry="2.5" transform="rotate(45 13 17)" />
    </svg>
  );
}
