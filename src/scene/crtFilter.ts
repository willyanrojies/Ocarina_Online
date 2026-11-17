export const CRT_FILTER_DEFAULT_ENABLED = true;
export const N64_CRT_PIXEL_RATIO = 0.62;

/**
 * Calcula a proporção de pixels do WebGL:
 * - Quando o filtro de TV CRT N64 está ativo, renderiza em escala clássica ~480p
 *   para suavidade autêntica de polígonos do Nintendo 64 sem perder legibilidade.
 * - Caso contrário, preserva o DPR nativo/limitado (1 em WebGL por software, até 2 em GPU).
 */
export function computeScenePixelRatio(
  isSoftwareGl: boolean,
  devicePixelRatio: number,
  crtEnabled: boolean,
): number {
  if (crtEnabled) {
    return N64_CRT_PIXEL_RATIO;
  }
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return isSoftwareGl ? 1 : Math.min(Math.max(1, safeDpr), 2);
}
