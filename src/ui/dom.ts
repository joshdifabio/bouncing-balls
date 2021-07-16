import { Ball, Environment, Point } from "../model";

/**
 * This module contains functionality for rendering the state of the bouncing balls to the DOM
 */

export class Canvas {
  constructor(dimensions: Environment['dimensions']) {
    this.domElement = Canvas.createSvg(dimensions);

    this.boundingRect = this.createBoundingBox(dimensions);
    this.domElement.appendChild(this.boundingRect);
  }

  /**
   * An SVG element which can be appended to the DOM in order to render bouncing
   * balls in the browser
   * 
   * E.g. document.getElementById('foo').appendChild(canvas.domElement);
   */
  readonly domElement: SVGElement;

  private readonly boundingRect: SVGElement;
  private clickListeners: ReadonlyArray<Canvas.ClickListener> = [];
  private ballElements: SVGCircleElement[] = [];

  /**
   * Renders the provided balls to the canvas
   */
  render(balls: ReadonlyArray<Ball>): void {
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
  onClick(listener: Canvas.ClickListener): Canvas.CancelListenerFn {
    this.clickListeners = [...this.clickListeners, listener];

    const cancelListener = () => {
      this.clickListeners = this.clickListeners.filter(l => l !== listener);
    };

    return cancelListener;
  }

  private static createSvg(dimensions: Environment['dimensions']): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    return svg;
  }

  private createBoundingBox(dimensions: Environment['dimensions']): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    rect.setAttribute('width', `${dimensions.width}`);
    rect.setAttribute('height', `${dimensions.height}`);
    rect.setAttribute('fill', '#111');

    rect.onclick = event => {
      const boundingRect = rect.getBoundingClientRect();
      const xPct = (event.clientX - boundingRect.left) / boundingRect.width;
      // 1 - n because svg coordinates are top to bottom where as we want bottom to top
      const yPct = 1 - (event.clientY - boundingRect.top) / boundingRect.height;
      const location: Point = { x: xPct * dimensions.width, y: yPct * dimensions.height };

      this.clickListeners.forEach(listener => listener(location));
    };
    
    return rect;
  }

  private static createBallElement(radius: number): SVGCircleElement {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

    const colour = `rgb(${randRgb()}, ${randRgb()}, ${randRgb()})`;
    circle.setAttribute('fill', colour);
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '100%');

    return circle;
  }
}

export namespace Canvas {
  export type ClickListener = (location: Point) => void;
  
  export type CancelListenerFn = () => void;
}

function randRgb(): number {
  // darker colours are easier to see, so we use max 128 rather than 256
  return Math.round(128 + 128 * Math.random());
}
