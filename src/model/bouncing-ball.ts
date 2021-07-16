import { Point } from "./cartesian-system";
import * as Kinematics from "./kinematics";
import { Decimal } from "./decimal";
import { Vector } from "./vectors";

export type Ball = Readonly<{
  characteristics: BallCharacteristics

  state: Kinematics.Body
}>;

export type BallCharacteristics = Readonly<{
  /** Unit: m */
  radius: number
  
  /** Unit: kg */
  mass: number

  /**
   * @see https://en.wikipedia.org/wiki/Drag_coefficient
   * 
   * Dimensionless
   */
  dragCoefficient: number

  /**
   * @see https://en.wikipedia.org/wiki/Coefficient_of_restitution
   * 
   * Dimensionless
   */
  coefficientOfRestitution: number

  /**
   * @see https://en.wikipedia.org/wiki/Hooke%27s_law
   * 
   * Unit: N·m⁻¹
   */
  springConstant: number
}>;

export type Environment = Readonly<{
  /** Unit: m */
  dimensions: { width: number, height: number },

  /** Unit: m·s⁻² */
  gravity: Vector

  /** Unit: m·s⁻¹ */
  wind: Vector

  /** Unit: kg·m⁻³ -- Earth's atmosphere: 1.2; water: 997 */
  fluidDensity: number
}>;

/**
 * A physics engine for simulating the bouncing of balls
 */
export class Simulation {
  constructor(
    private readonly config: Simulation.Config,
  ) {}

  /**
   * Current state of the environment -- this can be mutated via
   * `simulation.environment = someOtherEnvironmentState`, e.g. to change wind level
   */
  public environment: Environment = this.config.environment;

  /**
   * The number of ticks per second in the simulation; suggested at least 1200 hz
   * 
   * Unit: hz
   */
  public frequency: number = this.config.frequency;

  private _balls: ReadonlyArray<Ball> = [];

  get balls(): ReadonlyArray<Ball> {
    return this._balls;
  }

  private _timestamp: number = 0;

  /**
   * The number of seconds elapsed in the simulation
   */
  get timestamp(): number {
    return this._timestamp;
  }

  /**
   * @param timestamp The target simulation timestamp
   * @returns The balls at the new timestamp, or the current balls of timestamp is in the past
   */
  advanceToTime(timestamp: number): ReadonlyArray<Ball> {
    const timeDelta = timestamp - this.timestamp;
    return this.advanceByTime(timeDelta);
  }

  /**
   * @param timeDelta The time in s to advance by
   * @returns The balls at the new timestamp, or the current balls of timestamp is in the past
   */
  advanceByTime(timeDelta: number): ReadonlyArray<Ball> {
    const ticksDelta = Math.round(timeDelta * this.frequency);
    return this.advance(ticksDelta);
  }

  advance(ticks: number): ReadonlyArray<Ball> {
    if (ticks < 0) {
      throw new Error('Simulation cannot go backwards in time yet.');
    }
    let balls = this._balls;
    // Note that this.environment can be mutated during this generator invokation, changing wind levels etc. That's fine.
    for (let i = 0; i < ticks; i++) {
      balls = computeNextState(this.environment, balls, 1 / this.frequency);
    }
    this._timestamp = this.timestamp + ticks / this.frequency;
    this._balls = balls;
    return balls;
  }

  spawnBall(ball: Ball): void {
    this.spawnBalls([ball]);
  }

  spawnBalls(balls: Ball[]): void {
    // add the balls, but only keep the last `n`
    const n = this.config.maxNumBalls || 10;
    this._balls = [...this._balls, ...balls].slice(-n);
  }
}

export namespace Simulation {
  export type Config = Readonly<{
    environment: Environment

    /**
     * The number of ticks per second in the simulation; suggested at least 1200 hz
     * 
     * Unit: hz
     */
    frequency: number

    /**
     * Max number of balls allowed in the simulation before we start removing them FIFO
     * 
     * Default: 10
     */
    maxNumBalls?: number
  }>;
}

/**
 * Compute the next state of the balls
 */
export function computeNextState(environment: Environment, balls: ReadonlyArray<Ball>, timeDelta: number): ReadonlyArray<Ball> {
  const [ballsPerRegion, regionsPerBall] = groupBallsByRegion(environment.dimensions, balls);

  return balls.map((ball, i): Ball => {
    // get the regions of the environment overlapped by this ball
    const relevantRegions = regionsPerBall[i];
    // get all the balls which overlap the same regions of the environment as this ball
    const allBallsInRelevantRegions = new Set(relevantRegions.flatMap(region => ballsPerRegion[region]));
    const possiblyTouchingBalls = [...allBallsInRelevantRegions].filter(_ball => _ball !== ball);

    const force = calculateNetForceActingUponBall(environment, ball, possiblyTouchingBalls);
    const acceleration = Vector.divideBy(ball.characteristics.mass, force);
    const newVelocity = Kinematics.calculateNewVelocity(ball.state.velocity, acceleration, timeDelta);

    return {
      characteristics: ball.characteristics,
      state: {
        velocity: newVelocity,
        location: Kinematics.calculateNewLocation(ball.state, newVelocity, timeDelta),
      },
    };
  });
}

/**
 * calculateForceAppliedByOtherBalls() needs to calculate forces of balls on each other -- i.e. collisions -- but
 * this is O(N^2) where N is the number of balls. This gets uber slow with lots of balls. We can improve this
 * by grouping the balls into regions first and then only calculating ball collision forces for balls which
 * overlap the same regions.
 */
function groupBallsByRegion(dimensions: Environment['dimensions'], balls: ReadonlyArray<Ball>) {
  const regionWidth = 0.2; // metres
  const numRegions = Math.ceil(dimensions.width / regionWidth);

  const ballsPerRegion: ReadonlyArray<Ball[]> = new Array(numRegions).fill(null).map(() => []);
  
  const regionsPerBall = balls.map(ball => {
    // find the regions this ball overlaps
    const xMin = ball.state.location.x - ball.characteristics.radius;
    const minRegionIdx = Math.max(0, Math.floor(xMin / regionWidth));

    const xMax = ball.state.location.x + ball.characteristics.radius;
    const maxRegionIdx = Math.min(numRegions - 1, Math.floor(xMax / regionWidth));

    for (let regionIdx = minRegionIdx; regionIdx <= maxRegionIdx; regionIdx++) {
      ballsPerRegion[regionIdx].push(ball);
    }

    return range(minRegionIdx, maxRegionIdx);
  });

  return [ballsPerRegion, regionsPerBall] as const;
}

function calculateNetForceActingUponBall(environment: Environment, ball: Ball, otherBalls: Ball[]): Vector {
  const raw = Vector.add(
    calculateEnvironmentalForces(environment, ball),
    calculateForceAppliedByOtherBalls(ball, otherBalls),
  );
  return {
    direction: raw.direction,
    magnitude: Decimal.trim(raw.magnitude),
  };
}

function calculateEnvironmentalForces(environment: Environment, ball: Ball): Vector {
  return Vector.add(
    Vector.multiplyBy(ball.characteristics.mass, environment.gravity),
    calculateForceAppliedByDrag(environment, ball),
    calculateForceAppliedByWind(environment, ball),
    calculateForceAppliedBySurfaces(environment, ball),
  );
}

function calculateForceAppliedByOtherBalls(ball: Ball, otherBalls: Ball[]): Vector {
  return Vector.add(
    ...otherBalls.map(otherBall => calculateForceAppliedByOtherBall(ball, otherBall))
  );
}

function calculateForceAppliedByDrag(environment: Environment, ball: Ball): Vector {
  /** @see https://en.wikipedia.org/wiki/Drag_equation */
  
  const v = ball.state.velocity;
  const area = Math.PI * ball.characteristics.radius**2;

  return Vector.multiplyBy(-0.5 * environment.fluidDensity * v.magnitude * ball.characteristics.dragCoefficient * area, v);
}

function calculateForceAppliedByWind(environment: Environment, ball: Ball): Vector {
  return { direction: 0, magnitude: 0 };
}

/**
 * Note that this function does not take into account force imparting spin on ball
 * and corresponding reduced rebound force
 */
function calculateForceAppliedBySurfaces(environment: Environment, ball: Ball): Vector {
  return Vector.add(
    // top surface applies force vertically down on ball -- direction = -Math.PI / 2
    calculateForceAppliedBySurface(-Math.PI / 2, ball, ballLocation => {
      return ball.characteristics.radius + ballLocation.y - environment.dimensions.height;
    }),
    // right surface applies force horizontally left on ball -- collision directon = Math.PI
    calculateForceAppliedBySurface(Math.PI, ball, ballLocation => {
      return ball.characteristics.radius + ballLocation.x - environment.dimensions.width;
    }),
    // bottom surface applies force vertically up on ball -- collision direction = Math.PI / 2
    calculateForceAppliedBySurface(Math.PI / 2, ball, ballLocation => {
      return ball.characteristics.radius - ballLocation.y;
    }),
    // left surface applies force horizontally right on ball -- collision direction = 0
    calculateForceAppliedBySurface(0, ball, ballLocation => {
      return ball.characteristics.radius - ballLocation.x;
    }),
  );
}

/**
 * Note that this function does not take into account force imparting spin on ball
 * and corresponding reduced rebound force
 */
 function calculateForceAppliedBySurface(
  collisionDirection: number,
  ball: Ball,
  calcCompression: (location: Point) => number,
): Vector {
  /** @see https://en.wikipedia.org/wiki/Hooke%27s_law */
  /** @see https://en.wikipedia.org/wiki/Coefficient_of_restitution */

  const currentCompression = calcCompression(ball.state.location);

  if (Decimal.lt(0, currentCompression)) {
    // optimisation: avoid expensive computation below
    return Vector.zero;
  }

  // ensure balls don't move forever -- simplistic heuristic to model energy lost to friction, heat, sound, etc.
  const energyLoss = Vector.multiplyBy(-ball.characteristics.mass, ball.state.velocity);

  if (Decimal.isZero(currentCompression)) {
    // optimisation: avoid expensive computation below
    return energyLoss;
  }

  // get approx location in 1 microsecond time
  const nextLocation = Kinematics.calculateNewLocation(ball.state, Vector.zero, 1 / 1e6);
  const nextCompression = calcCompression(nextLocation);
  // reasonable approximation for whether ball is leaving surface 
  const ballIsLeavingSurface = Decimal.lt(currentCompression, nextCompression);
  /**
   * This is a simplistic model of CoR but it does the job. Arbitrary multiplier 0.6 is necessary
   * because of imperfections in this model. This is probably because forces are calculated at time
   * t0 and applied until t1, which means that when the force at t0 is less than at t1, such as
   * when a ball is converging with a surface, the force applied is generally less than it ought to
   * be; while when the force at t0 is greater than at t1, such as when a ball is leaving a surface,
   * the force applied is generally higher than it ought to be. This means that balls bounce continually
   * higher. The 0.6 multiplier when the ball is leaving the surface counters this. Not a perfect 
   * solution by any means!
   */
  const forceMultiplier = ballIsLeavingSurface ? 0.7 * ball.characteristics.coefficientOfRestitution : 1;
  
  return Vector.add(
    energyLoss,
    {
      direction: collisionDirection,
      magnitude: currentCompression * ball.characteristics.springConstant * forceMultiplier,
    },
  );
}

/**
 * Note that this function is very simplistic:
 * - it does not model coefficient of restitution properly, as this would be impractical
 * - it does not take into account force imparting spin on balls or friction in general
 * - more things are probably missing
 */
function calculateForceAppliedByOtherBall(ball: Ball, otherBall: Ball): Vector {
  /** @see https://en.wikipedia.org/wiki/Hooke%27s_law */
  /** @see https://en.wikipedia.org/wiki/Series_and_parallel_springs */

  const distanceBetweenRadii = Point.calculateEuclideanDistance(ball.state.location, otherBall.state.location);
  const combinedCompression = ball.characteristics.radius + otherBall.characteristics.radius - distanceBetweenRadii;

  if (Decimal.lt(0, combinedCompression)) {
    // optimisation: avoid expensive computation below
    return Vector.zero;
  }

  const combinedStiffness = (ball.characteristics.springConstant ** -1 + otherBall.characteristics.springConstant ** -1) ** -1;

  /**
   * This is a very simplistic model of CoR but it should be adequate
   */
  const forceMultiplier =
    ballsAreDiverging(ball, otherBall)
      ? 0.5 * ball.characteristics.coefficientOfRestitution * otherBall.characteristics.coefficientOfRestitution
      : 1;
  
  return {
    direction: Point.calculateAngleOfRay(otherBall.state.location, ball.state.location),
    magnitude: combinedCompression * combinedStiffness * forceMultiplier,
  };
}

/**
 * Approximate whether two balls are moving away from each other -- I'm not a mathematician!
 */
function ballsAreDiverging(ball1: Ball, ball2: Ball): boolean {
  const currentDistanceBetweenBalls = Point.calculateEuclideanDistance(ball1.state.location, ball2.state.location);

  // get approx location of balls in 1 microsecond time ignoring acceleration -- only an approximation
  const nextLocationOfBall1 = Kinematics.calculateNewLocation(ball1.state, Vector.zero, 1 / 1e6);
  const nextLocationOfBall2 = Kinematics.calculateNewLocation(ball2.state, Vector.zero, 1 / 1e6);
  const nextDistanceBetweenBalls = Point.calculateEuclideanDistance(nextLocationOfBall1, nextLocationOfBall2);
  
  return Decimal.gt(currentDistanceBetweenBalls, nextDistanceBetweenBalls);
}

function range(from: number, to: number): number[] {
  const result: number[] = [];
  for (let n = from; n <= to; n++) {
    result.push(n);
  }
  return result;
}
