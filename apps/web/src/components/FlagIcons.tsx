export function FlagUK({ width = 22, height = 15 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 60 40"
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="6.5" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3.5" />
      <path d="M30 0v40M0 20h60" stroke="#ffffff" strokeWidth="11" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="6.5" />
    </svg>
  );
}

export function FlagCatalonia({ width = 22, height = 15 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 90 60"
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}
    >
      <rect width="90" height="60" fill="#FCD116" />
      <rect y="6.667" width="90" height="6.667" fill="#D7141A" />
      <rect y="20" width="90" height="6.667" fill="#D7141A" />
      <rect y="33.333" width="90" height="6.667" fill="#D7141A" />
      <rect y="46.667" width="90" height="6.667" fill="#D7141A" />
    </svg>
  );
}
