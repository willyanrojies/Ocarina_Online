interface CrtTvOverlayProps {
  enabled: boolean;
}

export function CrtTvOverlay({ enabled }: CrtTvOverlayProps) {
  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="crt-tv-overlay"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none"
    >
      {/* Linhas de varredura horizontais CRT */}
      <div className="crt-scanlines absolute inset-0" />

      {/* Grade de abertura de fósforo RGB sutil */}
      <div className="crt-phosphor-grille absolute inset-0" />

      {/* Reflexo sutil do vidro curvado do tubo */}
      <div className="crt-glass-sheen absolute inset-0" />

      {/* Vinheta de tubo CRT curvado e sombra arredondada da moldura */}
      <div className="crt-tube-bezel absolute inset-0" />
    </div>
  );
}
