import { LucideProps } from 'lucide-react';

export function YarnCluesLogo({ size = 24, className, ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Yarn ball - outer circle */}
      <circle cx="12" cy="12" r="8" />
      {/* Yarn wrapping lines */}
      <path d="M6 8c4 2 8 2 12 0" />
      <path d="M6 12c4 2 8 2 12 0" />
      <path d="M6 16c4 2 8 2 12 0" />
      {/* Yarn tail */}
      <path d="M18 8c1-2 3-3 4-2" />
    </svg>
  );
}
