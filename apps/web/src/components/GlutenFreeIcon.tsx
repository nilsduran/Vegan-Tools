export function GlutenFreeIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
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
      aria-hidden="true"
    >
      {/* Central wheat stalk and grains */}
      <path d="M3 21l7-7" />
      <path d="M7 13c-1.5-1.5-1-4 0-5 1.5.5 2.5 2 2.5 3.5" />
      <path d="M11 9c-1.5-1.5-1-4 0-5 1.5.5 2.5 2 2.5 3.5" />
      <path d="M15 5c-1-1.2-.5-3 0-4 1.2.3 2 1.5 2 2.7" />
      <path d="M10.5 13.5c1.5-.5 3 .5 3.5 2 0 1.5-1.5 2.5-3 2" />
      <path d="M14.5 9.5c1.5-.5 3 .5 3.5 2 0 1.5-1.5 2.5-3 2" />
      <path d="M18.5 5.5c1.2-.3 2.5.3 2.8 1.5 0 1.2-1.2 2-2.3 1.7" />

      {/* Clean diagonal cross line */}
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
