export function cToF(c: number): number {
  return Math.round((c * (9 / 5) + 32) * 100) / 100;
}

export function fToC(f: number): number {
  return Math.round(((f - 32) * (5 / 9)) * 100) / 100;
}
