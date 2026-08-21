/**
 * useRandy
 *
 * Composable powering the Randy tool: a reproducible pseudo-random
 * number generator. The same seed always produces the same sequence,
 * which makes the tool useful for fixtures, deterministic tests,
 * reproducible procedural art and similar use cases.
 *
 * Two algorithms ship by default:
 *
 *  - **mulberry32**: a tiny, fast 32-bit PRNG with a 2^32 period.
 *    Plenty good for non-cryptographic work and stable across browsers
 *    because all ops use `Math.imul` and explicit `>>> 0` masks.
 *  - **xoshiro128**\*\*: David Blackman / Sebastiano Vigna's 128-bit
 *    state generator. Larger period and better statistical quality.
 *    Slightly heavier per step.
 *
 * String seeds are folded into the algorithm's required number of
 * 32-bit words via xmur3, an MurmurHash3-style mixer. Empty seeds use
 * a fixed default so the UI always produces output rather than crashing.
 *
 * IMPORTANT: neither algorithm is cryptographically secure. Use
 * `crypto.getRandomValues` (see {@link useIdGenerator}) for anything
 * security-sensitive.
 */

/** Supported PRNG algorithms. */
export type Algorithm = 'mulberry32' | 'xoshiro128ss'

export const ALGORITHMS: Algorithm[] = ['mulberry32', 'xoshiro128ss']

/**
 * Build a deterministic 32-bit hash-stream from a string seed. Each
 * call to the returned function emits the next 32-bit value, so the
 * caller can pull as many seed words as the target PRNG needs.
 */
const xmur3 = (str: string): (() => number) => {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

/**
 * mulberry32 PRNG. Takes a 32-bit seed and returns a `() => number`
 * that yields uniform floats in `[0, 1)`.
 */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * xoshiro128** PRNG. Uses four 32-bit state words; returns uniform
 * floats in `[0, 1)`. All shifts are masked so they behave the same in
 * every JS engine.
 */
const xoshiro128ss = (
  s0: number,
  s1: number,
  s2: number,
  s3: number,
): (() => number) => {
  let a = s0 >>> 0
  let b = s1 >>> 0
  let c = s2 >>> 0
  let d = s3 >>> 0
  return () => {
    let r = Math.imul(b, 5)
    r = (Math.imul((r << 7) | (r >>> 25), 9)) >>> 0
    const t = (b << 9) >>> 0
    c ^= a
    d ^= b
    b ^= c
    a ^= d
    c = (c ^ t) >>> 0
    d = ((d << 11) | (d >>> 21)) >>> 0
    return r / 4294967296
  }
}

/**
 * Build a PRNG from a (possibly empty) string seed and an algorithm
 * choice. Empty seeds map to the fixed sentinel `"cervantic"` so the
 * sequence is still deterministic but predictable for first-load demos.
 */
export const makeRng = (seed: string, algo: Algorithm): (() => number) => {
  const effectiveSeed = seed.length === 0 ? 'cervantic' : seed
  const hash = xmur3(effectiveSeed)
  if (algo === 'mulberry32') return mulberry32(hash())
  return xoshiro128ss(hash(), hash(), hash(), hash())
}

/** Generate a fresh random seed using Web Crypto, encoded in base36. */
export const randomSeed = (): string => {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return bytes[0].toString(36) + bytes[1].toString(36)
}

export const useRandy = () => {
  /**
   * `count` random integers uniformly distributed in `[min, max]`. If
   * `min > max` the bounds are swapped silently. Negative ranges and
   * single-value ranges are both supported.
   */
  const integers = (
    rng: () => number,
    min: number,
    max: number,
    count: number,
  ): number[] => {
    const a = Math.min(min, max)
    const b = Math.max(min, max)
    const span = b - a + 1
    const out: number[] = []
    for (let i = 0; i < count; i++) {
      out.push(a + Math.floor(rng() * span))
    }
    return out
  }

  /**
   * `count` random floats in `[min, max)`, rounded to `decimals`
   * fractional digits. The rounding ensures reproducible output text
   * even when the user inputs awkward bounds.
   */
  const floats = (
    rng: () => number,
    min: number,
    max: number,
    decimals: number,
    count: number,
  ): number[] => {
    const a = Math.min(min, max)
    const b = Math.max(min, max)
    const span = b - a
    const factor = Math.pow(10, Math.max(0, Math.min(20, decimals)))
    const out: number[] = []
    for (let i = 0; i < count; i++) {
      const raw = a + rng() * span
      out.push(Math.round(raw * factor) / factor)
    }
    return out
  }

  /**
   * Pick `count` items from `items`. With replacement, the same item
   * can appear multiple times. Without replacement, the items are
   * Fisher-Yates shuffled with the same `rng` and the first `count`
   * are returned; if `count` exceeds the list length, every item is
   * returned exactly once (no error — degrades gracefully).
   */
  const pick = <T>(
    rng: () => number,
    items: T[],
    count: number,
    withReplacement: boolean,
  ): T[] => {
    if (items.length === 0) return []
    if (withReplacement) {
      const out: T[] = []
      for (let i = 0; i < count; i++) {
        out.push(items[Math.floor(rng() * items.length)])
      }
      return out
    }
    const pool = [...items]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, Math.min(count, pool.length))
  }

  return { integers, floats, pick }
}
