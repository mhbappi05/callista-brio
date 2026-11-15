export default function CBLoader({ size = 72, label = 'Loading' }) {
    return (
      <span role="status" className="inline-flex flex-col items-center">
        <svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 112 100" aria-hidden="true" focusable="false">
          <g stroke="var(--color-primary-maroon)" strokeWidth="5">
            <path className="cb-stroke" pathLength="1" d="M56.4 34.6A24 24 0 1 0 56.4 65.4" />
            <path className="cb-stroke cb-d1" pathLength="1" d="M70 26V75" />
            <path className="cb-stroke cb-d2" pathLength="1" d="M70 26H80A12 12 0 0 1 80 50H70" />
            <path className="cb-stroke cb-d3" pathLength="1" d="M70 50H83A12.5 12.5 0 0 1 83 75H70" />
          </g>
          <path className="cb-stroke cb-d4" pathLength="1" stroke="var(--color-accent-gold)" strokeWidth="3" d="M20 88Q56 99 92 88" />
        </svg>
        <span className="sr-only">{label}</span>
      </span>
    )
  }