/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/model/bouncing-ball.ts":
/*!************************************!*\
  !*** ./src/model/bouncing-ball.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Simulation": () => (/* binding */ Simulation),
/* harmony export */   "computeNextState": () => (/* binding */ computeNextState)
/* harmony export */ });
/* harmony import */ var _cartesian_system__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./cartesian-system */ "./src/model/cartesian-system.ts");
/* harmony import */ var _kinematics__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./kinematics */ "./src/model/kinematics.ts");
/* harmony import */ var _decimal__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./decimal */ "./src/model/decimal.ts");
/* harmony import */ var _vectors__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./vectors */ "./src/model/vectors.ts");




/**
 * A physics engine for simulating the bouncing of balls
 */
class Simulation {
    constructor(config) {
        this.config = config;
        /**
         * Current state of the environment -- this can be mutated via
         * `simulation.environment = someOtherEnvironmentState`, e.g. to change wind level
         */
        this.environment = this.config.environment;
        /**
         * The number of ticks per second in the simulation; suggested at least 1200 hz
         *
         * Unit: hz
         */
        this.frequency = this.config.frequency;
        this._balls = [];
        this._timestamp = 0;
    }
    get balls() {
        return this._balls;
    }
    /**
     * The number of seconds elapsed in the simulation
     */
    get timestamp() {
        return this._timestamp;
    }
    /**
     * @param timestamp The target simulation timestamp
     * @returns The balls at the new timestamp, or the current balls of timestamp is in the past
     */
    advanceToTime(timestamp) {
        const timeDelta = timestamp - this.timestamp;
        return this.advanceByTime(timeDelta);
    }
    /**
     * @param timeDelta The time in s to advance by
     * @returns The balls at the new timestamp, or the current balls of timestamp is in the past
     */
    advanceByTime(timeDelta) {
        const ticksDelta = Math.round(timeDelta * this.frequency);
        return this.advance(ticksDelta);
    }
    advance(ticks) {
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
    spawnBall(ball) {
        this.spawnBalls([ball]);
    }
    spawnBalls(balls) {
        // add the balls, but only keep the last `n`
        const n = this.config.maxNumBalls || 10;
        this._balls = [...this._balls, ...balls].slice(-n);
    }
}
/**
 * Compute the next state of the balls
 */
function computeNextState(environment, balls, timeDelta) {
    const [ballsPerRegion, regionsPerBall] = groupBallsByRegion(environment.dimensions, balls);
    return balls.map((ball, i) => {
        // get the regions of the environment overlapped by this ball
        const relevantRegions = regionsPerBall[i];
        // get all the balls which overlap the same regions of the environment as this ball
        const allBallsInRelevantRegions = new Set(relevantRegions.flatMap(region => ballsPerRegion[region]));
        const possiblyTouchingBalls = [...allBallsInRelevantRegions].filter(_ball => _ball !== ball);
        const force = calculateNetForceActingUponBall(environment, ball, possiblyTouchingBalls);
        const acceleration = _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.divideBy(ball.characteristics.mass, force);
        const newVelocity = _kinematics__WEBPACK_IMPORTED_MODULE_1__.calculateNewVelocity(ball.state.velocity, acceleration, timeDelta);
        return {
            characteristics: ball.characteristics,
            state: {
                velocity: newVelocity,
                location: _kinematics__WEBPACK_IMPORTED_MODULE_1__.calculateNewLocation(ball.state, newVelocity, timeDelta),
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
function groupBallsByRegion(dimensions, balls) {
    const regionWidth = 0.2; // metres
    const numRegions = Math.ceil(dimensions.width / regionWidth);
    const ballsPerRegion = new Array(numRegions).fill(null).map(() => []);
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
    return [ballsPerRegion, regionsPerBall];
}
function calculateNetForceActingUponBall(environment, ball, otherBalls) {
    const raw = _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.add(calculateEnvironmentalForces(environment, ball), calculateForceAppliedByOtherBalls(ball, otherBalls));
    return {
        direction: raw.direction,
        magnitude: _decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.trim(raw.magnitude),
    };
}
function calculateEnvironmentalForces(environment, ball) {
    return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.add(_vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.multiplyBy(ball.characteristics.mass, environment.gravity), calculateForceAppliedByDrag(environment, ball), calculateForceAppliedByWind(environment, ball), calculateForceAppliedBySurfaces(environment, ball));
}
function calculateForceAppliedByOtherBalls(ball, otherBalls) {
    return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.add(...otherBalls.map(otherBall => calculateForceAppliedByOtherBall(ball, otherBall)));
}
function calculateForceAppliedByDrag(environment, ball) {
    /** @see https://en.wikipedia.org/wiki/Drag_equation */
    const v = ball.state.velocity;
    const area = Math.PI * ball.characteristics.radius ** 2;
    return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.multiplyBy(-0.5 * environment.fluidDensity * v.magnitude * ball.characteristics.dragCoefficient * area, v);
}
function calculateForceAppliedByWind(environment, ball) {
    return { direction: 0, magnitude: 0 };
}
/**
 * Note that this function does not take into account force imparting spin on ball
 * and corresponding reduced rebound force
 */
function calculateForceAppliedBySurfaces(environment, ball) {
    return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.add(
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
    }));
}
/**
 * Note that this function does not take into account force imparting spin on ball
 * and corresponding reduced rebound force
 */
function calculateForceAppliedBySurface(collisionDirection, ball, calcCompression) {
    /** @see https://en.wikipedia.org/wiki/Hooke%27s_law */
    /** @see https://en.wikipedia.org/wiki/Coefficient_of_restitution */
    const currentCompression = calcCompression(ball.state.location);
    if (_decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.lt(0, currentCompression)) {
        // optimisation: avoid expensive computation below
        return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.zero;
    }
    // ensure balls don't move forever -- simplistic heuristic to model energy lost to friction, heat, sound, etc.
    const energyLoss = _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.multiplyBy(-ball.characteristics.mass, ball.state.velocity);
    if (_decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.isZero(currentCompression)) {
        // optimisation: avoid expensive computation below
        return energyLoss;
    }
    // get approx location in 1 microsecond time
    const nextLocation = _kinematics__WEBPACK_IMPORTED_MODULE_1__.calculateNewLocation(ball.state, _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.zero, 1 / 1e6);
    const nextCompression = calcCompression(nextLocation);
    // reasonable approximation for whether ball is leaving surface 
    const ballIsLeavingSurface = _decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.lt(currentCompression, nextCompression);
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
    return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.add(energyLoss, {
        direction: collisionDirection,
        magnitude: currentCompression * ball.characteristics.springConstant * forceMultiplier,
    });
}
/**
 * Note that this function is very simplistic:
 * - it does not model coefficient of restitution properly, as this would be impractical
 * - it does not take into account force imparting spin on balls or friction in general
 * - more things are probably missing
 */
function calculateForceAppliedByOtherBall(ball, otherBall) {
    /** @see https://en.wikipedia.org/wiki/Hooke%27s_law */
    /** @see https://en.wikipedia.org/wiki/Series_and_parallel_springs */
    const distanceBetweenRadii = _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateEuclideanDistance(ball.state.location, otherBall.state.location);
    const combinedCompression = ball.characteristics.radius + otherBall.characteristics.radius - distanceBetweenRadii;
    if (_decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.lt(0, combinedCompression)) {
        // optimisation: avoid expensive computation below
        return _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.zero;
    }
    const combinedStiffness = (ball.characteristics.springConstant ** -1 + otherBall.characteristics.springConstant ** -1) ** -1;
    /**
     * This is a very simplistic model of CoR but it should be adequate
     */
    const forceMultiplier = ballsAreDiverging(ball, otherBall)
        ? 0.5 * ball.characteristics.coefficientOfRestitution * otherBall.characteristics.coefficientOfRestitution
        : 1;
    return {
        direction: _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateAngleOfRay(otherBall.state.location, ball.state.location),
        magnitude: combinedCompression * combinedStiffness * forceMultiplier,
    };
}
/**
 * Approximate whether two balls are moving away from each other -- I'm not a mathematician!
 */
function ballsAreDiverging(ball1, ball2) {
    const currentDistanceBetweenBalls = _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateEuclideanDistance(ball1.state.location, ball2.state.location);
    // get approx location of balls in 1 microsecond time ignoring acceleration -- only an approximation
    const nextLocationOfBall1 = _kinematics__WEBPACK_IMPORTED_MODULE_1__.calculateNewLocation(ball1.state, _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.zero, 1 / 1e6);
    const nextLocationOfBall2 = _kinematics__WEBPACK_IMPORTED_MODULE_1__.calculateNewLocation(ball2.state, _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector.zero, 1 / 1e6);
    const nextDistanceBetweenBalls = _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateEuclideanDistance(nextLocationOfBall1, nextLocationOfBall2);
    return _decimal__WEBPACK_IMPORTED_MODULE_2__.Decimal.gt(currentDistanceBetweenBalls, nextDistanceBetweenBalls);
}
function range(from, to) {
    const result = [];
    for (let n = from; n <= to; n++) {
        result.push(n);
    }
    return result;
}


/***/ }),

/***/ "./src/model/cartesian-system.ts":
/*!***************************************!*\
  !*** ./src/model/cartesian-system.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Point": () => (/* binding */ Point)
/* harmony export */ });
/**
 * A Cartesian coordinate system (UK: /kɑːˈtiːzjən/, US: /kɑːrˈtiʒən/) in a plane is a coordinate
 * system that specifies each point uniquely by a pair of numerical coordinates, which are the
 * signed distances to the point from two fixed perpendicular oriented lines, measured in the same
 * unit of length.
 *
 * @see https://en.wikipedia.org/wiki/Cartesian_coordinate_system
 */
var Point;
(function (Point) {
    Point.origin = Object.freeze({ x: 0, y: 0 });
    function add(...points) {
        // this function is super hot so we do some micro-optimization of [] and [x] cases
        switch (points.length) {
            case 0:
                return Point.origin;
            case 1:
                return points[0];
            default:
                return {
                    x: points.reduce((total, point) => total + point.x, 0),
                    y: points.reduce((total, point) => total + point.y, 0),
                };
        }
    }
    Point.add = add;
    function multiplyBy(multiplier, multiplicand) {
        return {
            x: multiplier * multiplicand.x,
            y: multiplier * multiplicand.y,
        };
    }
    Point.multiplyBy = multiplyBy;
    function divideBy(divisor, dividend) {
        return {
            x: dividend.x / divisor,
            y: dividend.y / divisor,
        };
    }
    Point.divideBy = divideBy;
    /**
     * Calculates the angle between the positive x axis and the ray from origin to point
     */
    function calculateAngleOfRay(origin, point) {
        /** @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2 */
        const deltaX = point.x - origin.x;
        const deltaY = point.y - origin.y;
        return Math.atan2(deltaY, deltaX);
    }
    Point.calculateAngleOfRay = calculateAngleOfRay;
    function calculateEuclideanDistance(point1, point2) {
        /** @see https://en.wikipedia.org/wiki/Pythagorean_theorem */
        const deltaX = Math.abs(point1.x - point2.x);
        const deltaY = Math.abs(point1.y - point2.y);
        return (deltaX ** 2 + deltaY ** 2) ** 0.5;
    }
    Point.calculateEuclideanDistance = calculateEuclideanDistance;
})(Point || (Point = {}));


/***/ }),

/***/ "./src/model/decimal.ts":
/*!******************************!*\
  !*** ./src/model/decimal.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Decimal": () => (/* binding */ Decimal)
/* harmony export */ });
/**
 * Utilities for safer floating point comparison
 *
 * A proper Decimal value object would be better, but in the absence of third party
 * libraries, this will do.
 */
class Decimal {
    static set decimalPlaces(n) {
        this.minNonZeroValue = Decimal.computeMinNonZeroValue(n);
        this._decimalPlaces = n;
    }
    static get decimalPlaces() {
        return this._decimalPlaces;
    }
    /**
     * Attempt to reduce number of decimal places to the limit we expect. Given
     * we are dealing with floating points, Decimal might not work. That's okay.
     */
    static trim(n) {
        const multiplier = 10 ** Decimal._decimalPlaces;
        return Math.round(n * multiplier) / multiplier;
    }
    /**
     * If n is logically zero according to our minValue?
     */
    static isZero(n) {
        // n === 0 micro optimization of most common case -- this function is hot
        return n === 0 || Math.abs(n) < Decimal.minNonZeroValue;
    }
    static eq(n1, n2) {
        // n1 === n2 micro optimization of most common case -- this function is hot
        return n1 === n2 || Math.abs(n1 - n2) < Decimal.minNonZeroValue;
    }
    /**
     * value < subject
     */
    static lt(reference, subject) {
        return reference - subject > Decimal.minNonZeroValue;
    }
    /**
     * subject > reference
     */
    static gt(reference, subject) {
        return subject - reference > Decimal.minNonZeroValue;
    }
    static computeMinNonZeroValue(decimalPlaces) {
        return (1 / 10 ** decimalPlaces) / 2;
    }
}
/**
 * Max number of decimal places to consider in comparisons
 */
Decimal._decimalPlaces = 7;
Decimal.minNonZeroValue = Decimal.computeMinNonZeroValue(Decimal._decimalPlaces);


/***/ }),

/***/ "./src/model/imperial-metric-conversion.ts":
/*!*************************************************!*\
  !*** ./src/model/imperial-metric-conversion.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "METRES_PER_INCH": () => (/* binding */ METRES_PER_INCH),
/* harmony export */   "KILOGRAMS_PER_POUND": () => (/* binding */ KILOGRAMS_PER_POUND),
/* harmony export */   "NEWTONS_PER_POUND_FORCE": () => (/* binding */ NEWTONS_PER_POUND_FORCE),
/* harmony export */   "PASCALS_PER_PSI": () => (/* binding */ PASCALS_PER_PSI)
/* harmony export */ });
/** in -> m */
const METRES_PER_INCH = 0.0254;
/** lb -> kg */
const KILOGRAMS_PER_POUND = 0.453592;
/** lbf -> N */
const NEWTONS_PER_POUND_FORCE = 4.44822;
/** lbf·in⁻² -> N·m⁻² */
const PASCALS_PER_PSI = NEWTONS_PER_POUND_FORCE / METRES_PER_INCH ** 2;


/***/ }),

/***/ "./src/model/index.ts":
/*!****************************!*\
  !*** ./src/model/index.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Simulation": () => (/* reexport safe */ _bouncing_ball__WEBPACK_IMPORTED_MODULE_0__.Simulation),
/* harmony export */   "computeNextState": () => (/* reexport safe */ _bouncing_ball__WEBPACK_IMPORTED_MODULE_0__.computeNextState),
/* harmony export */   "beachBall": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.beachBall),
/* harmony export */   "cricketBall": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.cricketBall),
/* harmony export */   "football": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.football),
/* harmony export */   "golfBall": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.golfBall),
/* harmony export */   "tennisBall": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.tennisBall),
/* harmony export */   "typesOfBall": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.typesOfBall),
/* harmony export */   "volleyball": () => (/* reexport safe */ _types_of_ball__WEBPACK_IMPORTED_MODULE_1__.volleyball),
/* harmony export */   "Point": () => (/* reexport safe */ _cartesian_system__WEBPACK_IMPORTED_MODULE_2__.Point),
/* harmony export */   "Vector": () => (/* reexport safe */ _vectors__WEBPACK_IMPORTED_MODULE_3__.Vector)
/* harmony export */ });
/* harmony import */ var _bouncing_ball__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bouncing-ball */ "./src/model/bouncing-ball.ts");
/* harmony import */ var _types_of_ball__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./types-of-ball */ "./src/model/types-of-ball.ts");
/* harmony import */ var _cartesian_system__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./cartesian-system */ "./src/model/cartesian-system.ts");
/* harmony import */ var _vectors__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./vectors */ "./src/model/vectors.ts");




/**
 * This module contains a model of the physics necessary to simulate bouncing balls
 */


/***/ }),

/***/ "./src/model/kinematics.ts":
/*!*********************************!*\
  !*** ./src/model/kinematics.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "calculateNewVelocity": () => (/* binding */ calculateNewVelocity),
/* harmony export */   "calculateNewLocation": () => (/* binding */ calculateNewLocation)
/* harmony export */ });
/* harmony import */ var _cartesian_system__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./cartesian-system */ "./src/model/cartesian-system.ts");
/* harmony import */ var _decimal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./decimal */ "./src/model/decimal.ts");
/* harmony import */ var _vectors__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./vectors */ "./src/model/vectors.ts");



function calculateNewVelocity(initialVelocity, acceleration, time) {
    if (_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(acceleration.magnitude)) {
        // this is a micro optimisation as this function is hot and Vector.add is quite expensive
        return initialVelocity;
    }
    const changeOfVelocity = _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.multiplyBy(time, acceleration);
    return _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.add(initialVelocity, changeOfVelocity);
}
function calculateNewLocation(initialState, acceleration, time) {
    let averageVelocity;
    if (_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(acceleration.magnitude)) {
        // this is a micro optimisation as this function is hot and Vector.add is quite expensive
        averageVelocity = initialState.velocity;
    }
    else {
        const finalVelocity = calculateNewVelocity(initialState.velocity, acceleration, time);
        averageVelocity = _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.divideBy(2, _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.add(initialState.velocity, finalVelocity));
    }
    const locationDelta = _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.multiplyBy(time, averageVelocity);
    return _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.add(initialState.location, _vectors__WEBPACK_IMPORTED_MODULE_2__.Vector.xy(locationDelta));
}


/***/ }),

/***/ "./src/model/types-of-ball.ts":
/*!************************************!*\
  !*** ./src/model/types-of-ball.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "beachBall": () => (/* binding */ beachBall),
/* harmony export */   "cricketBall": () => (/* binding */ cricketBall),
/* harmony export */   "football": () => (/* binding */ football),
/* harmony export */   "golfBall": () => (/* binding */ golfBall),
/* harmony export */   "tennisBall": () => (/* binding */ tennisBall),
/* harmony export */   "volleyball": () => (/* binding */ volleyball),
/* harmony export */   "typesOfBall": () => (/* binding */ typesOfBall)
/* harmony export */ });
/* harmony import */ var _imperial_metric_conversion__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./imperial-metric-conversion */ "./src/model/imperial-metric-conversion.ts");
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};

/**
 * This module contains the characteristics of various kinds of ball.
 *
 * Some of these values I found online, some I guessed. I spent too long on this part.
 */
const beachBall = pressurisedBall({
    coefficientOfRestitution: 0.2,
    dragCoefficient: 0.8,
    mass: 0.07,
    radius: 0.18,
    pressure: 4.6,
});
const cricketBall = {
    coefficientOfRestitution: 0.6,
    dragCoefficient: 0.5,
    mass: 0.163,
    radius: 0.0364,
    // This is a guess
    springConstant: 10000,
};
const football = pressurisedBall({
    coefficientOfRestitution: 0.8,
    dragCoefficient: 0.2,
    mass: 0.45,
    radius: 0.11,
    pressure: 10,
});
const golfBall = {
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
const tennisBall = pressurisedBall({
    coefficientOfRestitution: 0.75,
    dragCoefficient: 0.6,
    mass: 0.058,
    radius: 0.0385,
    pressure: 13.7,
});
const volleyball = pressurisedBall({
    coefficientOfRestitution: 0.75,
    dragCoefficient: 0.17,
    mass: 0.260,
    radius: 0.105,
    pressure: 4.4,
});
const typesOfBall = Object.freeze([
    beachBall,
    football,
    //golfBall,
    tennisBall,
    volleyball,
]);
/**
 * Calculates the spring constant based on the external pressure of a pressurised ball
 */
function pressurisedBall(characteristics) {
    const { pressure } = characteristics, rest = __rest(characteristics, ["pressure"]);
    return Object.assign(Object.assign({}, rest), { 
        /** @see https://www.google.com/search?q=psi+to+pascals */
        springConstant: characteristics.radius * characteristics.pressure * _imperial_metric_conversion__WEBPACK_IMPORTED_MODULE_0__.PASCALS_PER_PSI });
}


/***/ }),

/***/ "./src/model/vectors.ts":
/*!******************************!*\
  !*** ./src/model/vectors.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Vector": () => (/* binding */ Vector)
/* harmony export */ });
/* harmony import */ var _cartesian_system__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./cartesian-system */ "./src/model/cartesian-system.ts");
/* harmony import */ var _decimal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./decimal */ "./src/model/decimal.ts");


var Vector;
(function (Vector) {
    Vector.zero = Object.freeze({ direction: 0, magnitude: 0 });
    function fromXy(xy) {
        return {
            direction: _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateAngleOfRay(_cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.origin, xy),
            magnitude: _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.calculateEuclideanDistance(_cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.origin, xy),
        };
    }
    Vector.fromXy = fromXy;
    function add(...vectors) {
        // xy() is quite expensive due to calls to trigonometric functions, so remove zero vectors
        const nonZeroVectors = vectors.filter(vector => !_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(vector.magnitude));
        // this function is super hot so we do some micro-optimization of [] and [x] cases
        switch (nonZeroVectors.length) {
            case 0:
                return Vector.zero;
            case 1:
                return nonZeroVectors[0];
            default:
                {
                    const xyMagnitudes = vectors
                        // xy() is quite expensive due to calls to trigonometrics functions, so remove 0 vectors
                        .filter(vector => !_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(vector.magnitude))
                        .map(xy);
                    const totalXyMagnitude = _cartesian_system__WEBPACK_IMPORTED_MODULE_0__.Point.add(...xyMagnitudes);
                    return fromXy(totalXyMagnitude);
                }
                ;
        }
    }
    Vector.add = add;
    function multiplyBy(multiplier, multiplicand) {
        return { direction: multiplicand.direction, magnitude: multiplicand.magnitude * multiplier };
    }
    Vector.multiplyBy = multiplyBy;
    function divideBy(divisor, dividend) {
        return { direction: dividend.direction, magnitude: dividend.magnitude / divisor };
    }
    Vector.divideBy = divideBy;
    function xy(vector) {
        return { x: x(vector), y: y(vector) };
    }
    Vector.xy = xy;
    function x({ direction, magnitude }) {
        if (_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(magnitude)) {
            // avoid expensive trig if possible
            return 0;
        }
        return magnitude * Math.cos(direction);
    }
    Vector.x = x;
    function y({ direction, magnitude }) {
        if (_decimal__WEBPACK_IMPORTED_MODULE_1__.Decimal.isZero(magnitude)) {
            // avoid expensive trig if possible
            return 0;
        }
        return magnitude * Math.sin(direction);
    }
    Vector.y = y;
})(Vector || (Vector = {}));


/***/ }),

/***/ "./src/ui/dom.ts":
/*!***********************!*\
  !*** ./src/ui/dom.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Canvas": () => (/* binding */ Canvas)
/* harmony export */ });
/**
 * This module contains functionality for rendering the state of the bouncing balls to the DOM
 */
class Canvas {
    constructor(dimensions) {
        this.clickListeners = [];
        this.ballElements = [];
        this.domElement = Canvas.createSvg(dimensions);
        this.boundingRect = this.createBoundingBox(dimensions);
        this.domElement.appendChild(this.boundingRect);
    }
    /**
     * Renders the provided balls to the canvas
     */
    render(balls) {
        for (let i = 0; i < balls.length; i++) {
            const ball = balls[i];
            if (!this.ballElements[i]) {
                const circle = Canvas.createBallElement(ball.characteristics.radius);
                this.domElement.appendChild(circle);
                this.ballElements.push(circle);
            }
            this.ballElements[i].setAttribute('transform', `translate(${ball.state.location.x} ${-ball.state.location.y})`);
            this.ballElements[i].setAttribute('r', `${ball.characteristics.radius}`);
        }
    }
    /**
     * Adds a listener which will be fired when the canvas is clicked. The location
     * provided to the listener will be according to the coordinate system of the
     * bouncing balls environment.
     */
    onClick(listener) {
        this.clickListeners = [...this.clickListeners, listener];
        const cancelListener = () => {
            this.clickListeners = this.clickListeners.filter(l => l !== listener);
        };
        return cancelListener;
    }
    static createSvg(dimensions) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
        return svg;
    }
    createBoundingBox(dimensions) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', `${dimensions.width}`);
        rect.setAttribute('height', `${dimensions.height}`);
        rect.setAttribute('fill', '#111');
        rect.onclick = event => {
            const boundingRect = rect.getBoundingClientRect();
            const xPct = (event.clientX - boundingRect.left) / boundingRect.width;
            // 1 - n because svg coordinates are top to bottom where as we want bottom to top
            const yPct = 1 - (event.clientY - boundingRect.top) / boundingRect.height;
            const location = { x: xPct * dimensions.width, y: yPct * dimensions.height };
            this.clickListeners.forEach(listener => listener(location));
        };
        return rect;
    }
    static createBallElement(radius) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const colour = `rgb(${randRgb()}, ${randRgb()}, ${randRgb()})`;
        circle.setAttribute('fill', colour);
        circle.setAttribute('cx', '0');
        circle.setAttribute('cy', '100%');
        return circle;
    }
}
function randRgb() {
    // darker colours are easier to see, so we use max 128 rather than 256
    return Math.round(128 + 128 * Math.random());
}


/***/ }),

/***/ "./src/ui/index.ts":
/*!*************************!*\
  !*** ./src/ui/index.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bouncingBallsApp": () => (/* binding */ bouncingBallsApp)
/* harmony export */ });
/* harmony import */ var _model__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../model */ "./src/model/index.ts");
/* harmony import */ var _dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./dom */ "./src/ui/dom.ts");


/**
 * Creates a bouncing balls simulation in the DOM
 */
function bouncingBallsApp(config) {
    const canvas = new _dom__WEBPACK_IMPORTED_MODULE_1__.Canvas(config.simulation.environment.dimensions);
    function randomBall() {
        const randomIndex = Math.round(Math.random() * (config.typesOfBall.length - 1));
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
function runSimulation(config, render) {
    const simulation = new _model__WEBPACK_IMPORTED_MODULE_0__.Simulation(Object.assign(Object.assign({}, config), { frequency: initialFrequency }));
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
function randomVelocity() {
    return {
        direction: 2 * Math.PI * Math.random() - Math.PI,
        magnitude: 15 * Math.random(),
    };
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ui__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ui */ "./src/ui/index.ts");
/* harmony import */ var _model__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./model */ "./src/model/index.ts");
var _a;


const environment = {
    dimensions: { width: 10, height: 6 },
    gravity: { direction: -Math.PI / 2, magnitude: 9.8 },
    wind: { direction: 0, magnitude: 0 },
    fluidDensity: 1.2,
};
const [appElement] = (0,_ui__WEBPACK_IMPORTED_MODULE_0__.bouncingBallsApp)({
    simulation: { environment, maxNumBalls: 100 },
    typesOfBall: _model__WEBPACK_IMPORTED_MODULE_1__.typesOfBall,
});
(_a = document.getElementById('container')) === null || _a === void 0 ? void 0 : _a.appendChild(appElement);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy9tb2RlbC9ib3VuY2luZy1iYWxsLnRzIiwid2VicGFjazovL0Bqb3NoZGlmYWJpby9ib3VuY2luZy1iYWxsLy4vc3JjL21vZGVsL2NhcnRlc2lhbi1zeXN0ZW0udHMiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvLi9zcmMvbW9kZWwvZGVjaW1hbC50cyIsIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy9tb2RlbC9pbXBlcmlhbC1tZXRyaWMtY29udmVyc2lvbi50cyIsIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy9tb2RlbC9pbmRleC50cyIsIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy9tb2RlbC9raW5lbWF0aWNzLnRzIiwid2VicGFjazovL0Bqb3NoZGlmYWJpby9ib3VuY2luZy1iYWxsLy4vc3JjL21vZGVsL3R5cGVzLW9mLWJhbGwudHMiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvLi9zcmMvbW9kZWwvdmVjdG9ycy50cyIsIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy91aS9kb20udHMiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvLi9zcmMvdWkvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL0Bqb3NoZGlmYWJpby9ib3VuY2luZy1iYWxsL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vQGpvc2hkaWZhYmlvL2JvdW5jaW5nLWJhbGwvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9Aam9zaGRpZmFiaW8vYm91bmNpbmctYmFsbC8uL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQTJDO0FBQ0E7QUFDUDtBQUNEO0FBbURuQzs7R0FFRztBQUNJLE1BQU0sVUFBVTtJQUNyQixZQUNtQixNQUF5QjtRQUF6QixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUc1Qzs7O1dBR0c7UUFDSSxnQkFBVyxHQUFnQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUUxRDs7OztXQUlHO1FBQ0ksY0FBUyxHQUFXLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO1FBRXpDLFdBQU0sR0FBd0IsRUFBRSxDQUFDO1FBTWpDLGVBQVUsR0FBVyxDQUFDLENBQUM7SUFyQjVCLENBQUM7SUFpQkosSUFBSSxLQUFLO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFJRDs7T0FFRztJQUNILElBQUksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsYUFBYSxDQUFDLFNBQWlCO1FBQzdCLE1BQU0sU0FBUyxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQzdDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsYUFBYSxDQUFDLFNBQWlCO1FBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELE9BQU8sQ0FBQyxLQUFhO1FBQ25CLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztTQUNoRTtRQUNELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDeEIscUhBQXFIO1FBQ3JILEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDdkU7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDMUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxDQUFDLElBQVU7UUFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFhO1FBQ3RCLDRDQUE0QztRQUM1QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FDRjtBQXNCRDs7R0FFRztBQUNJLFNBQVMsZ0JBQWdCLENBQUMsV0FBd0IsRUFBRSxLQUEwQixFQUFFLFNBQWlCO0lBQ3RHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUUzRixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFRLEVBQUU7UUFDakMsNkRBQTZEO1FBQzdELE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxtRkFBbUY7UUFDbkYsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRyxNQUFNLHFCQUFxQixHQUFHLENBQUMsR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQztRQUU3RixNQUFNLEtBQUssR0FBRywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDeEYsTUFBTSxZQUFZLEdBQUcscURBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RSxNQUFNLFdBQVcsR0FBRyw2REFBK0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFbEcsT0FBTztZQUNMLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUNyQyxLQUFLLEVBQUU7Z0JBQ0wsUUFBUSxFQUFFLFdBQVc7Z0JBQ3JCLFFBQVEsRUFBRSw2REFBK0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUM7YUFDOUU7U0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGtCQUFrQixDQUFDLFVBQXFDLEVBQUUsS0FBMEI7SUFDM0YsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUMsU0FBUztJQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFFN0QsTUFBTSxjQUFjLEdBQTBCLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFN0YsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN0QyxzQ0FBc0M7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDO1FBQ2pFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFakUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDO1FBQ2pFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTlFLEtBQUssSUFBSSxTQUFTLEdBQUcsWUFBWSxFQUFFLFNBQVMsSUFBSSxZQUFZLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDekUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN0QztRQUVELE9BQU8sS0FBSyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFVLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQVMsK0JBQStCLENBQUMsV0FBd0IsRUFBRSxJQUFVLEVBQUUsVUFBa0I7SUFDL0YsTUFBTSxHQUFHLEdBQUcsZ0RBQVUsQ0FDcEIsNEJBQTRCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUMvQyxpQ0FBaUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQ3BELENBQUM7SUFDRixPQUFPO1FBQ0wsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTO1FBQ3hCLFNBQVMsRUFBRSxrREFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7S0FDdkMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLFdBQXdCLEVBQUUsSUFBVTtJQUN4RSxPQUFPLGdEQUFVLENBQ2YsdURBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUNqRSwyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQzlDLDJCQUEyQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFDOUMsK0JBQStCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUNuRCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsaUNBQWlDLENBQUMsSUFBVSxFQUFFLFVBQWtCO0lBQ3ZFLE9BQU8sZ0RBQVUsQ0FDZixHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FDbEYsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLDJCQUEyQixDQUFDLFdBQXdCLEVBQUUsSUFBVTtJQUN2RSx1REFBdUQ7SUFFdkQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDOUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUM7SUFFdEQsT0FBTyx1REFBaUIsQ0FBQyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzNILENBQUM7QUFFRCxTQUFTLDJCQUEyQixDQUFDLFdBQXdCLEVBQUUsSUFBVTtJQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDeEMsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsK0JBQStCLENBQUMsV0FBd0IsRUFBRSxJQUFVO0lBQzNFLE9BQU8sZ0RBQVU7SUFDZixnRkFBZ0Y7SUFDaEYsOEJBQThCLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLEVBQUU7UUFDaEUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQ3RGLENBQUMsQ0FBQztJQUNGLHdGQUF3RjtJQUN4Riw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsRUFBRTtRQUMzRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7SUFDckYsQ0FBQyxDQUFDO0lBQ0YsMEZBQTBGO0lBQzFGLDhCQUE4QixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsRUFBRTtRQUMvRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDO0lBQ0YsbUZBQW1GO0lBQ25GLDhCQUE4QixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLEVBQUU7UUFDckQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDO0FBRUQ7OztHQUdHO0FBQ0YsU0FBUyw4QkFBOEIsQ0FDdEMsa0JBQTBCLEVBQzFCLElBQVUsRUFDVixlQUE0QztJQUU1Qyx1REFBdUQ7SUFDdkQsb0VBQW9FO0lBRXBFLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFaEUsSUFBSSxnREFBVSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO1FBQ3JDLGtEQUFrRDtRQUNsRCxPQUFPLGlEQUFXLENBQUM7S0FDcEI7SUFFRCw4R0FBOEc7SUFDOUcsTUFBTSxVQUFVLEdBQUcsdURBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXRGLElBQUksb0RBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1FBQ3RDLGtEQUFrRDtRQUNsRCxPQUFPLFVBQVUsQ0FBQztLQUNuQjtJQUVELDRDQUE0QztJQUM1QyxNQUFNLFlBQVksR0FBRyw2REFBK0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGlEQUFXLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZGLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN0RCxnRUFBZ0U7SUFDaEUsTUFBTSxvQkFBb0IsR0FBRyxnREFBVSxDQUFDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzdFOzs7Ozs7Ozs7T0FTRztJQUNILE1BQU0sZUFBZSxHQUFHLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXZHLE9BQU8sZ0RBQVUsQ0FDZixVQUFVLEVBQ1Y7UUFDRSxTQUFTLEVBQUUsa0JBQWtCO1FBQzdCLFNBQVMsRUFBRSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsR0FBRyxlQUFlO0tBQ3RGLENBQ0YsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsZ0NBQWdDLENBQUMsSUFBVSxFQUFFLFNBQWU7SUFDbkUsdURBQXVEO0lBQ3ZELHFFQUFxRTtJQUVyRSxNQUFNLG9CQUFvQixHQUFHLCtFQUFnQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0csTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQztJQUVsSCxJQUFJLGdEQUFVLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLEVBQUU7UUFDdEMsa0RBQWtEO1FBQ2xELE9BQU8saURBQVcsQ0FBQztLQUNwQjtJQUVELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRTdIOztPQUVHO0lBQ0gsTUFBTSxlQUFlLEdBQ25CLGlCQUFpQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUM7UUFDaEMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsd0JBQXdCO1FBQzFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFUixPQUFPO1FBQ0wsU0FBUyxFQUFFLHdFQUF5QixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQ25GLFNBQVMsRUFBRSxtQkFBbUIsR0FBRyxpQkFBaUIsR0FBRyxlQUFlO0tBQ3JFLENBQUM7QUFDSixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLEtBQVcsRUFBRSxLQUFXO0lBQ2pELE1BQU0sMkJBQTJCLEdBQUcsK0VBQWdDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVqSCxvR0FBb0c7SUFDcEcsTUFBTSxtQkFBbUIsR0FBRyw2REFBK0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLGlEQUFXLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQy9GLE1BQU0sbUJBQW1CLEdBQUcsNkRBQStCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxpREFBVyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMvRixNQUFNLHdCQUF3QixHQUFHLCtFQUFnQyxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFFNUcsT0FBTyxnREFBVSxDQUFDLDJCQUEyQixFQUFFLHdCQUF3QixDQUFDLENBQUM7QUFDM0UsQ0FBQztBQUVELFNBQVMsS0FBSyxDQUFDLElBQVksRUFBRSxFQUFVO0lBQ3JDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEI7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7QUM3WEQ7Ozs7Ozs7R0FPRztBQVVJLElBQVUsS0FBSyxDQXNEckI7QUF0REQsV0FBaUIsS0FBSztJQUNQLFlBQU0sR0FBVSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUUzRCxTQUFnQixHQUFHLENBQUMsR0FBRyxNQUFlO1FBQ3BDLGtGQUFrRjtRQUNsRixRQUFRLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDckIsS0FBSyxDQUFDO2dCQUNKLE9BQU8sWUFBTSxDQUFDO1lBRWhCLEtBQUssQ0FBQztnQkFDSixPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuQjtnQkFDRSxPQUFPO29CQUNMLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN0RCxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDdkQsQ0FBQztTQUNMO0lBQ0gsQ0FBQztJQWZlLFNBQUcsTUFlbEI7SUFFRCxTQUFnQixVQUFVLENBQUMsVUFBa0IsRUFBRSxZQUFtQjtRQUNoRSxPQUFPO1lBQ0wsQ0FBQyxFQUFFLFVBQVUsR0FBRyxZQUFZLENBQUMsQ0FBQztZQUM5QixDQUFDLEVBQUUsVUFBVSxHQUFHLFlBQVksQ0FBQyxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBTGUsZ0JBQVUsYUFLekI7SUFFRCxTQUFnQixRQUFRLENBQUMsT0FBZSxFQUFFLFFBQWU7UUFDdkQsT0FBTztZQUNMLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxHQUFHLE9BQU87WUFDdkIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEdBQUcsT0FBTztTQUN4QixDQUFDO0lBQ0osQ0FBQztJQUxlLGNBQVEsV0FLdkI7SUFFRDs7T0FFRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLE1BQWEsRUFBRSxLQUFZO1FBQzdELHVHQUF1RztRQUV2RyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRWxDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQVBlLHlCQUFtQixzQkFPbEM7SUFFRCxTQUFnQiwwQkFBMEIsQ0FBQyxNQUFhLEVBQUUsTUFBYTtRQUNyRSw2REFBNkQ7UUFFN0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDNUMsQ0FBQztJQVBlLGdDQUEwQiw2QkFPekM7QUFDSCxDQUFDLEVBdERnQixLQUFLLEtBQUwsS0FBSyxRQXNEckI7Ozs7Ozs7Ozs7Ozs7OztBQ3ZFRDs7Ozs7R0FLRztBQUNJLE1BQU0sT0FBTztJQVFsQixNQUFNLEtBQUssYUFBYSxDQUFDLENBQVM7UUFDaEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELE1BQU0sS0FBSyxhQUFhO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFTO1FBQ25CLE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsVUFBVSxDQUFDO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBUztRQUNyQix5RUFBeUU7UUFDekUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQztJQUMxRCxDQUFDO0lBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFVLEVBQUUsRUFBVTtRQUM5QiwyRUFBMkU7UUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDbEUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFpQixFQUFFLE9BQWU7UUFDMUMsT0FBTyxTQUFTLEdBQUcsT0FBTyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDdkQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFpQixFQUFFLE9BQWU7UUFDMUMsT0FBTyxPQUFPLEdBQUcsU0FBUyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDdkQsQ0FBQztJQUVPLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxhQUFxQjtRQUN6RCxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkMsQ0FBQzs7QUF0REQ7O0dBRUc7QUFDWSxzQkFBYyxHQUFXLENBQUMsQ0FBQztBQUUzQix1QkFBZSxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ1oxRixjQUFjO0FBQ1AsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDO0FBRXRDLGVBQWU7QUFDUixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQztBQUU1QyxlQUFlO0FBQ1IsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUM7QUFFL0Msd0JBQXdCO0FBQ2pCLE1BQU0sZUFBZSxHQUFHLHVCQUF1QixHQUFHLGVBQWUsSUFBSSxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDVjlDO0FBQ0E7QUFDVztBQUNSO0FBRW5DOztHQUVHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDUHdDO0FBQ1A7QUFDRDtBQWtCNUIsU0FBUyxvQkFBb0IsQ0FBQyxlQUF1QixFQUFFLFlBQW9CLEVBQUUsSUFBWTtJQUM5RixJQUFJLG9EQUFjLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzFDLHlGQUF5RjtRQUN6RixPQUFPLGVBQWUsQ0FBQztLQUN4QjtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsdURBQWlCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQy9ELE9BQU8sZ0RBQVUsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBRU0sU0FBUyxvQkFBb0IsQ0FBQyxZQUFrQixFQUFFLFlBQW9CLEVBQUUsSUFBWTtJQUN6RixJQUFJLGVBQXVCLENBQUM7SUFDNUIsSUFBSSxvREFBYyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUMxQyx5RkFBeUY7UUFDekYsZUFBZSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUM7S0FDekM7U0FBTTtRQUNMLE1BQU0sYUFBYSxHQUFHLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RGLGVBQWUsR0FBRyxxREFBZSxDQUFDLENBQUMsRUFBRSxnREFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztLQUN4RjtJQUNELE1BQU0sYUFBYSxHQUFHLHVEQUFpQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMvRCxPQUFPLHdEQUFTLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSwrQ0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDdkM4RDtBQUUvRDs7OztHQUlHO0FBRUksTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDO0lBQ3ZDLHdCQUF3QixFQUFFLEdBQUc7SUFDN0IsZUFBZSxFQUFFLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixNQUFNLEVBQUUsSUFBSTtJQUNaLFFBQVEsRUFBRSxHQUFHO0NBQ2QsQ0FBQyxDQUFDO0FBRUksTUFBTSxXQUFXLEdBQXdCO0lBQzlDLHdCQUF3QixFQUFFLEdBQUc7SUFDN0IsZUFBZSxFQUFFLEdBQUc7SUFDcEIsSUFBSSxFQUFFLEtBQUs7SUFDWCxNQUFNLEVBQUUsTUFBTTtJQUNkLGtCQUFrQjtJQUNsQixjQUFjLEVBQUUsS0FBSztDQUN0QixDQUFDO0FBRUssTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDO0lBQ3RDLHdCQUF3QixFQUFFLEdBQUc7SUFDN0IsZUFBZSxFQUFFLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixNQUFNLEVBQUUsSUFBSTtJQUNaLFFBQVEsRUFBRSxFQUFFO0NBQ2IsQ0FBQyxDQUFDO0FBRUksTUFBTSxRQUFRLEdBQXdCO0lBQzNDLHdCQUF3QixFQUFFLEdBQUc7SUFDN0IsZUFBZSxFQUFFLElBQUk7SUFDckIsSUFBSSxFQUFFLEtBQUs7SUFDWCxNQUFNLEVBQUUsSUFBSTtJQUNaLGtCQUFrQjtJQUNsQixjQUFjLEVBQUUsSUFBSTtDQUNyQixDQUFDO0FBRUY7Ozs7Ozs7O0VBUUU7QUFFSyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUM7SUFDeEMsd0JBQXdCLEVBQUUsSUFBSTtJQUM5QixlQUFlLEVBQUUsR0FBRztJQUNwQixJQUFJLEVBQUUsS0FBSztJQUNYLE1BQU0sRUFBRSxNQUFNO0lBQ2QsUUFBUSxFQUFFLElBQUk7Q0FDZixDQUFDLENBQUM7QUFFSSxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUM7SUFDeEMsd0JBQXdCLEVBQUUsSUFBSTtJQUM5QixlQUFlLEVBQUUsSUFBSTtJQUNyQixJQUFJLEVBQUUsS0FBSztJQUNYLE1BQU0sRUFBRSxLQUFLO0lBQ2IsUUFBUSxFQUFFLEdBQUc7Q0FDZCxDQUFDLENBQUM7QUFFSSxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3ZDLFNBQVM7SUFDVCxRQUFRO0lBQ1IsV0FBVztJQUNYLFVBQVU7SUFDVixVQUFVO0NBQ1gsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxlQUFnQztJQUN2RCxNQUFNLEVBQUUsUUFBUSxLQUFjLGVBQWUsRUFBeEIsSUFBSSxVQUFLLGVBQWUsRUFBdkMsWUFBcUIsQ0FBa0IsQ0FBQztJQUM5Qyx1Q0FDSyxJQUFJO1FBQ1AsMERBQTBEO1FBQzFELGNBQWMsRUFBRSxlQUFlLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEdBQUcsd0VBQWUsSUFDcEY7QUFDSCxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7OztBQ3ZGMEM7QUFDUDtBQXFCN0IsSUFBVSxNQUFNLENBNER0QjtBQTVERCxXQUFpQixNQUFNO0lBQ1IsV0FBSSxHQUFXLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRTFFLFNBQWdCLE1BQU0sQ0FBQyxFQUFNO1FBQzNCLE9BQU87WUFDTCxTQUFTLEVBQUUsd0VBQXlCLENBQUMsMkRBQVksRUFBRSxFQUFFLENBQUM7WUFDdEQsU0FBUyxFQUFFLCtFQUFnQyxDQUFDLDJEQUFZLEVBQUUsRUFBRSxDQUFDO1NBQzlELENBQUM7SUFDSixDQUFDO0lBTGUsYUFBTSxTQUtyQjtJQUVELFNBQWdCLEdBQUcsQ0FBQyxHQUFHLE9BQWlCO1FBQ3RDLDBGQUEwRjtRQUMxRixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxvREFBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRW5GLGtGQUFrRjtRQUNsRixRQUFRLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDN0IsS0FBSyxDQUFDO2dCQUNKLE9BQU8sV0FBSSxDQUFDO1lBRWQsS0FBSyxDQUFDO2dCQUNKLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTNCO2dCQUFTO29CQUNQLE1BQU0sWUFBWSxHQUFHLE9BQU87d0JBQzFCLHdGQUF3Rjt5QkFDdkYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxvREFBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQzt5QkFDbkQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNYLE1BQU0sZ0JBQWdCLEdBQUcsd0RBQVMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDO29CQUNwRCxPQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2lCQUNqQztnQkFBQSxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBckJlLFVBQUcsTUFxQmxCO0lBRUQsU0FBZ0IsVUFBVSxDQUFDLFVBQWtCLEVBQUUsWUFBb0I7UUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUyxHQUFHLFVBQVUsRUFBRSxDQUFDO0lBQy9GLENBQUM7SUFGZSxpQkFBVSxhQUV6QjtJQUVELFNBQWdCLFFBQVEsQ0FBQyxPQUFlLEVBQUUsUUFBZ0I7UUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxHQUFHLE9BQU8sRUFBRSxDQUFDO0lBQ3BGLENBQUM7SUFGZSxlQUFRLFdBRXZCO0lBRUQsU0FBZ0IsRUFBRSxDQUFDLE1BQWM7UUFDL0IsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFGZSxTQUFFLEtBRWpCO0lBRUQsU0FBZ0IsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBVTtRQUNoRCxJQUFJLG9EQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDN0IsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxPQUFPLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFOZSxRQUFDLElBTWhCO0lBRUQsU0FBZ0IsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBVTtRQUNoRCxJQUFJLG9EQUFjLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDN0IsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7UUFDRCxPQUFPLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFOZSxRQUFDLElBTWhCO0FBQ0gsQ0FBQyxFQTVEZ0IsTUFBTSxLQUFOLE1BQU0sUUE0RHRCOzs7Ozs7Ozs7Ozs7Ozs7QUNoRkQ7O0dBRUc7QUFFSSxNQUFNLE1BQU07SUFDakIsWUFBWSxVQUFxQztRQWdCekMsbUJBQWMsR0FBd0MsRUFBRSxDQUFDO1FBQ3pELGlCQUFZLEdBQXVCLEVBQUUsQ0FBQztRQWhCNUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRS9DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBY0Q7O09BRUc7SUFDSCxNQUFNLENBQUMsS0FBMEI7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLGFBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoSCxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDMUU7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE9BQU8sQ0FBQyxRQUE4QjtRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXpELE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRTtZQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBQ3hFLENBQUMsQ0FBQztRQUVGLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFFTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQXFDO1FBQzVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxVQUFVLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRTVFLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFVBQXFDO1FBQzdELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxDQUFDO1FBRTNFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2xELE1BQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQztZQUN0RSxpRkFBaUY7WUFDakYsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUMxRSxNQUFNLFFBQVEsR0FBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUVwRixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxNQUFjO1FBQzdDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsNEJBQTRCLEVBQUUsUUFBUSxDQUFDO1FBRS9FLE1BQU0sTUFBTSxHQUFHLE9BQU8sT0FBTyxFQUFFLEtBQUssT0FBTyxFQUFFLEtBQUssT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUMvRCxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFRRCxTQUFTLE9BQU87SUFDZCxzRUFBc0U7SUFDdEUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDL0MsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM1R2tFO0FBQ3BDO0FBVy9COztHQUVHO0FBQ0ksU0FBUyxnQkFBZ0IsQ0FDOUIsTUFBOEI7SUFFOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSx3Q0FBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRXBFLFNBQVMsVUFBVTtRQUNqQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDL0MsVUFBVSxDQUFDLFNBQVMsQ0FBQztZQUNuQixlQUFlLEVBQUUsVUFBVSxFQUFFO1lBQzdCLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLEVBQUU7U0FDaEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCwyRkFBMkY7SUFDM0YsTUFBTSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRTdHLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRTtRQUNoQixjQUFjLEVBQUUsQ0FBQztRQUNqQixjQUFjLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUM7SUFFRixPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFDOUIsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLENBQUM7QUFFbkM7Ozs7R0FJRztBQUNILFNBQVMsYUFBYSxDQUFDLE1BQTRDLEVBQUUsTUFBa0I7SUFDckYsTUFBTSxVQUFVLEdBQUcsSUFBSSw4Q0FBVSxpQ0FBTSxNQUFNLEtBQUUsU0FBUyxFQUFFLGdCQUFnQixJQUFHLENBQUM7SUFFOUUsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDOUMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksWUFBWSxHQUFHLG1CQUFtQixDQUFDO0lBRXZDLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRTtRQUNoQixzRkFBc0Y7UUFDdEYsSUFBSSxPQUFPLEVBQUU7WUFDWCxPQUFPO1NBQ1I7UUFFRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdEMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLEdBQUcsWUFBWSxDQUFDO1FBQ3JELElBQUksaUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzNCOzs7O2VBSUc7WUFDRixjQUFjLElBQUksaUJBQWlCLENBQUM7U0FDdEM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLENBQUMsV0FBVyxHQUFHLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN2RixVQUFVLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDN0MsaURBQWlEO1FBQ2pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3hFLGtHQUFrRztRQUNsRyxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsU0FBUyxHQUFHLHdCQUF3QixHQUFHLGtCQUFrQixDQUFDO1FBQzVGLFVBQVUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUVyRSxNQUFNLEVBQUUsQ0FBQztRQUVULFlBQVksR0FBRyxXQUFXLENBQUM7UUFFM0IsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLHlCQUF5QjtZQUN6QixTQUFTLEdBQUcscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDLENBQUM7SUFFRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDcEIsMEJBQTBCO0lBQzFCLElBQUksU0FBUyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTVDLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRTtRQUNoQixPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ2Ysb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBRUYsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ3JCLE9BQU87UUFDTCxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFO1FBQ2hELFNBQVMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtLQUM5QixDQUFDO0FBQ0osQ0FBQzs7Ozs7OztVQ2hIRDtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHdDQUF3Qyx5Q0FBeUM7V0FDakY7V0FDQTtXQUNBLEU7Ozs7O1dDUEEsd0Y7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0Esc0RBQXNELGtCQUFrQjtXQUN4RTtXQUNBLCtDQUErQyxjQUFjO1dBQzdELEU7Ozs7Ozs7Ozs7Ozs7O0FDTndDO0FBQ1c7QUFFbkQsTUFBTSxXQUFXLEdBQWdCO0lBQy9CLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtJQUNwQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ2xELElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRTtJQUNwQyxZQUFZLEVBQUUsR0FBRztDQUNsQixDQUFDO0FBRUYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLHFEQUFnQixDQUFDO0lBQ3BDLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQzdDLFdBQVc7Q0FDWixDQUFDLENBQUM7QUFFSCxjQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQywwQ0FBRSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUG9pbnQgfSBmcm9tIFwiLi9jYXJ0ZXNpYW4tc3lzdGVtXCI7XG5pbXBvcnQgKiBhcyBLaW5lbWF0aWNzIGZyb20gXCIuL2tpbmVtYXRpY3NcIjtcbmltcG9ydCB7IERlY2ltYWwgfSBmcm9tIFwiLi9kZWNpbWFsXCI7XG5pbXBvcnQgeyBWZWN0b3IgfSBmcm9tIFwiLi92ZWN0b3JzXCI7XG5cbmV4cG9ydCB0eXBlIEJhbGwgPSBSZWFkb25seTx7XG4gIGNoYXJhY3RlcmlzdGljczogQmFsbENoYXJhY3RlcmlzdGljc1xuXG4gIHN0YXRlOiBLaW5lbWF0aWNzLkJvZHlcbn0+O1xuXG5leHBvcnQgdHlwZSBCYWxsQ2hhcmFjdGVyaXN0aWNzID0gUmVhZG9ubHk8e1xuICAvKiogVW5pdDogbSAqL1xuICByYWRpdXM6IG51bWJlclxuICBcbiAgLyoqIFVuaXQ6IGtnICovXG4gIG1hc3M6IG51bWJlclxuXG4gIC8qKlxuICAgKiBAc2VlIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RyYWdfY29lZmZpY2llbnRcbiAgICogXG4gICAqIERpbWVuc2lvbmxlc3NcbiAgICovXG4gIGRyYWdDb2VmZmljaWVudDogbnVtYmVyXG5cbiAgLyoqXG4gICAqIEBzZWUgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29lZmZpY2llbnRfb2ZfcmVzdGl0dXRpb25cbiAgICogXG4gICAqIERpbWVuc2lvbmxlc3NcbiAgICovXG4gIGNvZWZmaWNpZW50T2ZSZXN0aXR1dGlvbjogbnVtYmVyXG5cbiAgLyoqXG4gICAqIEBzZWUgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSG9va2UlMjdzX2xhd1xuICAgKiBcbiAgICogVW5pdDogTsK3beKBu8K5XG4gICAqL1xuICBzcHJpbmdDb25zdGFudDogbnVtYmVyXG59PjtcblxuZXhwb3J0IHR5cGUgRW52aXJvbm1lbnQgPSBSZWFkb25seTx7XG4gIC8qKiBVbml0OiBtICovXG4gIGRpbWVuc2lvbnM6IHsgd2lkdGg6IG51bWJlciwgaGVpZ2h0OiBudW1iZXIgfSxcblxuICAvKiogVW5pdDogbcK3c+KBu8KyICovXG4gIGdyYXZpdHk6IFZlY3RvclxuXG4gIC8qKiBVbml0OiBtwrdz4oG7wrkgKi9cbiAgd2luZDogVmVjdG9yXG5cbiAgLyoqIFVuaXQ6IGtnwrdt4oG7wrMgLS0gRWFydGgncyBhdG1vc3BoZXJlOiAxLjI7IHdhdGVyOiA5OTcgKi9cbiAgZmx1aWREZW5zaXR5OiBudW1iZXJcbn0+O1xuXG4vKipcbiAqIEEgcGh5c2ljcyBlbmdpbmUgZm9yIHNpbXVsYXRpbmcgdGhlIGJvdW5jaW5nIG9mIGJhbGxzXG4gKi9cbmV4cG9ydCBjbGFzcyBTaW11bGF0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb25maWc6IFNpbXVsYXRpb24uQ29uZmlnLFxuICApIHt9XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgc3RhdGUgb2YgdGhlIGVudmlyb25tZW50IC0tIHRoaXMgY2FuIGJlIG11dGF0ZWQgdmlhXG4gICAqIGBzaW11bGF0aW9uLmVudmlyb25tZW50ID0gc29tZU90aGVyRW52aXJvbm1lbnRTdGF0ZWAsIGUuZy4gdG8gY2hhbmdlIHdpbmQgbGV2ZWxcbiAgICovXG4gIHB1YmxpYyBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQgPSB0aGlzLmNvbmZpZy5lbnZpcm9ubWVudDtcblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiB0aWNrcyBwZXIgc2Vjb25kIGluIHRoZSBzaW11bGF0aW9uOyBzdWdnZXN0ZWQgYXQgbGVhc3QgMTIwMCBoelxuICAgKiBcbiAgICogVW5pdDogaHpcbiAgICovXG4gIHB1YmxpYyBmcmVxdWVuY3k6IG51bWJlciA9IHRoaXMuY29uZmlnLmZyZXF1ZW5jeTtcblxuICBwcml2YXRlIF9iYWxsczogUmVhZG9ubHlBcnJheTxCYWxsPiA9IFtdO1xuXG4gIGdldCBiYWxscygpOiBSZWFkb25seUFycmF5PEJhbGw+IHtcbiAgICByZXR1cm4gdGhpcy5fYmFsbHM7XG4gIH1cblxuICBwcml2YXRlIF90aW1lc3RhbXA6IG51bWJlciA9IDA7XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2Ygc2Vjb25kcyBlbGFwc2VkIGluIHRoZSBzaW11bGF0aW9uXG4gICAqL1xuICBnZXQgdGltZXN0YW1wKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3RpbWVzdGFtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gdGltZXN0YW1wIFRoZSB0YXJnZXQgc2ltdWxhdGlvbiB0aW1lc3RhbXBcbiAgICogQHJldHVybnMgVGhlIGJhbGxzIGF0IHRoZSBuZXcgdGltZXN0YW1wLCBvciB0aGUgY3VycmVudCBiYWxscyBvZiB0aW1lc3RhbXAgaXMgaW4gdGhlIHBhc3RcbiAgICovXG4gIGFkdmFuY2VUb1RpbWUodGltZXN0YW1wOiBudW1iZXIpOiBSZWFkb25seUFycmF5PEJhbGw+IHtcbiAgICBjb25zdCB0aW1lRGVsdGEgPSB0aW1lc3RhbXAgLSB0aGlzLnRpbWVzdGFtcDtcbiAgICByZXR1cm4gdGhpcy5hZHZhbmNlQnlUaW1lKHRpbWVEZWx0YSk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHRpbWVEZWx0YSBUaGUgdGltZSBpbiBzIHRvIGFkdmFuY2UgYnlcbiAgICogQHJldHVybnMgVGhlIGJhbGxzIGF0IHRoZSBuZXcgdGltZXN0YW1wLCBvciB0aGUgY3VycmVudCBiYWxscyBvZiB0aW1lc3RhbXAgaXMgaW4gdGhlIHBhc3RcbiAgICovXG4gIGFkdmFuY2VCeVRpbWUodGltZURlbHRhOiBudW1iZXIpOiBSZWFkb25seUFycmF5PEJhbGw+IHtcbiAgICBjb25zdCB0aWNrc0RlbHRhID0gTWF0aC5yb3VuZCh0aW1lRGVsdGEgKiB0aGlzLmZyZXF1ZW5jeSk7XG4gICAgcmV0dXJuIHRoaXMuYWR2YW5jZSh0aWNrc0RlbHRhKTtcbiAgfVxuXG4gIGFkdmFuY2UodGlja3M6IG51bWJlcik6IFJlYWRvbmx5QXJyYXk8QmFsbD4ge1xuICAgIGlmICh0aWNrcyA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2ltdWxhdGlvbiBjYW5ub3QgZ28gYmFja3dhcmRzIGluIHRpbWUgeWV0LicpO1xuICAgIH1cbiAgICBsZXQgYmFsbHMgPSB0aGlzLl9iYWxscztcbiAgICAvLyBOb3RlIHRoYXQgdGhpcy5lbnZpcm9ubWVudCBjYW4gYmUgbXV0YXRlZCBkdXJpbmcgdGhpcyBnZW5lcmF0b3IgaW52b2thdGlvbiwgY2hhbmdpbmcgd2luZCBsZXZlbHMgZXRjLiBUaGF0J3MgZmluZS5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRpY2tzOyBpKyspIHtcbiAgICAgIGJhbGxzID0gY29tcHV0ZU5leHRTdGF0ZSh0aGlzLmVudmlyb25tZW50LCBiYWxscywgMSAvIHRoaXMuZnJlcXVlbmN5KTtcbiAgICB9XG4gICAgdGhpcy5fdGltZXN0YW1wID0gdGhpcy50aW1lc3RhbXAgKyB0aWNrcyAvIHRoaXMuZnJlcXVlbmN5O1xuICAgIHRoaXMuX2JhbGxzID0gYmFsbHM7XG4gICAgcmV0dXJuIGJhbGxzO1xuICB9XG5cbiAgc3Bhd25CYWxsKGJhbGw6IEJhbGwpOiB2b2lkIHtcbiAgICB0aGlzLnNwYXduQmFsbHMoW2JhbGxdKTtcbiAgfVxuXG4gIHNwYXduQmFsbHMoYmFsbHM6IEJhbGxbXSk6IHZvaWQge1xuICAgIC8vIGFkZCB0aGUgYmFsbHMsIGJ1dCBvbmx5IGtlZXAgdGhlIGxhc3QgYG5gXG4gICAgY29uc3QgbiA9IHRoaXMuY29uZmlnLm1heE51bUJhbGxzIHx8IDEwO1xuICAgIHRoaXMuX2JhbGxzID0gWy4uLnRoaXMuX2JhbGxzLCAuLi5iYWxsc10uc2xpY2UoLW4pO1xuICB9XG59XG5cbmV4cG9ydCBuYW1lc3BhY2UgU2ltdWxhdGlvbiB7XG4gIGV4cG9ydCB0eXBlIENvbmZpZyA9IFJlYWRvbmx5PHtcbiAgICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnRcblxuICAgIC8qKlxuICAgICAqIFRoZSBudW1iZXIgb2YgdGlja3MgcGVyIHNlY29uZCBpbiB0aGUgc2ltdWxhdGlvbjsgc3VnZ2VzdGVkIGF0IGxlYXN0IDEyMDAgaHpcbiAgICAgKiBcbiAgICAgKiBVbml0OiBoelxuICAgICAqL1xuICAgIGZyZXF1ZW5jeTogbnVtYmVyXG5cbiAgICAvKipcbiAgICAgKiBNYXggbnVtYmVyIG9mIGJhbGxzIGFsbG93ZWQgaW4gdGhlIHNpbXVsYXRpb24gYmVmb3JlIHdlIHN0YXJ0IHJlbW92aW5nIHRoZW0gRklGT1xuICAgICAqIFxuICAgICAqIERlZmF1bHQ6IDEwXG4gICAgICovXG4gICAgbWF4TnVtQmFsbHM/OiBudW1iZXJcbiAgfT47XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbmV4dCBzdGF0ZSBvZiB0aGUgYmFsbHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVOZXh0U3RhdGUoZW52aXJvbm1lbnQ6IEVudmlyb25tZW50LCBiYWxsczogUmVhZG9ubHlBcnJheTxCYWxsPiwgdGltZURlbHRhOiBudW1iZXIpOiBSZWFkb25seUFycmF5PEJhbGw+IHtcbiAgY29uc3QgW2JhbGxzUGVyUmVnaW9uLCByZWdpb25zUGVyQmFsbF0gPSBncm91cEJhbGxzQnlSZWdpb24oZW52aXJvbm1lbnQuZGltZW5zaW9ucywgYmFsbHMpO1xuXG4gIHJldHVybiBiYWxscy5tYXAoKGJhbGwsIGkpOiBCYWxsID0+IHtcbiAgICAvLyBnZXQgdGhlIHJlZ2lvbnMgb2YgdGhlIGVudmlyb25tZW50IG92ZXJsYXBwZWQgYnkgdGhpcyBiYWxsXG4gICAgY29uc3QgcmVsZXZhbnRSZWdpb25zID0gcmVnaW9uc1BlckJhbGxbaV07XG4gICAgLy8gZ2V0IGFsbCB0aGUgYmFsbHMgd2hpY2ggb3ZlcmxhcCB0aGUgc2FtZSByZWdpb25zIG9mIHRoZSBlbnZpcm9ubWVudCBhcyB0aGlzIGJhbGxcbiAgICBjb25zdCBhbGxCYWxsc0luUmVsZXZhbnRSZWdpb25zID0gbmV3IFNldChyZWxldmFudFJlZ2lvbnMuZmxhdE1hcChyZWdpb24gPT4gYmFsbHNQZXJSZWdpb25bcmVnaW9uXSkpO1xuICAgIGNvbnN0IHBvc3NpYmx5VG91Y2hpbmdCYWxscyA9IFsuLi5hbGxCYWxsc0luUmVsZXZhbnRSZWdpb25zXS5maWx0ZXIoX2JhbGwgPT4gX2JhbGwgIT09IGJhbGwpO1xuXG4gICAgY29uc3QgZm9yY2UgPSBjYWxjdWxhdGVOZXRGb3JjZUFjdGluZ1Vwb25CYWxsKGVudmlyb25tZW50LCBiYWxsLCBwb3NzaWJseVRvdWNoaW5nQmFsbHMpO1xuICAgIGNvbnN0IGFjY2VsZXJhdGlvbiA9IFZlY3Rvci5kaXZpZGVCeShiYWxsLmNoYXJhY3RlcmlzdGljcy5tYXNzLCBmb3JjZSk7XG4gICAgY29uc3QgbmV3VmVsb2NpdHkgPSBLaW5lbWF0aWNzLmNhbGN1bGF0ZU5ld1ZlbG9jaXR5KGJhbGwuc3RhdGUudmVsb2NpdHksIGFjY2VsZXJhdGlvbiwgdGltZURlbHRhKTtcblxuICAgIHJldHVybiB7XG4gICAgICBjaGFyYWN0ZXJpc3RpY3M6IGJhbGwuY2hhcmFjdGVyaXN0aWNzLFxuICAgICAgc3RhdGU6IHtcbiAgICAgICAgdmVsb2NpdHk6IG5ld1ZlbG9jaXR5LFxuICAgICAgICBsb2NhdGlvbjogS2luZW1hdGljcy5jYWxjdWxhdGVOZXdMb2NhdGlvbihiYWxsLnN0YXRlLCBuZXdWZWxvY2l0eSwgdGltZURlbHRhKSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfSk7XG59XG5cbi8qKlxuICogY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlPdGhlckJhbGxzKCkgbmVlZHMgdG8gY2FsY3VsYXRlIGZvcmNlcyBvZiBiYWxscyBvbiBlYWNoIG90aGVyIC0tIGkuZS4gY29sbGlzaW9ucyAtLSBidXRcbiAqIHRoaXMgaXMgTyhOXjIpIHdoZXJlIE4gaXMgdGhlIG51bWJlciBvZiBiYWxscy4gVGhpcyBnZXRzIHViZXIgc2xvdyB3aXRoIGxvdHMgb2YgYmFsbHMuIFdlIGNhbiBpbXByb3ZlIHRoaXNcbiAqIGJ5IGdyb3VwaW5nIHRoZSBiYWxscyBpbnRvIHJlZ2lvbnMgZmlyc3QgYW5kIHRoZW4gb25seSBjYWxjdWxhdGluZyBiYWxsIGNvbGxpc2lvbiBmb3JjZXMgZm9yIGJhbGxzIHdoaWNoXG4gKiBvdmVybGFwIHRoZSBzYW1lIHJlZ2lvbnMuXG4gKi9cbmZ1bmN0aW9uIGdyb3VwQmFsbHNCeVJlZ2lvbihkaW1lbnNpb25zOiBFbnZpcm9ubWVudFsnZGltZW5zaW9ucyddLCBiYWxsczogUmVhZG9ubHlBcnJheTxCYWxsPikge1xuICBjb25zdCByZWdpb25XaWR0aCA9IDAuMjsgLy8gbWV0cmVzXG4gIGNvbnN0IG51bVJlZ2lvbnMgPSBNYXRoLmNlaWwoZGltZW5zaW9ucy53aWR0aCAvIHJlZ2lvbldpZHRoKTtcblxuICBjb25zdCBiYWxsc1BlclJlZ2lvbjogUmVhZG9ubHlBcnJheTxCYWxsW10+ID0gbmV3IEFycmF5KG51bVJlZ2lvbnMpLmZpbGwobnVsbCkubWFwKCgpID0+IFtdKTtcbiAgXG4gIGNvbnN0IHJlZ2lvbnNQZXJCYWxsID0gYmFsbHMubWFwKGJhbGwgPT4ge1xuICAgIC8vIGZpbmQgdGhlIHJlZ2lvbnMgdGhpcyBiYWxsIG92ZXJsYXBzXG4gICAgY29uc3QgeE1pbiA9IGJhbGwuc3RhdGUubG9jYXRpb24ueCAtIGJhbGwuY2hhcmFjdGVyaXN0aWNzLnJhZGl1cztcbiAgICBjb25zdCBtaW5SZWdpb25JZHggPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHhNaW4gLyByZWdpb25XaWR0aCkpO1xuXG4gICAgY29uc3QgeE1heCA9IGJhbGwuc3RhdGUubG9jYXRpb24ueCArIGJhbGwuY2hhcmFjdGVyaXN0aWNzLnJhZGl1cztcbiAgICBjb25zdCBtYXhSZWdpb25JZHggPSBNYXRoLm1pbihudW1SZWdpb25zIC0gMSwgTWF0aC5mbG9vcih4TWF4IC8gcmVnaW9uV2lkdGgpKTtcblxuICAgIGZvciAobGV0IHJlZ2lvbklkeCA9IG1pblJlZ2lvbklkeDsgcmVnaW9uSWR4IDw9IG1heFJlZ2lvbklkeDsgcmVnaW9uSWR4KyspIHtcbiAgICAgIGJhbGxzUGVyUmVnaW9uW3JlZ2lvbklkeF0ucHVzaChiYWxsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2UobWluUmVnaW9uSWR4LCBtYXhSZWdpb25JZHgpO1xuICB9KTtcblxuICByZXR1cm4gW2JhbGxzUGVyUmVnaW9uLCByZWdpb25zUGVyQmFsbF0gYXMgY29uc3Q7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZU5ldEZvcmNlQWN0aW5nVXBvbkJhbGwoZW52aXJvbm1lbnQ6IEVudmlyb25tZW50LCBiYWxsOiBCYWxsLCBvdGhlckJhbGxzOiBCYWxsW10pOiBWZWN0b3Ige1xuICBjb25zdCByYXcgPSBWZWN0b3IuYWRkKFxuICAgIGNhbGN1bGF0ZUVudmlyb25tZW50YWxGb3JjZXMoZW52aXJvbm1lbnQsIGJhbGwpLFxuICAgIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5T3RoZXJCYWxscyhiYWxsLCBvdGhlckJhbGxzKSxcbiAgKTtcbiAgcmV0dXJuIHtcbiAgICBkaXJlY3Rpb246IHJhdy5kaXJlY3Rpb24sXG4gICAgbWFnbml0dWRlOiBEZWNpbWFsLnRyaW0ocmF3Lm1hZ25pdHVkZSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUVudmlyb25tZW50YWxGb3JjZXMoZW52aXJvbm1lbnQ6IEVudmlyb25tZW50LCBiYWxsOiBCYWxsKTogVmVjdG9yIHtcbiAgcmV0dXJuIFZlY3Rvci5hZGQoXG4gICAgVmVjdG9yLm11bHRpcGx5QnkoYmFsbC5jaGFyYWN0ZXJpc3RpY3MubWFzcywgZW52aXJvbm1lbnQuZ3Jhdml0eSksXG4gICAgY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlEcmFnKGVudmlyb25tZW50LCBiYWxsKSxcbiAgICBjYWxjdWxhdGVGb3JjZUFwcGxpZWRCeVdpbmQoZW52aXJvbm1lbnQsIGJhbGwpLFxuICAgIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5U3VyZmFjZXMoZW52aXJvbm1lbnQsIGJhbGwpLFxuICApO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVGb3JjZUFwcGxpZWRCeU90aGVyQmFsbHMoYmFsbDogQmFsbCwgb3RoZXJCYWxsczogQmFsbFtdKTogVmVjdG9yIHtcbiAgcmV0dXJuIFZlY3Rvci5hZGQoXG4gICAgLi4ub3RoZXJCYWxscy5tYXAob3RoZXJCYWxsID0+IGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5T3RoZXJCYWxsKGJhbGwsIG90aGVyQmFsbCkpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5RHJhZyhlbnZpcm9ubWVudDogRW52aXJvbm1lbnQsIGJhbGw6IEJhbGwpOiBWZWN0b3Ige1xuICAvKiogQHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EcmFnX2VxdWF0aW9uICovXG4gIFxuICBjb25zdCB2ID0gYmFsbC5zdGF0ZS52ZWxvY2l0eTtcbiAgY29uc3QgYXJlYSA9IE1hdGguUEkgKiBiYWxsLmNoYXJhY3RlcmlzdGljcy5yYWRpdXMqKjI7XG5cbiAgcmV0dXJuIFZlY3Rvci5tdWx0aXBseUJ5KC0wLjUgKiBlbnZpcm9ubWVudC5mbHVpZERlbnNpdHkgKiB2Lm1hZ25pdHVkZSAqIGJhbGwuY2hhcmFjdGVyaXN0aWNzLmRyYWdDb2VmZmljaWVudCAqIGFyZWEsIHYpO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVGb3JjZUFwcGxpZWRCeVdpbmQoZW52aXJvbm1lbnQ6IEVudmlyb25tZW50LCBiYWxsOiBCYWxsKTogVmVjdG9yIHtcbiAgcmV0dXJuIHsgZGlyZWN0aW9uOiAwLCBtYWduaXR1ZGU6IDAgfTtcbn1cblxuLyoqXG4gKiBOb3RlIHRoYXQgdGhpcyBmdW5jdGlvbiBkb2VzIG5vdCB0YWtlIGludG8gYWNjb3VudCBmb3JjZSBpbXBhcnRpbmcgc3BpbiBvbiBiYWxsXG4gKiBhbmQgY29ycmVzcG9uZGluZyByZWR1Y2VkIHJlYm91bmQgZm9yY2VcbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlTdXJmYWNlcyhlbnZpcm9ubWVudDogRW52aXJvbm1lbnQsIGJhbGw6IEJhbGwpOiBWZWN0b3Ige1xuICByZXR1cm4gVmVjdG9yLmFkZChcbiAgICAvLyB0b3Agc3VyZmFjZSBhcHBsaWVzIGZvcmNlIHZlcnRpY2FsbHkgZG93biBvbiBiYWxsIC0tIGRpcmVjdGlvbiA9IC1NYXRoLlBJIC8gMlxuICAgIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5U3VyZmFjZSgtTWF0aC5QSSAvIDIsIGJhbGwsIGJhbGxMb2NhdGlvbiA9PiB7XG4gICAgICByZXR1cm4gYmFsbC5jaGFyYWN0ZXJpc3RpY3MucmFkaXVzICsgYmFsbExvY2F0aW9uLnkgLSBlbnZpcm9ubWVudC5kaW1lbnNpb25zLmhlaWdodDtcbiAgICB9KSxcbiAgICAvLyByaWdodCBzdXJmYWNlIGFwcGxpZXMgZm9yY2UgaG9yaXpvbnRhbGx5IGxlZnQgb24gYmFsbCAtLSBjb2xsaXNpb24gZGlyZWN0b24gPSBNYXRoLlBJXG4gICAgY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlTdXJmYWNlKE1hdGguUEksIGJhbGwsIGJhbGxMb2NhdGlvbiA9PiB7XG4gICAgICByZXR1cm4gYmFsbC5jaGFyYWN0ZXJpc3RpY3MucmFkaXVzICsgYmFsbExvY2F0aW9uLnggLSBlbnZpcm9ubWVudC5kaW1lbnNpb25zLndpZHRoO1xuICAgIH0pLFxuICAgIC8vIGJvdHRvbSBzdXJmYWNlIGFwcGxpZXMgZm9yY2UgdmVydGljYWxseSB1cCBvbiBiYWxsIC0tIGNvbGxpc2lvbiBkaXJlY3Rpb24gPSBNYXRoLlBJIC8gMlxuICAgIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5U3VyZmFjZShNYXRoLlBJIC8gMiwgYmFsbCwgYmFsbExvY2F0aW9uID0+IHtcbiAgICAgIHJldHVybiBiYWxsLmNoYXJhY3RlcmlzdGljcy5yYWRpdXMgLSBiYWxsTG9jYXRpb24ueTtcbiAgICB9KSxcbiAgICAvLyBsZWZ0IHN1cmZhY2UgYXBwbGllcyBmb3JjZSBob3Jpem9udGFsbHkgcmlnaHQgb24gYmFsbCAtLSBjb2xsaXNpb24gZGlyZWN0aW9uID0gMFxuICAgIGNhbGN1bGF0ZUZvcmNlQXBwbGllZEJ5U3VyZmFjZSgwLCBiYWxsLCBiYWxsTG9jYXRpb24gPT4ge1xuICAgICAgcmV0dXJuIGJhbGwuY2hhcmFjdGVyaXN0aWNzLnJhZGl1cyAtIGJhbGxMb2NhdGlvbi54O1xuICAgIH0pLFxuICApO1xufVxuXG4vKipcbiAqIE5vdGUgdGhhdCB0aGlzIGZ1bmN0aW9uIGRvZXMgbm90IHRha2UgaW50byBhY2NvdW50IGZvcmNlIGltcGFydGluZyBzcGluIG9uIGJhbGxcbiAqIGFuZCBjb3JyZXNwb25kaW5nIHJlZHVjZWQgcmVib3VuZCBmb3JjZVxuICovXG4gZnVuY3Rpb24gY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlTdXJmYWNlKFxuICBjb2xsaXNpb25EaXJlY3Rpb246IG51bWJlcixcbiAgYmFsbDogQmFsbCxcbiAgY2FsY0NvbXByZXNzaW9uOiAobG9jYXRpb246IFBvaW50KSA9PiBudW1iZXIsXG4pOiBWZWN0b3Ige1xuICAvKiogQHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Ib29rZSUyN3NfbGF3ICovXG4gIC8qKiBAc2VlIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvZWZmaWNpZW50X29mX3Jlc3RpdHV0aW9uICovXG5cbiAgY29uc3QgY3VycmVudENvbXByZXNzaW9uID0gY2FsY0NvbXByZXNzaW9uKGJhbGwuc3RhdGUubG9jYXRpb24pO1xuXG4gIGlmIChEZWNpbWFsLmx0KDAsIGN1cnJlbnRDb21wcmVzc2lvbikpIHtcbiAgICAvLyBvcHRpbWlzYXRpb246IGF2b2lkIGV4cGVuc2l2ZSBjb21wdXRhdGlvbiBiZWxvd1xuICAgIHJldHVybiBWZWN0b3IuemVybztcbiAgfVxuXG4gIC8vIGVuc3VyZSBiYWxscyBkb24ndCBtb3ZlIGZvcmV2ZXIgLS0gc2ltcGxpc3RpYyBoZXVyaXN0aWMgdG8gbW9kZWwgZW5lcmd5IGxvc3QgdG8gZnJpY3Rpb24sIGhlYXQsIHNvdW5kLCBldGMuXG4gIGNvbnN0IGVuZXJneUxvc3MgPSBWZWN0b3IubXVsdGlwbHlCeSgtYmFsbC5jaGFyYWN0ZXJpc3RpY3MubWFzcywgYmFsbC5zdGF0ZS52ZWxvY2l0eSk7XG5cbiAgaWYgKERlY2ltYWwuaXNaZXJvKGN1cnJlbnRDb21wcmVzc2lvbikpIHtcbiAgICAvLyBvcHRpbWlzYXRpb246IGF2b2lkIGV4cGVuc2l2ZSBjb21wdXRhdGlvbiBiZWxvd1xuICAgIHJldHVybiBlbmVyZ3lMb3NzO1xuICB9XG5cbiAgLy8gZ2V0IGFwcHJveCBsb2NhdGlvbiBpbiAxIG1pY3Jvc2Vjb25kIHRpbWVcbiAgY29uc3QgbmV4dExvY2F0aW9uID0gS2luZW1hdGljcy5jYWxjdWxhdGVOZXdMb2NhdGlvbihiYWxsLnN0YXRlLCBWZWN0b3IuemVybywgMSAvIDFlNik7XG4gIGNvbnN0IG5leHRDb21wcmVzc2lvbiA9IGNhbGNDb21wcmVzc2lvbihuZXh0TG9jYXRpb24pO1xuICAvLyByZWFzb25hYmxlIGFwcHJveGltYXRpb24gZm9yIHdoZXRoZXIgYmFsbCBpcyBsZWF2aW5nIHN1cmZhY2UgXG4gIGNvbnN0IGJhbGxJc0xlYXZpbmdTdXJmYWNlID0gRGVjaW1hbC5sdChjdXJyZW50Q29tcHJlc3Npb24sIG5leHRDb21wcmVzc2lvbik7XG4gIC8qKlxuICAgKiBUaGlzIGlzIGEgc2ltcGxpc3RpYyBtb2RlbCBvZiBDb1IgYnV0IGl0IGRvZXMgdGhlIGpvYi4gQXJiaXRyYXJ5IG11bHRpcGxpZXIgMC42IGlzIG5lY2Vzc2FyeVxuICAgKiBiZWNhdXNlIG9mIGltcGVyZmVjdGlvbnMgaW4gdGhpcyBtb2RlbC4gVGhpcyBpcyBwcm9iYWJseSBiZWNhdXNlIGZvcmNlcyBhcmUgY2FsY3VsYXRlZCBhdCB0aW1lXG4gICAqIHQwIGFuZCBhcHBsaWVkIHVudGlsIHQxLCB3aGljaCBtZWFucyB0aGF0IHdoZW4gdGhlIGZvcmNlIGF0IHQwIGlzIGxlc3MgdGhhbiBhdCB0MSwgc3VjaCBhc1xuICAgKiB3aGVuIGEgYmFsbCBpcyBjb252ZXJnaW5nIHdpdGggYSBzdXJmYWNlLCB0aGUgZm9yY2UgYXBwbGllZCBpcyBnZW5lcmFsbHkgbGVzcyB0aGFuIGl0IG91Z2h0IHRvXG4gICAqIGJlOyB3aGlsZSB3aGVuIHRoZSBmb3JjZSBhdCB0MCBpcyBncmVhdGVyIHRoYW4gYXQgdDEsIHN1Y2ggYXMgd2hlbiBhIGJhbGwgaXMgbGVhdmluZyBhIHN1cmZhY2UsXG4gICAqIHRoZSBmb3JjZSBhcHBsaWVkIGlzIGdlbmVyYWxseSBoaWdoZXIgdGhhbiBpdCBvdWdodCB0byBiZS4gVGhpcyBtZWFucyB0aGF0IGJhbGxzIGJvdW5jZSBjb250aW51YWxseVxuICAgKiBoaWdoZXIuIFRoZSAwLjYgbXVsdGlwbGllciB3aGVuIHRoZSBiYWxsIGlzIGxlYXZpbmcgdGhlIHN1cmZhY2UgY291bnRlcnMgdGhpcy4gTm90IGEgcGVyZmVjdCBcbiAgICogc29sdXRpb24gYnkgYW55IG1lYW5zIVxuICAgKi9cbiAgY29uc3QgZm9yY2VNdWx0aXBsaWVyID0gYmFsbElzTGVhdmluZ1N1cmZhY2UgPyAwLjcgKiBiYWxsLmNoYXJhY3RlcmlzdGljcy5jb2VmZmljaWVudE9mUmVzdGl0dXRpb24gOiAxO1xuICBcbiAgcmV0dXJuIFZlY3Rvci5hZGQoXG4gICAgZW5lcmd5TG9zcyxcbiAgICB7XG4gICAgICBkaXJlY3Rpb246IGNvbGxpc2lvbkRpcmVjdGlvbixcbiAgICAgIG1hZ25pdHVkZTogY3VycmVudENvbXByZXNzaW9uICogYmFsbC5jaGFyYWN0ZXJpc3RpY3Muc3ByaW5nQ29uc3RhbnQgKiBmb3JjZU11bHRpcGxpZXIsXG4gICAgfSxcbiAgKTtcbn1cblxuLyoqXG4gKiBOb3RlIHRoYXQgdGhpcyBmdW5jdGlvbiBpcyB2ZXJ5IHNpbXBsaXN0aWM6XG4gKiAtIGl0IGRvZXMgbm90IG1vZGVsIGNvZWZmaWNpZW50IG9mIHJlc3RpdHV0aW9uIHByb3Blcmx5LCBhcyB0aGlzIHdvdWxkIGJlIGltcHJhY3RpY2FsXG4gKiAtIGl0IGRvZXMgbm90IHRha2UgaW50byBhY2NvdW50IGZvcmNlIGltcGFydGluZyBzcGluIG9uIGJhbGxzIG9yIGZyaWN0aW9uIGluIGdlbmVyYWxcbiAqIC0gbW9yZSB0aGluZ3MgYXJlIHByb2JhYmx5IG1pc3NpbmdcbiAqL1xuZnVuY3Rpb24gY2FsY3VsYXRlRm9yY2VBcHBsaWVkQnlPdGhlckJhbGwoYmFsbDogQmFsbCwgb3RoZXJCYWxsOiBCYWxsKTogVmVjdG9yIHtcbiAgLyoqIEBzZWUgaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSG9va2UlMjdzX2xhdyAqL1xuICAvKiogQHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TZXJpZXNfYW5kX3BhcmFsbGVsX3NwcmluZ3MgKi9cblxuICBjb25zdCBkaXN0YW5jZUJldHdlZW5SYWRpaSA9IFBvaW50LmNhbGN1bGF0ZUV1Y2xpZGVhbkRpc3RhbmNlKGJhbGwuc3RhdGUubG9jYXRpb24sIG90aGVyQmFsbC5zdGF0ZS5sb2NhdGlvbik7XG4gIGNvbnN0IGNvbWJpbmVkQ29tcHJlc3Npb24gPSBiYWxsLmNoYXJhY3RlcmlzdGljcy5yYWRpdXMgKyBvdGhlckJhbGwuY2hhcmFjdGVyaXN0aWNzLnJhZGl1cyAtIGRpc3RhbmNlQmV0d2VlblJhZGlpO1xuXG4gIGlmIChEZWNpbWFsLmx0KDAsIGNvbWJpbmVkQ29tcHJlc3Npb24pKSB7XG4gICAgLy8gb3B0aW1pc2F0aW9uOiBhdm9pZCBleHBlbnNpdmUgY29tcHV0YXRpb24gYmVsb3dcbiAgICByZXR1cm4gVmVjdG9yLnplcm87XG4gIH1cblxuICBjb25zdCBjb21iaW5lZFN0aWZmbmVzcyA9IChiYWxsLmNoYXJhY3RlcmlzdGljcy5zcHJpbmdDb25zdGFudCAqKiAtMSArIG90aGVyQmFsbC5jaGFyYWN0ZXJpc3RpY3Muc3ByaW5nQ29uc3RhbnQgKiogLTEpICoqIC0xO1xuXG4gIC8qKlxuICAgKiBUaGlzIGlzIGEgdmVyeSBzaW1wbGlzdGljIG1vZGVsIG9mIENvUiBidXQgaXQgc2hvdWxkIGJlIGFkZXF1YXRlXG4gICAqL1xuICBjb25zdCBmb3JjZU11bHRpcGxpZXIgPVxuICAgIGJhbGxzQXJlRGl2ZXJnaW5nKGJhbGwsIG90aGVyQmFsbClcbiAgICAgID8gMC41ICogYmFsbC5jaGFyYWN0ZXJpc3RpY3MuY29lZmZpY2llbnRPZlJlc3RpdHV0aW9uICogb3RoZXJCYWxsLmNoYXJhY3RlcmlzdGljcy5jb2VmZmljaWVudE9mUmVzdGl0dXRpb25cbiAgICAgIDogMTtcbiAgXG4gIHJldHVybiB7XG4gICAgZGlyZWN0aW9uOiBQb2ludC5jYWxjdWxhdGVBbmdsZU9mUmF5KG90aGVyQmFsbC5zdGF0ZS5sb2NhdGlvbiwgYmFsbC5zdGF0ZS5sb2NhdGlvbiksXG4gICAgbWFnbml0dWRlOiBjb21iaW5lZENvbXByZXNzaW9uICogY29tYmluZWRTdGlmZm5lc3MgKiBmb3JjZU11bHRpcGxpZXIsXG4gIH07XG59XG5cbi8qKlxuICogQXBwcm94aW1hdGUgd2hldGhlciB0d28gYmFsbHMgYXJlIG1vdmluZyBhd2F5IGZyb20gZWFjaCBvdGhlciAtLSBJJ20gbm90IGEgbWF0aGVtYXRpY2lhbiFcbiAqL1xuZnVuY3Rpb24gYmFsbHNBcmVEaXZlcmdpbmcoYmFsbDE6IEJhbGwsIGJhbGwyOiBCYWxsKTogYm9vbGVhbiB7XG4gIGNvbnN0IGN1cnJlbnREaXN0YW5jZUJldHdlZW5CYWxscyA9IFBvaW50LmNhbGN1bGF0ZUV1Y2xpZGVhbkRpc3RhbmNlKGJhbGwxLnN0YXRlLmxvY2F0aW9uLCBiYWxsMi5zdGF0ZS5sb2NhdGlvbik7XG5cbiAgLy8gZ2V0IGFwcHJveCBsb2NhdGlvbiBvZiBiYWxscyBpbiAxIG1pY3Jvc2Vjb25kIHRpbWUgaWdub3JpbmcgYWNjZWxlcmF0aW9uIC0tIG9ubHkgYW4gYXBwcm94aW1hdGlvblxuICBjb25zdCBuZXh0TG9jYXRpb25PZkJhbGwxID0gS2luZW1hdGljcy5jYWxjdWxhdGVOZXdMb2NhdGlvbihiYWxsMS5zdGF0ZSwgVmVjdG9yLnplcm8sIDEgLyAxZTYpO1xuICBjb25zdCBuZXh0TG9jYXRpb25PZkJhbGwyID0gS2luZW1hdGljcy5jYWxjdWxhdGVOZXdMb2NhdGlvbihiYWxsMi5zdGF0ZSwgVmVjdG9yLnplcm8sIDEgLyAxZTYpO1xuICBjb25zdCBuZXh0RGlzdGFuY2VCZXR3ZWVuQmFsbHMgPSBQb2ludC5jYWxjdWxhdGVFdWNsaWRlYW5EaXN0YW5jZShuZXh0TG9jYXRpb25PZkJhbGwxLCBuZXh0TG9jYXRpb25PZkJhbGwyKTtcbiAgXG4gIHJldHVybiBEZWNpbWFsLmd0KGN1cnJlbnREaXN0YW5jZUJldHdlZW5CYWxscywgbmV4dERpc3RhbmNlQmV0d2VlbkJhbGxzKTtcbn1cblxuZnVuY3Rpb24gcmFuZ2UoZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCByZXN1bHQ6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IG4gPSBmcm9tOyBuIDw9IHRvOyBuKyspIHtcbiAgICByZXN1bHQucHVzaChuKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiLyoqXG4gKiBBIENhcnRlc2lhbiBjb29yZGluYXRlIHN5c3RlbSAoVUs6IC9ryZHLkMuIdGnLkHpqyZluLywgVVM6IC9ryZHLkHLLiHRpypLJmW4vKSBpbiBhIHBsYW5lIGlzIGEgY29vcmRpbmF0ZVxuICogc3lzdGVtIHRoYXQgc3BlY2lmaWVzIGVhY2ggcG9pbnQgdW5pcXVlbHkgYnkgYSBwYWlyIG9mIG51bWVyaWNhbCBjb29yZGluYXRlcywgd2hpY2ggYXJlIHRoZVxuICogc2lnbmVkIGRpc3RhbmNlcyB0byB0aGUgcG9pbnQgZnJvbSB0d28gZml4ZWQgcGVycGVuZGljdWxhciBvcmllbnRlZCBsaW5lcywgbWVhc3VyZWQgaW4gdGhlIHNhbWVcbiAqIHVuaXQgb2YgbGVuZ3RoLlxuICogXG4gKiBAc2VlIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NhcnRlc2lhbl9jb29yZGluYXRlX3N5c3RlbVxuICovXG5cbi8qKlxuICogQSBjYXJ0ZXNpYW4gcG9pbnRcbiAqL1xuZXhwb3J0IHR5cGUgUG9pbnQgPSBSZWFkb25seTx7XG4gIHg6IG51bWJlclxuICB5OiBudW1iZXJcbn0+O1xuXG5leHBvcnQgbmFtZXNwYWNlIFBvaW50IHtcbiAgZXhwb3J0IGNvbnN0IG9yaWdpbjogUG9pbnQgPSBPYmplY3QuZnJlZXplKHsgeDogMCwgeTogMCB9KTtcblxuICBleHBvcnQgZnVuY3Rpb24gYWRkKC4uLnBvaW50czogUG9pbnRbXSk6IFBvaW50IHtcbiAgICAvLyB0aGlzIGZ1bmN0aW9uIGlzIHN1cGVyIGhvdCBzbyB3ZSBkbyBzb21lIG1pY3JvLW9wdGltaXphdGlvbiBvZiBbXSBhbmQgW3hdIGNhc2VzXG4gICAgc3dpdGNoIChwb2ludHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiBvcmlnaW47XG5cbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIHBvaW50c1swXTtcbiAgICAgIFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiBwb2ludHMucmVkdWNlKCh0b3RhbCwgcG9pbnQpID0+IHRvdGFsICsgcG9pbnQueCwgMCksXG4gICAgICAgICAgeTogcG9pbnRzLnJlZHVjZSgodG90YWwsIHBvaW50KSA9PiB0b3RhbCArIHBvaW50LnksIDApLFxuICAgICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBtdWx0aXBseUJ5KG11bHRpcGxpZXI6IG51bWJlciwgbXVsdGlwbGljYW5kOiBQb2ludCk6IFBvaW50IHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogbXVsdGlwbGllciAqIG11bHRpcGxpY2FuZC54LFxuICAgICAgeTogbXVsdGlwbGllciAqIG11bHRpcGxpY2FuZC55LFxuICAgIH07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZGl2aWRlQnkoZGl2aXNvcjogbnVtYmVyLCBkaXZpZGVuZDogUG9pbnQpOiBQb2ludCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IGRpdmlkZW5kLnggLyBkaXZpc29yLFxuICAgICAgeTogZGl2aWRlbmQueSAvIGRpdmlzb3IsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIHRoZSBhbmdsZSBiZXR3ZWVuIHRoZSBwb3NpdGl2ZSB4IGF4aXMgYW5kIHRoZSByYXkgZnJvbSBvcmlnaW4gdG8gcG9pbnRcbiAgICovXG4gIGV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVBbmdsZU9mUmF5KG9yaWdpbjogUG9pbnQsIHBvaW50OiBQb2ludCk6IG51bWJlciB7XG4gICAgLyoqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWF0aC9hdGFuMiAqL1xuXG4gICAgY29uc3QgZGVsdGFYID0gcG9pbnQueCAtIG9yaWdpbi54O1xuICAgIGNvbnN0IGRlbHRhWSA9IHBvaW50LnkgLSBvcmlnaW4ueTtcblxuICAgIHJldHVybiBNYXRoLmF0YW4yKGRlbHRhWSwgZGVsdGFYKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVFdWNsaWRlYW5EaXN0YW5jZShwb2ludDE6IFBvaW50LCBwb2ludDI6IFBvaW50KTogbnVtYmVyIHtcbiAgICAvKiogQHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9QeXRoYWdvcmVhbl90aGVvcmVtICovXG5cbiAgICBjb25zdCBkZWx0YVggPSBNYXRoLmFicyhwb2ludDEueCAtIHBvaW50Mi54KTtcbiAgICBjb25zdCBkZWx0YVkgPSBNYXRoLmFicyhwb2ludDEueSAtIHBvaW50Mi55KTtcblxuICAgIHJldHVybiAoZGVsdGFYICoqIDIgKyBkZWx0YVkgKiogMikgKiogMC41O1xuICB9XG59XG4iLCIvKipcbiAqIFV0aWxpdGllcyBmb3Igc2FmZXIgZmxvYXRpbmcgcG9pbnQgY29tcGFyaXNvblxuICogXG4gKiBBIHByb3BlciBEZWNpbWFsIHZhbHVlIG9iamVjdCB3b3VsZCBiZSBiZXR0ZXIsIGJ1dCBpbiB0aGUgYWJzZW5jZSBvZiB0aGlyZCBwYXJ0eVxuICogbGlicmFyaWVzLCB0aGlzIHdpbGwgZG8uXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNpbWFsIHtcbiAgLyoqXG4gICAqIE1heCBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdG8gY29uc2lkZXIgaW4gY29tcGFyaXNvbnNcbiAgICovXG4gIHByaXZhdGUgc3RhdGljIF9kZWNpbWFsUGxhY2VzOiBudW1iZXIgPSA3O1xuXG4gIHByaXZhdGUgc3RhdGljIG1pbk5vblplcm9WYWx1ZSA9IERlY2ltYWwuY29tcHV0ZU1pbk5vblplcm9WYWx1ZShEZWNpbWFsLl9kZWNpbWFsUGxhY2VzKTtcblxuICBzdGF0aWMgc2V0IGRlY2ltYWxQbGFjZXMobjogbnVtYmVyKSB7XG4gICAgdGhpcy5taW5Ob25aZXJvVmFsdWUgPSBEZWNpbWFsLmNvbXB1dGVNaW5Ob25aZXJvVmFsdWUobik7XG4gICAgdGhpcy5fZGVjaW1hbFBsYWNlcyA9IG47XG4gIH1cblxuICBzdGF0aWMgZ2V0IGRlY2ltYWxQbGFjZXMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fZGVjaW1hbFBsYWNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIHJlZHVjZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdG8gdGhlIGxpbWl0IHdlIGV4cGVjdC4gR2l2ZW5cbiAgICogd2UgYXJlIGRlYWxpbmcgd2l0aCBmbG9hdGluZyBwb2ludHMsIERlY2ltYWwgbWlnaHQgbm90IHdvcmsuIFRoYXQncyBva2F5LlxuICAgKi9cbiAgc3RhdGljIHRyaW0objogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBtdWx0aXBsaWVyID0gMTAgKiogRGVjaW1hbC5fZGVjaW1hbFBsYWNlcztcbiAgICByZXR1cm4gTWF0aC5yb3VuZChuICogbXVsdGlwbGllcikgLyBtdWx0aXBsaWVyO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIG4gaXMgbG9naWNhbGx5IHplcm8gYWNjb3JkaW5nIHRvIG91ciBtaW5WYWx1ZT9cbiAgICovXG4gIHN0YXRpYyBpc1plcm8objogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgLy8gbiA9PT0gMCBtaWNybyBvcHRpbWl6YXRpb24gb2YgbW9zdCBjb21tb24gY2FzZSAtLSB0aGlzIGZ1bmN0aW9uIGlzIGhvdFxuICAgIHJldHVybiBuID09PSAwIHx8IE1hdGguYWJzKG4pIDwgRGVjaW1hbC5taW5Ob25aZXJvVmFsdWU7XG4gIH1cblxuICBzdGF0aWMgZXEobjE6IG51bWJlciwgbjI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIG4xID09PSBuMiBtaWNybyBvcHRpbWl6YXRpb24gb2YgbW9zdCBjb21tb24gY2FzZSAtLSB0aGlzIGZ1bmN0aW9uIGlzIGhvdFxuICAgIHJldHVybiBuMSA9PT0gbjIgfHwgTWF0aC5hYnMobjEgLSBuMikgPCBEZWNpbWFsLm1pbk5vblplcm9WYWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiB2YWx1ZSA8IHN1YmplY3RcbiAgICovXG4gIHN0YXRpYyBsdChyZWZlcmVuY2U6IG51bWJlciwgc3ViamVjdDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHJlZmVyZW5jZSAtIHN1YmplY3QgPiBEZWNpbWFsLm1pbk5vblplcm9WYWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzdWJqZWN0ID4gcmVmZXJlbmNlXG4gICAqL1xuICBzdGF0aWMgZ3QocmVmZXJlbmNlOiBudW1iZXIsIHN1YmplY3Q6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBzdWJqZWN0IC0gcmVmZXJlbmNlID4gRGVjaW1hbC5taW5Ob25aZXJvVmFsdWU7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjb21wdXRlTWluTm9uWmVyb1ZhbHVlKGRlY2ltYWxQbGFjZXM6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuICgxIC8gMTAgKiogZGVjaW1hbFBsYWNlcykgLyAyO1xuICB9XG59XG4iLCIvKiogaW4gLT4gbSAqL1xuZXhwb3J0IGNvbnN0IE1FVFJFU19QRVJfSU5DSCA9IDAuMDI1NDtcblxuLyoqIGxiIC0+IGtnICovXG5leHBvcnQgY29uc3QgS0lMT0dSQU1TX1BFUl9QT1VORCA9IDAuNDUzNTkyO1xuXG4vKiogbGJmIC0+IE4gKi9cbmV4cG9ydCBjb25zdCBORVdUT05TX1BFUl9QT1VORF9GT1JDRSA9IDQuNDQ4MjI7XG5cbi8qKiBsYmbCt2lu4oG7wrIgLT4gTsK3beKBu8KyICovXG5leHBvcnQgY29uc3QgUEFTQ0FMU19QRVJfUFNJID0gTkVXVE9OU19QRVJfUE9VTkRfRk9SQ0UgLyBNRVRSRVNfUEVSX0lOQ0ggKiogMjtcbiIsImV4cG9ydCAqIGZyb20gXCIuL2JvdW5jaW5nLWJhbGxcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3R5cGVzLW9mLWJhbGxcIjtcbmV4cG9ydCB7IFBvaW50IH0gZnJvbSBcIi4vY2FydGVzaWFuLXN5c3RlbVwiO1xuZXhwb3J0IHsgVmVjdG9yIH0gZnJvbSBcIi4vdmVjdG9yc1wiO1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIGEgbW9kZWwgb2YgdGhlIHBoeXNpY3MgbmVjZXNzYXJ5IHRvIHNpbXVsYXRlIGJvdW5jaW5nIGJhbGxzXG4gKi9cbiIsImltcG9ydCB7IFBvaW50IH0gZnJvbSBcIi4vY2FydGVzaWFuLXN5c3RlbVwiO1xuaW1wb3J0IHsgRGVjaW1hbCB9IGZyb20gXCIuL2RlY2ltYWxcIjtcbmltcG9ydCB7IFZlY3RvciB9IGZyb20gXCIuL3ZlY3RvcnNcIjtcblxuLyoqXG4gKiBLaW5lbWF0aWNzIGlzIGEgc3ViZmllbGQgb2YgcGh5c2ljcywgZGV2ZWxvcGVkIGluIGNsYXNzaWNhbCBtZWNoYW5pY3MsIHRoYXQgZGVzY3JpYmVzIHRoZVxuICogbW90aW9uIG9mIHBvaW50cywgYm9kaWVzIChvYmplY3RzKSwgYW5kIHN5c3RlbXMgb2YgYm9kaWVzIChncm91cHMgb2Ygb2JqZWN0cykgd2l0aG91dFxuICogY29uc2lkZXJpbmcgdGhlIGZvcmNlcyB0aGF0IGNhdXNlIHRoZW0gdG8gbW92ZS5cbiAqIFxuICogQHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9LaW5lbWF0aWNzXG4gKi9cblxuZXhwb3J0IHR5cGUgQm9keSA9IFJlYWRvbmx5PHtcbiAgLyoqIFVuaXQ6IG0gKi9cbiAgbG9jYXRpb246IFBvaW50XG5cbiAgLyoqIFVuaXQ6IG3Ct3PigbvCuSAqL1xuICB2ZWxvY2l0eTogVmVjdG9yXG59PjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZU5ld1ZlbG9jaXR5KGluaXRpYWxWZWxvY2l0eTogVmVjdG9yLCBhY2NlbGVyYXRpb246IFZlY3RvciwgdGltZTogbnVtYmVyKTogVmVjdG9yIHtcbiAgaWYgKERlY2ltYWwuaXNaZXJvKGFjY2VsZXJhdGlvbi5tYWduaXR1ZGUpKSB7XG4gICAgLy8gdGhpcyBpcyBhIG1pY3JvIG9wdGltaXNhdGlvbiBhcyB0aGlzIGZ1bmN0aW9uIGlzIGhvdCBhbmQgVmVjdG9yLmFkZCBpcyBxdWl0ZSBleHBlbnNpdmVcbiAgICByZXR1cm4gaW5pdGlhbFZlbG9jaXR5O1xuICB9XG4gIGNvbnN0IGNoYW5nZU9mVmVsb2NpdHkgPSBWZWN0b3IubXVsdGlwbHlCeSh0aW1lLCBhY2NlbGVyYXRpb24pO1xuICByZXR1cm4gVmVjdG9yLmFkZChpbml0aWFsVmVsb2NpdHksIGNoYW5nZU9mVmVsb2NpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlTmV3TG9jYXRpb24oaW5pdGlhbFN0YXRlOiBCb2R5LCBhY2NlbGVyYXRpb246IFZlY3RvciwgdGltZTogbnVtYmVyKTogUG9pbnQge1xuICBsZXQgYXZlcmFnZVZlbG9jaXR5OiBWZWN0b3I7XG4gIGlmIChEZWNpbWFsLmlzWmVybyhhY2NlbGVyYXRpb24ubWFnbml0dWRlKSkge1xuICAgIC8vIHRoaXMgaXMgYSBtaWNybyBvcHRpbWlzYXRpb24gYXMgdGhpcyBmdW5jdGlvbiBpcyBob3QgYW5kIFZlY3Rvci5hZGQgaXMgcXVpdGUgZXhwZW5zaXZlXG4gICAgYXZlcmFnZVZlbG9jaXR5ID0gaW5pdGlhbFN0YXRlLnZlbG9jaXR5O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGZpbmFsVmVsb2NpdHkgPSBjYWxjdWxhdGVOZXdWZWxvY2l0eShpbml0aWFsU3RhdGUudmVsb2NpdHksIGFjY2VsZXJhdGlvbiwgdGltZSk7XG4gICAgYXZlcmFnZVZlbG9jaXR5ID0gVmVjdG9yLmRpdmlkZUJ5KDIsIFZlY3Rvci5hZGQoaW5pdGlhbFN0YXRlLnZlbG9jaXR5LCBmaW5hbFZlbG9jaXR5KSk7XG4gIH1cbiAgY29uc3QgbG9jYXRpb25EZWx0YSA9IFZlY3Rvci5tdWx0aXBseUJ5KHRpbWUsIGF2ZXJhZ2VWZWxvY2l0eSk7XG4gIHJldHVybiBQb2ludC5hZGQoaW5pdGlhbFN0YXRlLmxvY2F0aW9uLCBWZWN0b3IueHkobG9jYXRpb25EZWx0YSkpO1xufVxuIiwiaW1wb3J0IHsgQmFsbENoYXJhY3RlcmlzdGljcyB9IGZyb20gXCIuL2JvdW5jaW5nLWJhbGxcIjtcbmltcG9ydCB7IFBBU0NBTFNfUEVSX1BTSSB9IGZyb20gXCIuL2ltcGVyaWFsLW1ldHJpYy1jb252ZXJzaW9uXCI7XG5cbi8qKlxuICogVGhpcyBtb2R1bGUgY29udGFpbnMgdGhlIGNoYXJhY3RlcmlzdGljcyBvZiB2YXJpb3VzIGtpbmRzIG9mIGJhbGwuXG4gKiBcbiAqIFNvbWUgb2YgdGhlc2UgdmFsdWVzIEkgZm91bmQgb25saW5lLCBzb21lIEkgZ3Vlc3NlZC4gSSBzcGVudCB0b28gbG9uZyBvbiB0aGlzIHBhcnQuXG4gKi9cblxuZXhwb3J0IGNvbnN0IGJlYWNoQmFsbCA9IHByZXNzdXJpc2VkQmFsbCh7XG4gIGNvZWZmaWNpZW50T2ZSZXN0aXR1dGlvbjogMC4yLFxuICBkcmFnQ29lZmZpY2llbnQ6IDAuOCxcbiAgbWFzczogMC4wNyxcbiAgcmFkaXVzOiAwLjE4LFxuICBwcmVzc3VyZTogNC42LFxufSk7XG5cbmV4cG9ydCBjb25zdCBjcmlja2V0QmFsbDogQmFsbENoYXJhY3RlcmlzdGljcyA9IHtcbiAgY29lZmZpY2llbnRPZlJlc3RpdHV0aW9uOiAwLjYsXG4gIGRyYWdDb2VmZmljaWVudDogMC41LFxuICBtYXNzOiAwLjE2MyxcbiAgcmFkaXVzOiAwLjAzNjQsXG4gIC8vIFRoaXMgaXMgYSBndWVzc1xuICBzcHJpbmdDb25zdGFudDogMTAwMDAsXG59O1xuXG5leHBvcnQgY29uc3QgZm9vdGJhbGwgPSBwcmVzc3VyaXNlZEJhbGwoe1xuICBjb2VmZmljaWVudE9mUmVzdGl0dXRpb246IDAuOCxcbiAgZHJhZ0NvZWZmaWNpZW50OiAwLjIsXG4gIG1hc3M6IDAuNDUsXG4gIHJhZGl1czogMC4xMSxcbiAgcHJlc3N1cmU6IDEwLFxufSk7XG5cbmV4cG9ydCBjb25zdCBnb2xmQmFsbDogQmFsbENoYXJhY3RlcmlzdGljcyA9IHtcbiAgY29lZmZpY2llbnRPZlJlc3RpdHV0aW9uOiAwLjksXG4gIGRyYWdDb2VmZmljaWVudDogMC4yNCxcbiAgbWFzczogMC4wNDUsXG4gIHJhZGl1czogMC4wMixcbiAgLy8gVGhpcyBpcyBhIGd1ZXNzXG4gIHNwcmluZ0NvbnN0YW50OiAyMDAwLFxufTtcblxuLypcbmV4cG9ydCBjb25zdCB0YWJsZVRlbm5pc0JhbGwgPSBwcmVzc3VyaXNlZEJhbGwoe1xuICBjb2VmZmljaWVudE9mUmVzdGl0dXRpb246IDAuOCxcbiAgLy8gZHJhZ0NvZWZmaWNpZW50OiAwLjIsXG4gIC8vIG1hc3M6IDAuNDUsXG4gIC8vIHJhZGl1czogMC4xMSxcbiAgLy8gcHJlc3N1cmU6IDEwLFxufSk7XG4qL1xuXG5leHBvcnQgY29uc3QgdGVubmlzQmFsbCA9IHByZXNzdXJpc2VkQmFsbCh7XG4gIGNvZWZmaWNpZW50T2ZSZXN0aXR1dGlvbjogMC43NSxcbiAgZHJhZ0NvZWZmaWNpZW50OiAwLjYsXG4gIG1hc3M6IDAuMDU4LFxuICByYWRpdXM6IDAuMDM4NSxcbiAgcHJlc3N1cmU6IDEzLjcsXG59KTtcblxuZXhwb3J0IGNvbnN0IHZvbGxleWJhbGwgPSBwcmVzc3VyaXNlZEJhbGwoe1xuICBjb2VmZmljaWVudE9mUmVzdGl0dXRpb246IDAuNzUsXG4gIGRyYWdDb2VmZmljaWVudDogMC4xNyxcbiAgbWFzczogMC4yNjAsXG4gIHJhZGl1czogMC4xMDUsXG4gIHByZXNzdXJlOiA0LjQsXG59KTtcblxuZXhwb3J0IGNvbnN0IHR5cGVzT2ZCYWxsID0gT2JqZWN0LmZyZWV6ZShbXG4gIGJlYWNoQmFsbCxcbiAgZm9vdGJhbGwsXG4gIC8vZ29sZkJhbGwsXG4gIHRlbm5pc0JhbGwsXG4gIHZvbGxleWJhbGwsXG5dKTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRoZSBzcHJpbmcgY29uc3RhbnQgYmFzZWQgb24gdGhlIGV4dGVybmFsIHByZXNzdXJlIG9mIGEgcHJlc3N1cmlzZWQgYmFsbFxuICovXG5mdW5jdGlvbiBwcmVzc3VyaXNlZEJhbGwoY2hhcmFjdGVyaXN0aWNzOiBQcmVzc3VyaXNlZEJhbGwpOiBCYWxsQ2hhcmFjdGVyaXN0aWNzIHtcbiAgY29uc3QgeyBwcmVzc3VyZSwgLi4ucmVzdCB9ID0gY2hhcmFjdGVyaXN0aWNzO1xuICByZXR1cm4ge1xuICAgIC4uLnJlc3QsXG4gICAgLyoqIEBzZWUgaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT1wc2krdG8rcGFzY2FscyAqL1xuICAgIHNwcmluZ0NvbnN0YW50OiBjaGFyYWN0ZXJpc3RpY3MucmFkaXVzICogY2hhcmFjdGVyaXN0aWNzLnByZXNzdXJlICogUEFTQ0FMU19QRVJfUFNJLFxuICB9XG59XG5cbnR5cGUgUHJlc3N1cmlzZWRCYWxsID0gT21pdDxCYWxsQ2hhcmFjdGVyaXN0aWNzLCAnc3ByaW5nQ29uc3RhbnQnPiAmIHtcbiAgLyoqXG4gICAqIEV4dGVybmFsIHByZXNzdXJlXG4gICAqIFxuICAgKiBVbml0OiBwc2kgKGxiZsK3aW7igbvCsilcbiAgICovXG4gIHByZXNzdXJlOiBudW1iZXJcbn07XG4iLCJpbXBvcnQgeyBQb2ludCB9IGZyb20gXCIuL2NhcnRlc2lhbi1zeXN0ZW1cIjtcbmltcG9ydCB7IERlY2ltYWwgfSBmcm9tIFwiLi9kZWNpbWFsXCI7XG5cbi8qKlxuICogSW4gbWF0aGVtYXRpY3MsIHBoeXNpY3MgYW5kIGVuZ2luZWVyaW5nLCBhIEV1Y2xpZGVhbiB2ZWN0b3Igb3Igc2ltcGx5IGEgdmVjdG9yIChzb21ldGltZXNcbiAqIGNhbGxlZCBhIGdlb21ldHJpYyB2ZWN0b3Igb3Igc3BhdGlhbCB2ZWN0b3IpIGlzIGEgZ2VvbWV0cmljIG9iamVjdCB0aGF0IGhhcyBtYWduaXR1ZGVcbiAqIChvciBsZW5ndGgpIGFuZCBkaXJlY3Rpb24uIFZlY3RvcnMgY2FuIGJlIGFkZGVkIHRvIG90aGVyIHZlY3RvcnMgYWNjb3JkaW5nIHRvIHZlY3RvciBhbGdlYnJhLlxuICogXG4gKiBAc2VlIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0V1Y2xpZGVhbl92ZWN0b3JcbiAqL1xuXG5leHBvcnQgdHlwZSBWZWN0b3IgPSBSZWFkb25seTx7XG4gIC8vIERpcmVjdGlvbiBpbiByYWRpYW5zIGZyb20gLVBpIHRvICtQaS4gMCBpcyByaWdodCwgK1BpIGlzIGxlZnQsICtQaS8yIGlzIHVwLCAtUGkvMiBpcyBkb3duLlxuICBkaXJlY3Rpb246IG51bWJlclxuICBtYWduaXR1ZGU6IG51bWJlclxufT47XG5cbmV4cG9ydCB0eXBlIFhZID0gUmVhZG9ubHk8e1xuICB4OiBudW1iZXJcbiAgeTogbnVtYmVyXG59PjtcblxuZXhwb3J0IG5hbWVzcGFjZSBWZWN0b3Ige1xuICBleHBvcnQgY29uc3QgemVybzogVmVjdG9yID0gT2JqZWN0LmZyZWV6ZSh7IGRpcmVjdGlvbjogMCwgbWFnbml0dWRlOiAwIH0pO1xuICBcbiAgZXhwb3J0IGZ1bmN0aW9uIGZyb21YeSh4eTogWFkpOiBWZWN0b3Ige1xuICAgIHJldHVybiB7XG4gICAgICBkaXJlY3Rpb246IFBvaW50LmNhbGN1bGF0ZUFuZ2xlT2ZSYXkoUG9pbnQub3JpZ2luLCB4eSksXG4gICAgICBtYWduaXR1ZGU6IFBvaW50LmNhbGN1bGF0ZUV1Y2xpZGVhbkRpc3RhbmNlKFBvaW50Lm9yaWdpbiwgeHkpLFxuICAgIH07XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYWRkKC4uLnZlY3RvcnM6IFZlY3RvcltdKTogVmVjdG9yIHtcbiAgICAvLyB4eSgpIGlzIHF1aXRlIGV4cGVuc2l2ZSBkdWUgdG8gY2FsbHMgdG8gdHJpZ29ub21ldHJpYyBmdW5jdGlvbnMsIHNvIHJlbW92ZSB6ZXJvIHZlY3RvcnNcbiAgICBjb25zdCBub25aZXJvVmVjdG9ycyA9IHZlY3RvcnMuZmlsdGVyKHZlY3RvciA9PiAhRGVjaW1hbC5pc1plcm8odmVjdG9yLm1hZ25pdHVkZSkpO1xuXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBpcyBzdXBlciBob3Qgc28gd2UgZG8gc29tZSBtaWNyby1vcHRpbWl6YXRpb24gb2YgW10gYW5kIFt4XSBjYXNlc1xuICAgIHN3aXRjaCAobm9uWmVyb1ZlY3RvcnMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiB6ZXJvO1xuXG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiBub25aZXJvVmVjdG9yc1swXTtcblxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBjb25zdCB4eU1hZ25pdHVkZXMgPSB2ZWN0b3JzXG4gICAgICAgICAgLy8geHkoKSBpcyBxdWl0ZSBleHBlbnNpdmUgZHVlIHRvIGNhbGxzIHRvIHRyaWdvbm9tZXRyaWNzIGZ1bmN0aW9ucywgc28gcmVtb3ZlIDAgdmVjdG9yc1xuICAgICAgICAgIC5maWx0ZXIodmVjdG9yID0+ICFEZWNpbWFsLmlzWmVybyh2ZWN0b3IubWFnbml0dWRlKSlcbiAgICAgICAgICAubWFwKHh5KTtcbiAgICAgICAgY29uc3QgdG90YWxYeU1hZ25pdHVkZSA9IFBvaW50LmFkZCguLi54eU1hZ25pdHVkZXMpO1xuICAgICAgICByZXR1cm4gZnJvbVh5KHRvdGFsWHlNYWduaXR1ZGUpO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gbXVsdGlwbHlCeShtdWx0aXBsaWVyOiBudW1iZXIsIG11bHRpcGxpY2FuZDogVmVjdG9yKTogVmVjdG9yIHtcbiAgICByZXR1cm4geyBkaXJlY3Rpb246IG11bHRpcGxpY2FuZC5kaXJlY3Rpb24sIG1hZ25pdHVkZTogbXVsdGlwbGljYW5kLm1hZ25pdHVkZSAqIG11bHRpcGxpZXIgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBkaXZpZGVCeShkaXZpc29yOiBudW1iZXIsIGRpdmlkZW5kOiBWZWN0b3IpOiBWZWN0b3Ige1xuICAgIHJldHVybiB7IGRpcmVjdGlvbjogZGl2aWRlbmQuZGlyZWN0aW9uLCBtYWduaXR1ZGU6IGRpdmlkZW5kLm1hZ25pdHVkZSAvIGRpdmlzb3IgfTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB4eSh2ZWN0b3I6IFZlY3Rvcik6IFhZIHtcbiAgICByZXR1cm4geyB4OiB4KHZlY3RvciksIHk6IHkodmVjdG9yKSB9O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHgoeyBkaXJlY3Rpb24sIG1hZ25pdHVkZSB9OiBWZWN0b3IpOiBudW1iZXIge1xuICAgIGlmIChEZWNpbWFsLmlzWmVybyhtYWduaXR1ZGUpKSB7XG4gICAgICAvLyBhdm9pZCBleHBlbnNpdmUgdHJpZyBpZiBwb3NzaWJsZVxuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBtYWduaXR1ZGUgKiBNYXRoLmNvcyhkaXJlY3Rpb24pO1xuICB9XG4gIFxuICBleHBvcnQgZnVuY3Rpb24geSh7IGRpcmVjdGlvbiwgbWFnbml0dWRlIH06IFZlY3Rvcik6IG51bWJlciB7XG4gICAgaWYgKERlY2ltYWwuaXNaZXJvKG1hZ25pdHVkZSkpIHtcbiAgICAgIC8vIGF2b2lkIGV4cGVuc2l2ZSB0cmlnIGlmIHBvc3NpYmxlXG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1hZ25pdHVkZSAqIE1hdGguc2luKGRpcmVjdGlvbik7XG4gIH1cbn1cbiIsImltcG9ydCB7IEJhbGwsIEVudmlyb25tZW50LCBQb2ludCB9IGZyb20gXCIuLi9tb2RlbFwiO1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIGZ1bmN0aW9uYWxpdHkgZm9yIHJlbmRlcmluZyB0aGUgc3RhdGUgb2YgdGhlIGJvdW5jaW5nIGJhbGxzIHRvIHRoZSBET01cbiAqL1xuXG5leHBvcnQgY2xhc3MgQ2FudmFzIHtcbiAgY29uc3RydWN0b3IoZGltZW5zaW9uczogRW52aXJvbm1lbnRbJ2RpbWVuc2lvbnMnXSkge1xuICAgIHRoaXMuZG9tRWxlbWVudCA9IENhbnZhcy5jcmVhdGVTdmcoZGltZW5zaW9ucyk7XG5cbiAgICB0aGlzLmJvdW5kaW5nUmVjdCA9IHRoaXMuY3JlYXRlQm91bmRpbmdCb3goZGltZW5zaW9ucyk7XG4gICAgdGhpcy5kb21FbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuYm91bmRpbmdSZWN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBTVkcgZWxlbWVudCB3aGljaCBjYW4gYmUgYXBwZW5kZWQgdG8gdGhlIERPTSBpbiBvcmRlciB0byByZW5kZXIgYm91bmNpbmdcbiAgICogYmFsbHMgaW4gdGhlIGJyb3dzZXJcbiAgICogXG4gICAqIEUuZy4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbycpLmFwcGVuZENoaWxkKGNhbnZhcy5kb21FbGVtZW50KTtcbiAgICovXG4gIHJlYWRvbmx5IGRvbUVsZW1lbnQ6IFNWR0VsZW1lbnQ7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBib3VuZGluZ1JlY3Q6IFNWR0VsZW1lbnQ7XG4gIHByaXZhdGUgY2xpY2tMaXN0ZW5lcnM6IFJlYWRvbmx5QXJyYXk8Q2FudmFzLkNsaWNrTGlzdGVuZXI+ID0gW107XG4gIHByaXZhdGUgYmFsbEVsZW1lbnRzOiBTVkdDaXJjbGVFbGVtZW50W10gPSBbXTtcblxuICAvKipcbiAgICogUmVuZGVycyB0aGUgcHJvdmlkZWQgYmFsbHMgdG8gdGhlIGNhbnZhc1xuICAgKi9cbiAgcmVuZGVyKGJhbGxzOiBSZWFkb25seUFycmF5PEJhbGw+KTogdm9pZCB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiYWxscy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYmFsbCA9IGJhbGxzW2ldO1xuICAgICAgaWYgKCF0aGlzLmJhbGxFbGVtZW50c1tpXSkge1xuICAgICAgICBjb25zdCBjaXJjbGUgPSBDYW52YXMuY3JlYXRlQmFsbEVsZW1lbnQoYmFsbC5jaGFyYWN0ZXJpc3RpY3MucmFkaXVzKTtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmFwcGVuZENoaWxkKGNpcmNsZSk7XG4gICAgICAgIHRoaXMuYmFsbEVsZW1lbnRzLnB1c2goY2lyY2xlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYmFsbEVsZW1lbnRzW2ldLnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke2JhbGwuc3RhdGUubG9jYXRpb24ueH0gJHstYmFsbC5zdGF0ZS5sb2NhdGlvbi55fSlgKTtcbiAgICAgIHRoaXMuYmFsbEVsZW1lbnRzW2ldLnNldEF0dHJpYnV0ZSgncicsIGAke2JhbGwuY2hhcmFjdGVyaXN0aWNzLnJhZGl1c31gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGxpc3RlbmVyIHdoaWNoIHdpbGwgYmUgZmlyZWQgd2hlbiB0aGUgY2FudmFzIGlzIGNsaWNrZWQuIFRoZSBsb2NhdGlvblxuICAgKiBwcm92aWRlZCB0byB0aGUgbGlzdGVuZXIgd2lsbCBiZSBhY2NvcmRpbmcgdG8gdGhlIGNvb3JkaW5hdGUgc3lzdGVtIG9mIHRoZVxuICAgKiBib3VuY2luZyBiYWxscyBlbnZpcm9ubWVudC5cbiAgICovXG4gIG9uQ2xpY2sobGlzdGVuZXI6IENhbnZhcy5DbGlja0xpc3RlbmVyKTogQ2FudmFzLkNhbmNlbExpc3RlbmVyRm4ge1xuICAgIHRoaXMuY2xpY2tMaXN0ZW5lcnMgPSBbLi4udGhpcy5jbGlja0xpc3RlbmVycywgbGlzdGVuZXJdO1xuXG4gICAgY29uc3QgY2FuY2VsTGlzdGVuZXIgPSAoKSA9PiB7XG4gICAgICB0aGlzLmNsaWNrTGlzdGVuZXJzID0gdGhpcy5jbGlja0xpc3RlbmVycy5maWx0ZXIobCA9PiBsICE9PSBsaXN0ZW5lcik7XG4gICAgfTtcblxuICAgIHJldHVybiBjYW5jZWxMaXN0ZW5lcjtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNyZWF0ZVN2ZyhkaW1lbnNpb25zOiBFbnZpcm9ubWVudFsnZGltZW5zaW9ucyddKTogU1ZHRWxlbWVudCB7XG4gICAgY29uc3Qgc3ZnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdzdmcnKTtcblxuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnMTAwJScpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdCb3gnLCBgMCAwICR7ZGltZW5zaW9ucy53aWR0aH0gJHtkaW1lbnNpb25zLmhlaWdodH1gKTtcblxuICAgIHJldHVybiBzdmc7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUJvdW5kaW5nQm94KGRpbWVuc2lvbnM6IEVudmlyb25tZW50WydkaW1lbnNpb25zJ10pOiBTVkdFbGVtZW50IHtcbiAgICBjb25zdCByZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0JylcblxuICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIGAke2RpbWVuc2lvbnMud2lkdGh9YCk7XG4gICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGAke2RpbWVuc2lvbnMuaGVpZ2h0fWApO1xuICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWxsJywgJyMxMTEnKTtcblxuICAgIHJlY3Qub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IGJvdW5kaW5nUmVjdCA9IHJlY3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCB4UGN0ID0gKGV2ZW50LmNsaWVudFggLSBib3VuZGluZ1JlY3QubGVmdCkgLyBib3VuZGluZ1JlY3Qud2lkdGg7XG4gICAgICAvLyAxIC0gbiBiZWNhdXNlIHN2ZyBjb29yZGluYXRlcyBhcmUgdG9wIHRvIGJvdHRvbSB3aGVyZSBhcyB3ZSB3YW50IGJvdHRvbSB0byB0b3BcbiAgICAgIGNvbnN0IHlQY3QgPSAxIC0gKGV2ZW50LmNsaWVudFkgLSBib3VuZGluZ1JlY3QudG9wKSAvIGJvdW5kaW5nUmVjdC5oZWlnaHQ7XG4gICAgICBjb25zdCBsb2NhdGlvbjogUG9pbnQgPSB7IHg6IHhQY3QgKiBkaW1lbnNpb25zLndpZHRoLCB5OiB5UGN0ICogZGltZW5zaW9ucy5oZWlnaHQgfTtcblxuICAgICAgdGhpcy5jbGlja0xpc3RlbmVycy5mb3JFYWNoKGxpc3RlbmVyID0+IGxpc3RlbmVyKGxvY2F0aW9uKSk7XG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gcmVjdDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGNyZWF0ZUJhbGxFbGVtZW50KHJhZGl1czogbnVtYmVyKTogU1ZHQ2lyY2xlRWxlbWVudCB7XG4gICAgY29uc3QgY2lyY2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdjaXJjbGUnKVxuXG4gICAgY29uc3QgY29sb3VyID0gYHJnYigke3JhbmRSZ2IoKX0sICR7cmFuZFJnYigpfSwgJHtyYW5kUmdiKCl9KWA7XG4gICAgY2lyY2xlLnNldEF0dHJpYnV0ZSgnZmlsbCcsIGNvbG91cik7XG4gICAgY2lyY2xlLnNldEF0dHJpYnV0ZSgnY3gnLCAnMCcpO1xuICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoJ2N5JywgJzEwMCUnKTtcblxuICAgIHJldHVybiBjaXJjbGU7XG4gIH1cbn1cblxuZXhwb3J0IG5hbWVzcGFjZSBDYW52YXMge1xuICBleHBvcnQgdHlwZSBDbGlja0xpc3RlbmVyID0gKGxvY2F0aW9uOiBQb2ludCkgPT4gdm9pZDtcbiAgXG4gIGV4cG9ydCB0eXBlIENhbmNlbExpc3RlbmVyRm4gPSAoKSA9PiB2b2lkO1xufVxuXG5mdW5jdGlvbiByYW5kUmdiKCk6IG51bWJlciB7XG4gIC8vIGRhcmtlciBjb2xvdXJzIGFyZSBlYXNpZXIgdG8gc2VlLCBzbyB3ZSB1c2UgbWF4IDEyOCByYXRoZXIgdGhhbiAyNTZcbiAgcmV0dXJuIE1hdGgucm91bmQoMTI4ICsgMTI4ICogTWF0aC5yYW5kb20oKSk7XG59XG4iLCJpbXBvcnQgeyBCYWxsQ2hhcmFjdGVyaXN0aWNzLCBTaW11bGF0aW9uLCBWZWN0b3IgfSBmcm9tIFwiLi4vbW9kZWxcIjtcbmltcG9ydCB7IENhbnZhcyB9IGZyb20gXCIuL2RvbVwiO1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIGxvZ2ljIGZvciBydW5uaW5nIGEgYm91bmNpbmcgYmFsbHMgc2ltdWxhdGlvbiBpbiB0aGUgYnJvd3NlclxuICovXG5cbmV4cG9ydCB0eXBlIEJvdW5jaW5nQmFsbHNBcHBDb25maWcgPSBSZWFkb25seTx7XG4gIHNpbXVsYXRpb246IE9taXQ8U2ltdWxhdGlvbi5Db25maWcsICdmcmVxdWVuY3knPlxuICB0eXBlc09mQmFsbDogUmVhZG9ubHlBcnJheTxCYWxsQ2hhcmFjdGVyaXN0aWNzPlxufT47XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJvdW5jaW5nIGJhbGxzIHNpbXVsYXRpb24gaW4gdGhlIERPTVxuICovXG5leHBvcnQgZnVuY3Rpb24gYm91bmNpbmdCYWxsc0FwcChcbiAgY29uZmlnOiBCb3VuY2luZ0JhbGxzQXBwQ29uZmlnXG4pOiBbZWxlbWVudDogU1ZHRWxlbWVudCwgc3RvcFNpbXVsYXRpb246ICgpID0+IHZvaWRdIHtcbiAgY29uc3QgY2FudmFzID0gbmV3IENhbnZhcyhjb25maWcuc2ltdWxhdGlvbi5lbnZpcm9ubWVudC5kaW1lbnNpb25zKTtcblxuICBmdW5jdGlvbiByYW5kb21CYWxsKCk6IEJhbGxDaGFyYWN0ZXJpc3RpY3Mge1xuICAgIGNvbnN0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGNvbmZpZy50eXBlc09mQmFsbC5sZW5ndGggLSAxKSlcbiAgICByZXR1cm4gY29uZmlnLnR5cGVzT2ZCYWxsW3JhbmRvbUluZGV4XTtcbiAgfVxuXG4gIC8vIEVhY2ggdGltZSB0aGUgY2FudmFzIGlzIGNsaWNrZWQsIHdlJ2xsIHNwYXduIGEgbmV3IGJhbGwgaW4gdGhlIHNpbXVsYXRpb25cbiAgY29uc3QgY2FuY2VsTGlzdGVuZXIgPSBjYW52YXMub25DbGljayhsb2NhdGlvbiA9PiB7XG4gICAgc2ltdWxhdGlvbi5zcGF3bkJhbGwoe1xuICAgICAgY2hhcmFjdGVyaXN0aWNzOiByYW5kb21CYWxsKCksXG4gICAgICBzdGF0ZTogeyBsb2NhdGlvbiwgdmVsb2NpdHk6IHJhbmRvbVZlbG9jaXR5KCkgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gZnJlcXVlbmN5IHNob3VsZCBpZGVhbGx5IGJlIG11bHRpcGxlIG9mIDYwIHRvIGdpdmUgc21vb3RoZXN0IHBvc3NpYmxlIGFuaW1hdGlvbiBhdCA2MGZwc1xuICBjb25zdCBbc2ltdWxhdGlvbiwgc3RvcFNpbXVsYXRpb25dID0gcnVuU2ltdWxhdGlvbihjb25maWcuc2ltdWxhdGlvbiwgKCkgPT4gY2FudmFzLnJlbmRlcihzaW11bGF0aW9uLmJhbGxzKSk7XG5cbiAgY29uc3Qgc3RvcCA9ICgpID0+IHtcbiAgICBjYW5jZWxMaXN0ZW5lcigpO1xuICAgIHN0b3BTaW11bGF0aW9uKCk7XG4gIH07XG5cbiAgcmV0dXJuIFtjYW52YXMuZG9tRWxlbWVudCwgc3RvcF07XG59XG5cbmNvbnN0IGluaXRpYWxGcmVxdWVuY3kgPSAxMjAwO1xuY29uc3QgdGFyZ2V0U2ltVXBkYXRlTGF0ZW5jeU1zID0gNDtcblxuLyoqXG4gKiBSdW5zIGEgYm91bmNpbmcgYmFsbHMgc2ltdWxhdGlvbiB1bnRpbCBzdG9wcGVkXG4gKiBcbiAqIEBwYXJhbSByZW5kZXIgQSBmdW5jdGlvbiB3aGljaCB3aWxsIHJlbmRlciB0aGUgc3RhdGUgb2YgdGhlIHNpbXVsYXRpb24gdG8gdGhlIERPTS4gQ2FsbGVkIGJ5IGEgUkFGIGNhbGxiYWNrXG4gKi9cbmZ1bmN0aW9uIHJ1blNpbXVsYXRpb24oY29uZmlnOiBCb3VuY2luZ0JhbGxzQXBwQ29uZmlnWydzaW11bGF0aW9uJ10sIHJlbmRlcjogKCkgPT4gdm9pZCk6IFtzaW11bGF0aW9uOiBTaW11bGF0aW9uLCBzdG9wOiAoKSA9PiB2b2lkXSB7XG4gIGNvbnN0IHNpbXVsYXRpb24gPSBuZXcgU2ltdWxhdGlvbih7IC4uLmNvbmZpZywgZnJlcXVlbmN5OiBpbml0aWFsRnJlcXVlbmN5IH0pO1xuXG4gIGNvbnN0IHNpbXVsYXRpb25TdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgbGV0IHRvdGFsUGF1c2VUaW1lID0gMDtcbiAgbGV0IGxhc3RUaWNrVGltZSA9IHNpbXVsYXRpb25TdGFydFRpbWU7XG5cbiAgY29uc3QgdGljayA9ICgpID0+IHtcbiAgICAvLyBub3RlIC0tIGRvIG5vdCB1c2UgdGhlIHRpbWVzdGFtcCBwcm92aWRlZCBieSByYWYgdG8gdGhpcyBjYWxsYmFjayAtLSBpdCdzIHRvbyBzdGFsZVxuICAgIGlmIChzdG9wcGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIGNvbnN0IHRpbWVTaW5jZUxhc3RUaWNrID0gY3VycmVudFRpbWUgLSBsYXN0VGlja1RpbWU7XG4gICAgaWYgKHRpbWVTaW5jZUxhc3RUaWNrID4gNTAwKSB7XG4gICAgICAvKipcbiAgICAgICAqIG5vIHRpY2tzIGZvciBtb3JlIHRoYW4gNTAwbXMuIFRoZSB0YWIgcHJvYmFibHkgbG9zdCBmb2N1cyBkZW55aW5nIHVzIENQVS4gRG9uJ3QgdHJ5IHRvXG4gICAgICAgKiBzaW11bGF0ZSBhbGwgb2YgdGhlIG1pc3NlZCBmcmFtZXMgb3Igd2UnbGwgYmxvY2sgcmVuZGVyaW5nIGZvciBhZ2VzLiBJbnN0ZWFkIHdlJ2xsIHRyZWF0XG4gICAgICAgKiB0aGUgbWlzc2VkIHBlcmlvZCBhcyBhIHBhdXNlIGluIHRoZSBzaW11bGF0aW9uLlxuICAgICAgICovXG4gICAgICAgdG90YWxQYXVzZVRpbWUgKz0gdGltZVNpbmNlTGFzdFRpY2s7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0U2ltVGltZXN0YW1wID0gKGN1cnJlbnRUaW1lIC0gc2ltdWxhdGlvblN0YXJ0VGltZSAtIHRvdGFsUGF1c2VUaW1lKSAvIDEwMDA7XG4gICAgc2ltdWxhdGlvbi5hZHZhbmNlVG9UaW1lKHRhcmdldFNpbVRpbWVzdGFtcCk7XG4gICAgLy8gaG93IGxvbmcgZGlkIGl0IHRha2UgdG8gdXBkYXRlIHRoZSBzaW11bGF0aW9uP1xuICAgIGNvbnN0IHNpbVVwZGF0ZUxhdGVuY3lNcyA9IE1hdGgubWF4KDEsIHBlcmZvcm1hbmNlLm5vdygpIC0gY3VycmVudFRpbWUpO1xuICAgIC8vIHVwZGF0ZSB0aGUgZnJlcXVlbmN5IG9mIHRoZSBzaW11bGF0aW9uIGJhc2VkIG9uIGhvdyBsb25nIGl0IHRvb2sgdG8gdXBkYXRlIHZzIG91ciBpZGVhbCBsYXRlbmN5XG4gICAgY29uc3QgaWRlYWxGcmVxdWVuY3kgPSBzaW11bGF0aW9uLmZyZXF1ZW5jeSAqIHRhcmdldFNpbVVwZGF0ZUxhdGVuY3lNcyAvIHNpbVVwZGF0ZUxhdGVuY3lNcztcbiAgICBzaW11bGF0aW9uLmZyZXF1ZW5jeSA9IE1hdGgubWF4KDMwMCwgTWF0aC5taW4oNjAwMCwgaWRlYWxGcmVxdWVuY3kpKTtcblxuICAgIHJlbmRlcigpO1xuXG4gICAgbGFzdFRpY2tUaW1lID0gY3VycmVudFRpbWU7XG5cbiAgICBpZiAoIXN0b3BwZWQpIHtcbiAgICAgIC8vIHNjaGVkdWxlIHRoZSBuZXh0IHRpY2tcbiAgICAgIHJhZkhhbmRsZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICB9XG4gIH07XG5cbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgLy8gc2NoZWR1bGUgdGhlIGZpcnN0IHRpY2tcbiAgbGV0IHJhZkhhbmRsZSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTsgIFxuXG4gIGNvbnN0IHN0b3AgPSAoKSA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUocmFmSGFuZGxlKTtcbiAgfTtcblxuICByZXR1cm4gW3NpbXVsYXRpb24sIHN0b3BdO1xufVxuXG5mdW5jdGlvbiByYW5kb21WZWxvY2l0eSgpOiBWZWN0b3Ige1xuICByZXR1cm4ge1xuICAgIGRpcmVjdGlvbjogMiAqIE1hdGguUEkgKiBNYXRoLnJhbmRvbSgpIC0gTWF0aC5QSSxcbiAgICBtYWduaXR1ZGU6IDE1ICogTWF0aC5yYW5kb20oKSxcbiAgfTtcbn1cbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiaW1wb3J0IHsgYm91bmNpbmdCYWxsc0FwcCB9IGZyb20gXCIuL3VpXCI7XG5pbXBvcnQgeyBFbnZpcm9ubWVudCwgdHlwZXNPZkJhbGwgfSBmcm9tIFwiLi9tb2RlbFwiO1xuXG5jb25zdCBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQgPSB7XG4gIGRpbWVuc2lvbnM6IHsgd2lkdGg6IDEwLCBoZWlnaHQ6IDYgfSxcbiAgZ3Jhdml0eTogeyBkaXJlY3Rpb246IC1NYXRoLlBJLzIsIG1hZ25pdHVkZTogOS44IH0sXG4gIHdpbmQ6IHsgZGlyZWN0aW9uOiAwLCBtYWduaXR1ZGU6IDAgfSxcbiAgZmx1aWREZW5zaXR5OiAxLjIsXG59O1xuXG5jb25zdCBbYXBwRWxlbWVudF0gPSBib3VuY2luZ0JhbGxzQXBwKHtcbiAgc2ltdWxhdGlvbjogeyBlbnZpcm9ubWVudCwgbWF4TnVtQmFsbHM6IDEwMCB9LFxuICB0eXBlc09mQmFsbCxcbn0pO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFpbmVyJyk/LmFwcGVuZENoaWxkKGFwcEVsZW1lbnQpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==