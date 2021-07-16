import { BallCharacteristics } from "./bouncing-ball";
import { PASCALS_PER_PSI } from "./imperial-metric-conversion";

/**
 * This module contains the characteristics of various kinds of ball.
 * 
 * Some of these values I found online, some I guessed. I spent too long on this part.
 */

export const beachBall = pressurisedBall({
  coefficientOfRestitution: 0.2,
  dragCoefficient: 0.8,
  mass: 0.07,
  radius: 0.18,
  pressure: 4.6,
});

export const cricketBall: BallCharacteristics = {
  coefficientOfRestitution: 0.6,
  dragCoefficient: 0.5,
  mass: 0.163,
  radius: 0.0364,
  // This is a guess
  springConstant: 10000,
};

export const football = pressurisedBall({
  coefficientOfRestitution: 0.8,
  dragCoefficient: 0.2,
  mass: 0.45,
  radius: 0.11,
  pressure: 10,
});

export const golfBall: BallCharacteristics = {
  coefficientOfRestitution: 0.9,
  dragCoefficient: 0.24,
  mass: 0.045,
  radius: 0.02,
  // This is a guess
  springConstant: 2000,
};

/*
export const tableTennisBall = pressurisedBall({
  coefficientOfRestitution: 0.8,
  // dragCoefficient: 0.2,
  // mass: 0.45,
  // radius: 0.11,
  // pressure: 10,
});
*/

export const tennisBall = pressurisedBall({
  coefficientOfRestitution: 0.75,
  dragCoefficient: 0.6,
  mass: 0.058,
  radius: 0.0385,
  pressure: 13.7,
});

export const volleyball = pressurisedBall({
  coefficientOfRestitution: 0.75,
  dragCoefficient: 0.17,
  mass: 0.260,
  radius: 0.105,
  pressure: 4.4,
});

export const typesOfBall = Object.freeze([
  beachBall,
  football,
  //golfBall,
  tennisBall,
  volleyball,
]);

/**
 * Calculates the spring constant based on the external pressure of a pressurised ball
 */
function pressurisedBall(characteristics: PressurisedBall): BallCharacteristics {
  const { pressure, ...rest } = characteristics;
  return {
    ...rest,
    /** @see https://www.google.com/search?q=psi+to+pascals */
    springConstant: characteristics.radius * characteristics.pressure * PASCALS_PER_PSI,
  }
}

type PressurisedBall = Omit<BallCharacteristics, 'springConstant'> & {
  /**
   * External pressure
   * 
   * Unit: psi (lbf·in⁻²)
   */
  pressure: number
};
