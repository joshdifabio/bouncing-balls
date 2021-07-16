import assert from "assert";
import 'mocha';
import { Decimal } from "./decimal";

describe('Decimal.trim', () => {
  it('should correctly handle positive numbers', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.trim(1.000011);

    assert.strictEqual(result, 1.00001);
  });

  it('should correctly handle negative numbers', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.trim(-1.000011);

    assert.strictEqual(result, -1.00001);
  });
});

describe('Decimal.isZero', () => {
  it('should correctly handle positive zero', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(0);

    assert.strictEqual(result, true);
  });

  it('should correctly handle negative zero', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(-0);
    
    assert.strictEqual(result, true);
  });

  it('should correctly handle positive almost zero number', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(0.000001);
    
    assert.strictEqual(result, true);
  });

  it('should correctly handle negative almost zero number', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(-0.000001);
    
    assert.strictEqual(result, true);
  });

  it('should correctly handle positive small number', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(0.00001);
    
    assert.strictEqual(result, false);
  });

  it('should correctly handle negative small number', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.isZero(-0.00001);
    
    assert.strictEqual(result, false);
  });
});

describe('Decimal.eq', () => {
  it('should correctly compare effectively equal numbers', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.eq(1.00001001, 1.00001);
    
    assert.strictEqual(result, true);
  });

  it('should correctly compare non-equal numbers', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.eq(1.00002001, 1.00001);
    
    assert.strictEqual(result, false);
  });
});

describe('Decimal.lt', () => {
  it('should correctly identify subject < reference', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.lt(1.00001, 1.000001);
    
    assert.strictEqual(result, true);
  });

  it('should correctly identify subject >= reference', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.lt(1.000001, 1.00001);
    
    assert.strictEqual(result, false);
  });
});

describe('Decimal.gt', () => {
  it('should correctly identify subject > reference', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.gt(1.000001, 1.00001);
    
    assert.strictEqual(result, true);
  });

  it('should correctly identify subject <= reference', () => {
    Decimal.decimalPlaces = 5;
    const result = Decimal.gt(1.00001, 1.000001);
    
    assert.strictEqual(result, false);
  });
});
