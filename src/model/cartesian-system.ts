/**
 * A Cartesian coordinate system (UK: /kɑːˈtiːzjən/, US: /kɑːrˈtiʒən/) in a plane is a coordinate
 * system that specifies each point uniquely by a pair of numerical coordinates, which are the
 * signed distances to the point from two fixed perpendicular oriented lines, measured in the same
 * unit of length.
 * 
 * @see https://en.wikipedia.org/wiki/Cartesian_coordinate_system
 */

/**
 * A cartesian point
 */
export type Point = Readonly<{
  x: number
  y: number
}>;

export namespace Point {
  export const origin: Point = Object.freeze({ x: 0, y: 0 });

  export function add(...points: Point[]): Point {
    // this function is super hot so we do some micro-optimization of [] and [x] cases
    switch (points.length) {
      case 0:
        return origin;

      case 1:
        return points[0];
      
      default:
        return {
          x: points.reduce((total, point) => total + point.x, 0),
          y: points.reduce((total, point) => total + point.y, 0),
        };
    }
  }

  export function multiplyBy(multiplier: number, multiplicand: Point): Point {
    return {
      x: multiplier * multiplicand.x,
      y: multiplier * multiplicand.y,
    };
  }

  export function divideBy(divisor: number, dividend: Point): Point {
    return {
      x: dividend.x / divisor,
      y: dividend.y / divisor,
    };
  }

  /**
   * Calculates the angle between the positive x axis and the ray from origin to point
   */
  export function calculateAngleOfRay(origin: Point, point: Point): number {
    /** @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2 */

    const deltaX = point.x - origin.x;
    const deltaY = point.y - origin.y;

    return Math.atan2(deltaY, deltaX);
  }

  export function calculateEuclideanDistance(point1: Point, point2: Point): number {
    /** @see https://en.wikipedia.org/wiki/Pythagorean_theorem */

    const deltaX = Math.abs(point1.x - point2.x);
    const deltaY = Math.abs(point1.y - point2.y);

    return (deltaX ** 2 + deltaY ** 2) ** 0.5;
  }
}
