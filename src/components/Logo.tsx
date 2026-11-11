/**
 * Marca "LOGOAKI": LOGO em ultramarino + AKI numa plaquinha amarela de esmalte.
 * O tamanho vem do font-size do elemento pai/className (tudo em em).
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Logoaki"
      className={`letreiro inline-flex items-center gap-[0.12em] ${className}`}
    >
      <span aria-hidden className="text-primary">
        LOGO
      </span>
      <span
        aria-hidden
        className="rounded-[0.14em] border-[0.07em] border-solid border-primary bg-gema px-[0.14em] pb-[0.02em] pt-[0.06em] text-primary"
      >
        AKI
      </span>
    </span>
  );
}
