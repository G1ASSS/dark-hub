/**
 * Site-wide ambient background — the violet / pink / cyan glow first designed
 * for the shop. Rendered once in the root layout so every page shares it.
 * Pure CSS (no client JS): fixed, pointer-transparent, always behind content.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="animate-float absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.13), transparent 70%)' }}
      />
      <div
        className="animate-float absolute -right-40 top-1/3 h-[540px] w-[540px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08), transparent 70%)', animationDelay: '-7s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[480px] w-[480px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)' }}
      />
    </div>
  )
}
