import { BallCharacteristics, Simulation, Vector } from "../model";
import { Canvas } from "./dom";

/**
 * This module contains logic for running a bouncing balls simulation in the browser
 */

export type BouncingBallsAppConfig = Readonly<{
  simulation: Omit<Simulation.Config, 'frequency'>
  typesOfBall: ReadonlyArray<BallCharacteristics>
}>;

/**
 * Creates a bouncing balls simulation in the DOM
 */
export function bouncingBallsApp(
  config: BouncingBallsAppConfig
): [element: SVGElement, stopSimulation: () => void] {
  const canvas = new Canvas(config.simulation.environment.dimensions);

  function randomBall(): BallCharacteristics {
    const randomIndex = Math.round(Math.random() * (config.typesOfBall.length - 1))
    return config.typesOfBall[randomIndex];
  }

  // Each time the canvas is clicked, we'll spawn a new ball in the simulation
  const cancelListener = canvas.onClick(location => {
    simulation.spawnBall({
      characteristics: randomBall(),
      state: { location, velocity: randomVelocity() },
    });
  });

  // frequency should ideally be multiple of 60 to give smoothest possible animation at 60fps
  const [simulation, stopSimulation] = runSimulation(config.simulation, () => canvas.render(simulation.balls));

  const stop = () => {
    cancelListener();
    stopSimulation();
  };

  return [canvas.domElement, stop];
}

const initialFrequency = 1200;
const targetSimUpdateLatencyMs = 4;

/**
 * Runs a bouncing balls simulation until stopped
 * 
 * @param render A function which will render the state of the simulation to the DOM. Called by a RAF callback
 */
function runSimulation(config: BouncingBallsAppConfig['simulation'], render: () => void): [simulation: Simulation, stop: () => void] {
  const simulation = new Simulation({ ...config, frequency: initialFrequency });

  const simulationStartTime = performance.now();
  let totalPauseTime = 0;
  let lastTickTime = simulationStartTime;

  const tick = () => {
    // note -- do not use the timestamp provided by raf to this callback -- it's too stale
    if (stopped) {
      return;
    }

    const currentTime = performance.now();

    const timeSinceLastTick = currentTime - lastTickTime;
    if (timeSinceLastTick > 500) {
      /**
       * no ticks for more than 500ms. The tab probably lost focus denying us CPU. Don't try to
       * simulate all of the missed frames or we'll block rendering for ages. Instead we'll treat
       * the missed period as a pause in the simulation.
       */
       totalPauseTime += timeSinceLastTick;
    }

    const targetSimTimestamp = (currentTime - simulationStartTime - totalPauseTime) / 1000;
    simulation.advanceToTime(targetSimTimestamp);
    // how long did it take to update the simulation?
    const simUpdateLatencyMs = Math.max(1, performance.now() - currentTime);
    // update the frequency of the simulation based on how long it took to update vs our ideal latency
    const idealFrequency = simulation.frequency * targetSimUpdateLatencyMs / simUpdateLatencyMs;
    simulation.frequency = Math.max(300, Math.min(6000, idealFrequency));

    render();

    lastTickTime = currentTime;

    if (!stopped) {
      // schedule the next tick
      rafHandle = requestAnimationFrame(tick);
    }
  };

  let stopped = false;
  // schedule the first tick
  let rafHandle = requestAnimationFrame(tick);  

  const stop = () => {
    stopped = true;
    cancelAnimationFrame(rafHandle);
  };

  return [simulation, stop];
}

function randomVelocity(): Vector {
  return {
    direction: 2 * Math.PI * Math.random() - Math.PI,
    magnitude: 15 * Math.random(),
  };
}
