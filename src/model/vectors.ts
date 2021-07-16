import { Point } from "./cartesian-system";
import { Decimal } from "./decimal";

/**
 * In mathematics, physics and engineering, a Euclidean vector or simply a vector (sometimes
 * called a geometric vector or spatial vector) is a geometric object that has magnitude
 * (or length) and direction. Vectors can be added to other vectors according to vector algebra.
 * 
 * @see https://en.wikipedia.org/wiki/Euclidean_vector
 */

export type Vector = Readonly<{
  // Direction in radians from -Pi to +Pi. 0 is right, +Pi is left, +Pi/2 is up, -Pi/2 is down.
  direction: number
  magnitude: number
}>;

export type XY = Readonly<{
  x: number
  y: number
}>;

export namespace Vector {
  export const zero: Vector = Object.freeze({ direction: 0, magnitude: 0 });
  
  export function fromXy(xy: XY): Vector {
    return {
      direction: Point.calculateAngleOfRay(Point.origin, xy),
      magnitude: Point.calculateEuclideanDistance(Point.origin, xy),
    };
  }

  export function add(...vectors: Vector[]): Vector {
    // xy() is quite expensive due to calls to trigonometric functions, so remove zero vectors
    const nonZeroVectors = vectors.filter(vector => !Decimal.isZero(vector.magnitude));

    // this function is super hot so we do some micro-optimization of [] and [x] cases
    switch (nonZeroVectors.length) {
      case 0:
        return zero;

      case 1:
        return nonZeroVectors[0];

      default: {
        const xyMagnitudes = vectors
          // xy() is quite expensive due to calls to trigonometrics functions, so remove 0 vectors
          .filter(vector => !Decimal.isZero(vector.magnitude))
          .map(xy);
        const totalXyMagnitude = Point.add(...xyMagnitudes);
        return fromXy(totalXyMagnitude);
      };
    }
  }

  export function multiplyBy(multiplier: number, multiplicand: Vector): Vector {
    return { direction: multiplicand.direction, magnitude: multiplicand.magnitude * multiplier };
  }

  export function divideBy(divisor: number, dividend: Vector): Vector {
    return { direction: dividend.direction, magnitude: dividend.magnitude / divisor };
  }

  export function xy(vector: Vector): XY {
    return { x: x(vector), y: y(vector) };
  }

  export function x({ direction, magnitude }: Vector): number {
    if (Decimal.isZero(magnitude)) {
      // avoid expensive trig if possible
      return 0;
    }
    return magnitude * Math.cos(direction);
  }
  
  export function y({ direction, magnitude }: Vector): number {
    if (Decimal.isZero(magnitude)) {
      // avoid expensive trig if possible
      return 0;
    }
    return magnitude * Math.sin(direction);
  }
}
