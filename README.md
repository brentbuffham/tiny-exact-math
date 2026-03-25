# tiny-exact-math

Minimal rational arithmetic library for exact geometric predicates in pure JavaScript. Zero dependencies — uses native `BigInt`.

## Install

```bash
npm install tiny-exact-math
```

## Usage

```js
import { Rational, fromNumber, determinant, determinant3 } from 'tiny-exact-math';

// Create rationals
const a = new Rational(1n, 3n);       // 1/3
const b = fromNumber(0.1);            // exact representation of 0.1

// Arithmetic
a.add(b);        // returns new Rational
a.subtract(b);
a.multiply(b);
a.divide(b);

// 2D orientation test (sign of 2×2 determinant)
// Returns +1 (counter-clockwise), -1 (clockwise), or 0 (collinear)
determinant(
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 }
); // +1

// 3D plane-side test (sign of 3×3 determinant)
// Returns +1 (above plane), -1 (below), or 0 (coplanar)
determinant3(
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 }
); // +1
```

## API

### `new Rational(numerator, denominator?)`

Create a rational number from BigInt or number values. Automatically normalised to lowest terms with a positive denominator.

### `fromNumber(n)`

Convert a JavaScript `number` (integer or float) to an exact `Rational`. Uses the shortest decimal round-trip representation to avoid precision loss.

### `gcd(a, b)`

Greatest common divisor of two `BigInt` values.

### Rational instance methods

| Method | Description |
|--------|-------------|
| `add(other)` | Addition |
| `subtract(other)` | Subtraction |
| `multiply(other)` | Multiplication |
| `divide(other)` | Division |
| `sign()` | Returns `-1`, `0`, or `1` |
| `isZero()` | Returns `true` if zero |
| `toNumber()` | Convert to JS `number` (may lose precision) |
| `toString()` | Human-readable string (`"1/3"`) |

### `determinant(p1, p2, p3)`

Exact 2D orientation test. Returns the sign of the 2×2 determinant formed by three `{x, y}` points.

### `determinant3(p1, p2, p3, p4)`

Exact 3D plane-side test. Returns the sign of the 3×3 determinant formed by four `{x, y, z}` points.

## License

MIT
