import assert from "assert";
import 'mocha';
import { Point } from "./cartesian-system";
import { Decimal } from "./decimal";

describe('Point.add', () => {
  it('should correctly add multiple points', () => {
    const result = Point.add(
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: -1, y: -10 },
    );

    assertPointsEqual(result, { x: 0, y: -7 });
  });

  it('should correctly handle zero args', () => {
    const result = Point.add();

    assertPointsEqual(result, { x: 0, y: 0 });
  });

  it('should correctly handle one arg', () => {
    const result = Point.add({ x: 5, y: 10 });

    assertPointsEqual(result, { x: 5, y: 10 });
  });
});

describe('Point.multiplyBy', () => {
  it('should correctly multiply by non-zero value', () => {
    const result = Point.multiplyBy(5, { x: 1, y: -2 });

    assertPointsEqual(result, { x: 5, y: -10 });
  });

  it('should correctly multiply by zero value', () => {
    const result = Point.multiplyBy(0, { x: 1, y: -2 });

    assertPointsEqual(result, { x: 0, y: -0 });
  });
});

describe('Point.divideBy', () => {
  it('should correctly divide by non-zero value', () => {
    const result = Point.divideBy(5, { x: 1, y: -2 });

    assertPointsEqual(result, { x: 0.2, y: -0.4 });
  });

  it('should correctly divide by zero value', () => {
    const result = Point.divideBy(0, { x: 1, y: -2 });

    assertPointsEqual(result, { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY });
  });
});

describe('Point.calculateAngleOfRay', () => {
  it('should correctly calculate angle of ray', () => {
    const result = Point.calculateAngleOfRay({ x: 0, y: 0 }, { x: 1, y: 1 });

    assert.strictEqual(result, Math.PI / 4);
  });
});

describe('Point.calculateEuclideanDistance', () => {
  it('should correctly calculate distance', () => {
    const result = Point.calculateEuclideanDistance({ x: 0, y: 0 }, { x: 1, y: 1 });

    assert.strictEqual(result, 2**0.5);
  });
});

export function assertPointsEqual(actual: Point, expected: Point): void {
  assert.deepStrictEqual(trimPointValues(actual), trimPointValues(expected));
}

function trimPointValues(point: Point): Point {
  return {
    x: Decimal.trim(point.x),
    y: Decimal.trim(point.y),
  };
}
