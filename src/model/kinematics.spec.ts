import assert from "assert";
import 'mocha';
import * as Kinematics from "./kinematics";
import { Decimal } from "./decimal";

describe('Kinematics.calculateNewVelocity', () => {
  it('should correctly calculate new velocity', () => {
    const result = Kinematics.calculateNewVelocity(
      { direction: 0, magnitude: 2 },
      { direction: Math.PI, magnitude: 5 },
      3,
    );

    assert.deepStrictEqual(result, { direction: Math.PI, magnitude: 13 });
  });
});

describe('Kinematics.calculateNewLocation', () => {
  it('should correctly calculate new location', () => {
    const { x, y } = Kinematics.calculateNewLocation(
      {
        location: { x: 1, y: -2 },
        velocity: { direction: Math.PI / 2, magnitude: 3 },
      },
      { direction: -Math.PI / 2, magnitude: 9.8 },
      2.5,
    );

    assert(Decimal.eq(1, x) && Decimal.eq(-25.125, y));
  });
});
