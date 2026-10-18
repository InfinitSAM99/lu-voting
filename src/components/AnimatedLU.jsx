export default function AnimatedLU({ size = 96 }) {
  return (
    <div
      className="lu-splash-stage drawn lu-loop"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <rect className="lu-splash-frame" x="14" y="14" width="172" height="172" rx="34" />
        <path className="lu-splash-letter lu-splash-letter-l" d="M 62 60 L 62 130 L 96 130" />
        <path className="lu-splash-letter lu-splash-letter-u" d="M 112 60 L 112 112 A 18 18 0 0 0 148 112 L 148 60" />
        <rect className="lu-splash-glow" x="14" y="14" width="172" height="172" rx="34" />
      </svg>
    </div>
  )
}
