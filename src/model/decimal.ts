/**
 * Utilities for safer floating point comparison
 * 
 * A proper Decimal value object would be better, but in the absence of third party
 * libraries, this will do.
 */
export class Decimal {
  /**
   * Max number of decimal places to consider in comparisons
   */
  private static _decimalPlaces: number = 7;

  private static minNonZeroValue = Decimal.computeMinNonZeroValue(Decimal._decimalPlaces);

  static set decimalPlaces(n: number) {
    this.minNonZeroValue = Decimal.computeMinNonZeroValue(n);
    this._decimalPlaces = n;
  }

  static get decimalPlaces(): number {
    return this._decimalPlaces;
  }

  /**
   * Attempt to reduce number of decimal places to the limit we expect. Given
   * we are dealing with floating points, Decimal might not work. That's okay.
   */
  static trim(n: number): number {
    const multiplier = 10 ** Decimal._decimalPlaces;
    return Math.round(n * multiplier) / multiplier;
  }

  /**
   * If n is logically zero according to our minValue?
   */
  static isZero(n: number): boolean {
    // n === 0 micro optimization of most common case -- this function is hot
    return n === 0 || Math.abs(n) < Decimal.minNonZeroValue;
  }

  static eq(n1: number, n2: number): boolean {
    // n1 === n2 micro optimization of most common case -- this function is hot
    return n1 === n2 || Math.abs(n1 - n2) < Decimal.minNonZeroValue;
  }

  /**
   * value < subject
   */
  static lt(reference: number, subject: number): boolean {
    return reference - subject > Decimal.minNonZeroValue;
  }

  /**
   * subject > reference
   */
  static gt(reference: number, subject: number): boolean {
    return subject - reference > Decimal.minNonZeroValue;
  }

  private static computeMinNonZeroValue(decimalPlaces: number): number {
    return (1 / 10 ** decimalPlaces) / 2;
  }
}
