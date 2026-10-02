export default function MedotLogo({ variant = "wordmark", className = "" }: {
  variant?: "mark" | "wordmark";
  className?: string;
}) {
  return (
    <span className={`medot-logo ${className}`} role="img" aria-label="MEDOT">
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <path d="M30 8H18C10 8 7 14 7 22v10c0 6 4 9 10 9h14c6 0 10-4 10-10v-8M15 29v4c0 1 1 2 2 2h13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="36" cy="12" r="6" fill="currentColor" />
      </svg>
      {variant === "wordmark" && <span className="medot-logo-type" aria-hidden="true">MEDOT</span>}
    </span>
  );
}
