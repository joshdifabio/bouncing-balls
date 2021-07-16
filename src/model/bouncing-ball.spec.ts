import assert from "assert";
import 'mocha';
import { Simulation } from "./bouncing-ball";
import { football } from "./types-of-ball";
import { Vector } from "./vectors";

/**
 * This is a bit nasty. Basically, the physics model is simplistic and doesn't
 * use differential calculus, but rather forces are estimated and are then
 * applied statically for a period of time (~1ms). This causes objects to
 * oscillate a minute amount when they become close to stationary rather than
 * fully stopping, although they appear to do so when viewed in the browser.
 */
it('should eventually determine that balls are stationary', () => {
  const simulation = new Simulation({
    frequency: 1200,
    environment: {
      dimensions: {
        width: 10,
        height: 10,
      },
      fluidDensity: 1.2,
      gravity: { direction: -Math.PI / 2, magnitude: 9.8 },
      wind: Vector.zero,
    },
  });

  simulation.spawnBall({
    characteristics: football,
    state: { 
      velocity: { direction: 0, magnitude: 0 },
      location: { x: 5, y: 5 },
    }
  });

  let numIterationsWithZeroishVelocity = 0;
  for (let tickNum = 0; tickNum < 300; tickNum++) {
    const [ball] = simulation.advance(1200);
    if (Math.abs(ball.state.velocity.magnitude) < 0.1) {
      numIterationsWithZeroishVelocity++
    } else {
      numIterationsWithZeroishVelocity = 0;
    }
    if (numIterationsWithZeroishVelocity === 100) {
      break;
    }
  }

  assert(numIterationsWithZeroishVelocity === 100);
});
