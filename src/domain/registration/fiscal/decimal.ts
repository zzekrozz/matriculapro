export type DecimalInput = string | number;

/**
 * Fracción decimal exacta basada en BigInt.
 *
 * Los importes y tipos fiscales entran como decimales finitos y se conservan como
 * fracciones reducidas. No se usa IEEE-754 durante la cadena de cálculo; la
 * conversión a number solo se realiza al construir el resultado público.
 */
export class ExactDecimal {
  readonly numerator: bigint;
  readonly denominator: bigint;

  private constructor(numerator: bigint, denominator: bigint) {
    if (denominator === 0n) throw new RangeError('El denominador no puede ser cero.');
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = greatestCommonDivisor(abs(numerator), abs(denominator));
    this.numerator = (numerator * sign) / divisor;
    this.denominator = (denominator * sign) / divisor;
  }

  static from(value: DecimalInput | ExactDecimal): ExactDecimal {
    if (value instanceof ExactDecimal) return value;
    const text = typeof value === 'number' ? numberToPlainString(value) : value.trim();
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
    if (!match) throw new TypeError(`Decimal no válido: ${String(value)}`);
    const fraction = match[3] ?? '';
    const sign = match[1] === '-' ? -1n : 1n;
    const coefficient = BigInt(`${match[2]}${fraction}`) * sign;
    return new ExactDecimal(coefficient, 10n ** BigInt(fraction.length));
  }

  static ratio(numerator: bigint, denominator: bigint): ExactDecimal {
    return new ExactDecimal(numerator, denominator);
  }

  plus(value: DecimalInput | ExactDecimal): ExactDecimal {
    const other = ExactDecimal.from(value);
    return new ExactDecimal(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  minus(value: DecimalInput | ExactDecimal): ExactDecimal {
    const other = ExactDecimal.from(value);
    return new ExactDecimal(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  times(value: DecimalInput | ExactDecimal): ExactDecimal {
    const other = ExactDecimal.from(value);
    return new ExactDecimal(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  dividedBy(value: DecimalInput | ExactDecimal): ExactDecimal {
    const other = ExactDecimal.from(value);
    if (other.numerator === 0n) throw new RangeError('No se puede dividir por cero.');
    return new ExactDecimal(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  compare(value: DecimalInput | ExactDecimal): -1 | 0 | 1 {
    const other = ExactDecimal.from(value);
    const difference = this.numerator * other.denominator - other.numerator * this.denominator;
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  }

  isNegative(): boolean {
    return this.numerator < 0n;
  }

  toFixed(decimalPlaces: number): string {
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 30) {
      throw new RangeError('Los decimales deben ser un entero entre 0 y 30.');
    }
    const scale = 10n ** BigInt(decimalPlaces);
    const unsignedNumerator = abs(this.numerator) * scale;
    let quotient = unsignedNumerator / this.denominator;
    const remainder = unsignedNumerator % this.denominator;
    if (remainder * 2n >= this.denominator) quotient += 1n;

    const sign = this.numerator < 0n && quotient !== 0n ? '-' : '';
    if (decimalPlaces === 0) return `${sign}${quotient}`;
    const digits = quotient.toString().padStart(decimalPlaces + 1, '0');
    return `${sign}${digits.slice(0, -decimalPlaces)}.${digits.slice(-decimalPlaces)}`;
  }

  toDecimalString(maxDecimalPlaces = 18): string {
    return this.toFixed(maxDecimalPlaces).replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/, '').replace(/\.$/, '');
  }

  toNumber(maxDecimalPlaces = 18): number {
    return Number(this.toDecimalString(maxDecimalPlaces));
  }
}

export function moneyNumber(value: ExactDecimal): number {
  return Number(value.toFixed(2));
}

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let left = a;
  let right = b;
  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left === 0n ? 1n : left;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function numberToPlainString(value: number): string {
  if (!Number.isFinite(value)) throw new TypeError('El decimal debe ser finito.');
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [mantissa, exponentText] = text.toLowerCase().split('e');
  const exponent = Number(exponentText);
  const sign = mantissa.startsWith('-') ? '-' : '';
  const unsigned = mantissa.replace(/^[+-]/, '');
  const [integer, fraction = ''] = unsigned.split('.');
  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length + exponent;
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}
