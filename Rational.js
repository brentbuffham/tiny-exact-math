/**
 * tiny-exact-math
 * Minimal rational arithmetic library for exact geometric predicates.
 */

/**
 * Compute the greatest common divisor of two BigInts using the Euclidean
 * algorithm. The result is always non-negative.
 *
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint}
 */
function gcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Convert a JavaScript number (integer or floating-point) to a Rational.
 *
 * Strategy: use `String(n)`, which produces the *shortest* decimal
 * representation that round-trips back to the same IEEE 754 double (Grisu /
 * Ryu algorithm in V8).  Parse the resulting decimal string into a
 * numerator/denominator pair, handling the sign, fractional part, and
 * optional scientific-notation exponent separately to avoid BigInt parsing
 * errors (e.g. BigInt("-05") would throw).
 *
 * @param {number} n
 * @returns {Rational}
 */
function fromNumber(n) {
  if (!isFinite(n)) {
    throw new RangeError("Cannot convert non-finite number to Rational");
  }
  if (n === 0) return new Rational(0n, 1n);

  const str = String(n);
  const negative = str.charCodeAt(0) === 45; // '-'
  const abs = negative ? str.slice(1) : str;

  // Handle scientific notation produced for very large / very small values
  // e.g. "1.5e-7" or "1e+21"
  const eIdx = abs.indexOf("e");
  if (eIdx !== -1) {
    const base = abs.slice(0, eIdx);
    const exp = parseInt(abs.slice(eIdx + 1), 10);
    const r = _parseDecimalString(base, negative);
    const pow = 10n ** BigInt(Math.abs(exp));
    return exp >= 0
      ? new Rational(r.numerator * pow, r.denominator)
      : new Rational(r.numerator, r.denominator * pow);
  }

  return _parseDecimalString(abs, negative);
}

/**
 * Parse a plain decimal string (no sign, no exponent) into a Rational.
 * @param {string} abs  – digits with optional "."
 * @param {boolean} negative
 * @returns {Rational}
 */
function _parseDecimalString(abs, negative) {
  const dotIndex = abs.indexOf(".");
  if (dotIndex === -1) {
    const num = negative ? -BigInt(abs) : BigInt(abs);
    return new Rational(num, 1n);
  }

  const intDigits = abs.slice(0, dotIndex) || "0";
  const fracDigits = abs.slice(dotIndex + 1);
  const combined = intDigits + fracDigits; // sign removed, safe for BigInt
  const num = negative ? -BigInt(combined) : BigInt(combined);
  const den = 10n ** BigInt(fracDigits.length);
  return new Rational(num, den);
}

/**
 * A rational number stored as two BigInts (numerator and denominator).
 * The value is always kept in lowest terms with a non-negative denominator.
 */
export class Rational {
  /**
   * @param {bigint|number} numerator
   * @param {bigint|number} denominator
   */
  constructor(numerator, denominator = 1n) {
    let num = BigInt(numerator);
    let den = BigInt(denominator);

    if (den === 0n) {
      throw new RangeError("Denominator must not be zero");
    }

    // Normalise: keep denominator positive
    if (den < 0n) {
      num = -num;
      den = -den;
    }

    const g = gcd(num < 0n ? -num : num, den);
    this.numerator = num / g;
    this.denominator = den / g;
  }

  // ── Arithmetic ────────────────────────────────────────────────────────────

  /**
   * Return a new Rational equal to this + other.
   * @param {Rational} other
   * @returns {Rational}
   */
  add(other) {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  /**
   * Return a new Rational equal to this - other.
   * @param {Rational} other
   * @returns {Rational}
   */
  subtract(other) {
    return new Rational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  /**
   * Return a new Rational equal to this * other.
   * @param {Rational} other
   * @returns {Rational}
   */
  multiply(other) {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  /**
   * Return a new Rational equal to this / other.
   * @param {Rational} other
   * @returns {Rational}
   */
  divide(other) {
    if (other.numerator === 0n) {
      throw new RangeError("Division by zero");
    }
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }

  // ── Comparison ────────────────────────────────────────────────────────────

  /**
   * Return the sign of this rational: -1, 0, or 1.
   * @returns {number}
   */
  sign() {
    if (this.numerator === 0n) return 0;
    return this.numerator > 0n ? 1 : -1;
  }

  /**
   * Return true if this rational equals zero.
   * @returns {boolean}
   */
  isZero() {
    return this.numerator === 0n;
  }

  /**
   * Convert to a JavaScript number (may lose precision).
   * @returns {number}
   */
  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  /**
   * Human-readable string representation.
   * @returns {string}
   */
  toString() {
    if (this.denominator === 1n) return String(this.numerator);
    return `${this.numerator}/${this.denominator}`;
  }
}

// ── Geometric predicate ──────────────────────────────────────────────────────

/**
 * Compute the orientation (sign of the 2×2 determinant) of three 2-D points.
 *
 * Given points p1, p2, p3 each with numeric `x` and `y` properties, the
 * determinant is:
 *
 *   | p2.x - p1.x   p3.x - p1.x |
 *   | p2.y - p1.y   p3.y - p1.y |
 *
 * = (p2.x - p1.x)(p3.y - p1.y) - (p3.x - p1.x)(p2.y - p1.y)
 *
 * All coordinates are converted to exact Rationals before the computation so
 * the result is free of floating-point rounding error.
 *
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {{ x: number, y: number }} p3
 * @returns {-1 | 0 | 1}  sign of the determinant
 */
export function determinant(p1, p2, p3) {
  const x1 = fromNumber(p1.x);
  const y1 = fromNumber(p1.y);
  const x2 = fromNumber(p2.x);
  const y2 = fromNumber(p2.y);
  const x3 = fromNumber(p3.x);
  const y3 = fromNumber(p3.y);

  const dx2 = x2.subtract(x1);
  const dy2 = y2.subtract(y1);
  const dx3 = x3.subtract(x1);
  const dy3 = y3.subtract(y1);

  // det = dx2*dy3 - dx3*dy2
  const det = dx2.multiply(dy3).subtract(dx3.multiply(dy2));

  return det.sign();
}
