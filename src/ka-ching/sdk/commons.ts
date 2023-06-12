import ms from 'ms';

export function toEpoch(until: string): number {
  const durationMs = ms(until);
  if (!durationMs) {
    throw new Error(`Invalid duration format: ${until}`);
  }
  return Math.floor((Date.now() + durationMs) / 1000);
}
