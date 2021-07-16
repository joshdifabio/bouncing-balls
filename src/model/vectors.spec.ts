import assert from "assert";
import 'mocha';
import { Point } from "./cartesian-system";
import { assertPointsEqual } from "./cartesian-system.spec";
import { Decimal } from "./decimal";
import { Vector } from "./vectors";

describe('Vector.fromXy', () => {
  it('should correctly convert from a cartesian point', () => {
    const result = Vector.fromXy({ x: 2, y: -2 });

    assert.deepStrictEqual(result, { direction: -Math.PI / 4, magnitude: 8**0.5 });
  });
});

describe('Vector.xy', () => {
  it('should correctly convert to a cartesian point', () => {
    const result = Vector.xy({ direction: -Math.PI / 4, magnitude: 8**0.5 });

    assertPointsEqual(result, { x: 2, y: -2 });
  });
});

describe('Vector.add', () => {
  it('should correctly add multiple vectors', () => {
    const result = addPointsViaVector(
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: -1, y: -10 },
    );

    assertPointsEqual(result, { x: 0, y: -7 });
  });

  it('should correctly handle zero args', () => {
    const result = addPointsViaVector();

    assertPointsEqual(result, { x: 0, y: 0 });
  });

  it('should correctly handle one arg', () => {
    const result = addPointsViaVector({ x: 5, y: 10 });

    assertPointsEqual(result, { x: 5, y: 10 });
  });
});

describe('Vector.multiplyBy', () => {
  it('should correctly multiply by non-zero value', () => {
    const result = Vector.multiplyBy(5, Vector.fromXy({ x: 1, y: -2 }));

    assertPointsEqual(Vector.xy(result), { x: 5, y: -10 });
  });

  it('should correctly multiply by zero value', () => {
    const result = Vector.multiplyBy(0, Vector.fromXy({ x: 1, y: -2 }));

    assertPointsEqual(Vector.xy(result), { x: 0, y: 0 });
  });
});

describe('Vector.divideBy', () => {
  it('should correctly divide by non-zero value', () => {
    const result = Vector.divideBy(5, Vector.fromXy({ x: 1, y: -2 }));

    assertPointsEqual(Vector.xy(result), { x: 0.2, y: -0.4 });
  });

  it('should correctly divide by zero value', () => {
    const result = Vector.divideBy(0, Vector.fromXy({ x: 1, y: -2 }));

    assertPointsEqual(Vector.xy(result), { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY });
  });
});

export function assertVectorsEqual(actual: Vector, expected: Vector): void {
  assert.deepStrictEqual(trimPointValues(actual), trimPointValues(expected));
}

function trimPointValues(vector: Vector): Vector {
  return {
    direction: Decimal.trim(vector.direction),
    magnitude: Decimal.trim(vector.magnitude),
  };
}

function addPointsViaVector(...points: Point[]): Point {
  const sum = Vector.add(...points.map(Vector.fromXy));
  const pointResult = Vector.xy(sum);
  return {
    x: Decimal.trim(pointResult.x),
    y: Decimal.trim(pointResult.y),
  };
}
