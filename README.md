# Bouncing Balls

Bouncing balls in your browser using real physics. Sort of.

Regarding quality; I have treated this like a regular piece of work as much as possible, but there's only so much one can fit into one's evenings!

## Installation

1. `cd /path/to/this/project`
2. `npm ci`

## Running this in your browser

1. `cd /path/to/this/project`
2. `npm start`
3. Open your browser at http://127.0.0.1:8080, or whatever port `npm start` outputs in your terminal

## Usage notes

### Differing balls

When you click on the screen, a random type of ball will be spawned. The ball will have the characteristics of one of the following:

* Beach ball
* Cricket ball
* Football
* Volleyball

### Performance

The simulation should perform fine on a desktop or laptop computer with up to 100 balls on screen at once. It's buttery smooth on any old device with up to 10 balls, but that's less fun, so I've set the limit to 100 balls.

Once you try to spawn a 101st ball, old balls will begin being removed from the simulation, FIFO. Note that ball colours will change when balls start getting removed from the simulation. I would have fixed this but it looks cool so I left it as is.

### Balls passing through other balls

Sometimes you might see a golf ball pass through another ball when at least one of the balls is travelling very fast. This is only likely to happen if you are on a low end device, and the frequency of the simulation is reduced to keep FPS high. (The sim frequency automatically changes based on CPU performance.)

### Balls sometimes bouncing forever

Due to my very simplistic physics model, balls will sometimes bounce forever. I know why this happens but it's hard to fix. I spent some trying to resolve it but the physics was too complex, so I gave up. Disappointing.

## The source code

Everything of interest is within `src`. Contained within `src/model` is a model of the physics of bouncing balls based on what I could find on Wikipedia. Contained within `src/ui` is an implementation of a DOM-based UI. I.e. this contains what you see in the browser. `src/index.ts` creates and configures the simulation.

## Running the tests

There are various unit tests. I have focussed on functionality which has an objectively correct behaviour, i.e. functions for which there is an oracle of truth, such as a law of physics. Physics functions which do not have an objectively correct behaviour (i.e. where I have implemented heuristics to allow the simplified physics model to function reasonably correctly) do not have unit tests, because these do not have objectively correct behavior.

Run the tests using npm:

```
npm test
```

# Third party code and libraries

Excluding test boilerplate, I did not reference or use a single line of code from any other author in writing any of the code within `src`, other than reading up on how to create SVG elements via the DOM API on MDN.

Outside of `src`, I read the Webpack docs in order to configure webpack to transpile the TypeScript to JavaScript and bundle it for the browser.

The libraries used within `src` are:
* `array-flat-polyfill`, which provides `[].flat` and `[].flatMap`, which are not available in ES2016.
* `mocha` for unit test boilerplate.

## Making changes to the code

I've included pre-bundled JS, so there's no need to build anything. However, if you want to change the source code and rebuild the JS then you can do so by running:

```
npm run build
```

## Closing comments

This was quite fun to do. There are various aspects of the physics, such as angular velocity (rotation) and friction, which I didn't model. It'd be interesting to also model those things.
