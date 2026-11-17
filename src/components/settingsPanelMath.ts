export const VOLUME_SEGMENT_COUNT = 10;

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function stepVolume(current: number, delta: number): number {
  return clampVolume(current + delta);
}

export function getFilledSegmentCount(
  volume: number,
  muted = false,
  totalSegments = VOLUME_SEGMENT_COUNT,
): number {
  if (muted) return 0;
  const clamped = clampVolume(volume);
  return Math.max(0, Math.min(totalSegments, Math.round(clamped * totalSegments)));
}

export function getThumbPercent(volume: number, muted = false): number {
  if (muted) return 0;
  return Math.round(clampVolume(volume) * 100);
}
