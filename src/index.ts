import { bouncingBallsApp } from "./ui";
import { Environment, typesOfBall } from "./model";

const environment: Environment = {
  dimensions: { width: 10, height: 6 },
  gravity: { direction: -Math.PI/2, magnitude: 9.8 },
  wind: { direction: 0, magnitude: 0 },
  fluidDensity: 1.2,
};

const [appElement] = bouncingBallsApp({
  simulation: { environment, maxNumBalls: 100 },
  typesOfBall,
});

document.getElementById('container')?.appendChild(appElement);
