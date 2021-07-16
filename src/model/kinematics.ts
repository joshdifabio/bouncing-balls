import { Point } from "./cartesian-system";
import { Decimal } from "./decimal";
import { Vector } from "./vectors";

/**
 * Kinematics is a subfield of physics, developed in classical mechanics, that describes the
 * motion of points, bodies (objects), and systems of bodies (groups of objects) without
 * considering the forces that cause them to move.
 * 
 * @see https://en.wikipedia.org/wiki/Kinematics
 */

export type Body = Readonly<{
  /** Unit: m */
  location: Point

  /** Unit: m·s⁻¹ */
  velocity: Vector
}>;

export function calculateNewVelocity(initialVelocity: Vector, acceleration: Vector, time: number): Vector {
  if (Decimal.isZero(acceleration.magnitude)) {
    // this is a micro optimisation as this function is hot and Vector.add is quite expensive
    return initialVelocity;
  }
  const changeOfVelocity = Vector.multiplyBy(time, acceleration);
  return Vector.add(initialVelocity, changeOfVelocity);
}

export function calculateNewLocation(initialState: Body, acceleration: Vector, time: number): Point {
  let averageVelocity: Vector;
  if (Decimal.isZero(acceleration.magnitude)) {
    // this is a micro optimisation as this function is hot and Vector.add is quite expensive
    averageVelocity = initialState.velocity;
  } else {
    const finalVelocity = calculateNewVelocity(initialState.velocity, acceleration, time);
    averageVelocity = Vector.divideBy(2, Vector.add(initialState.velocity, finalVelocity));
  }
  const locationDelta = Vector.multiplyBy(time, averageVelocity);
  return Point.add(initialState.location, Vector.xy(locationDelta));
}
