import { Rect, Circle, Triangle, Line, Polygon } from 'fabric';
import { Plugin, PluginContext, PluginOptions } from '../core/Plugin';

export interface ShapePluginOptions extends PluginOptions {
  defaultFill?: string;
  defaultStroke?: string;
  defaultStrokeWidth?: number;
}

export class ShapePlugin extends Plugin {
  constructor(context: PluginContext, options: ShapePluginOptions = {}) {
    super('shape', context, {
      defaultFill: '#cccccc',
      defaultStroke: '#000000',
      defaultStrokeWidth: 1,
      ...options,
    });
  }

  install(): void {
    // Plugin is installed
  }

  uninstall(): void {
    // Cleanup if needed
  }

  /**
   * Add a rectangle
   */
  addRectangle(options?: Partial<any>): Rect {
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: this.options.defaultFill,
      stroke: this.options.defaultStroke,
      strokeWidth: this.options.defaultStrokeWidth,
      ...options,
    });

    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();

    return rect;
  }

  /**
   * Add a circle
   */
  addCircle(options?: Partial<any>): Circle {
    const circle = new Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: this.options.defaultFill,
      stroke: this.options.defaultStroke,
      strokeWidth: this.options.defaultStrokeWidth,
      ...options,
    });

    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();

    return circle;
  }

  /**
   * Add a triangle
   */
  addTriangle(options?: Partial<any>): Triangle {
    const triangle = new Triangle({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: this.options.defaultFill,
      stroke: this.options.defaultStroke,
      strokeWidth: this.options.defaultStrokeWidth,
      ...options,
    });

    this.canvas.add(triangle);
    this.canvas.setActiveObject(triangle);
    this.canvas.renderAll();

    return triangle;
  }

  /**
   * Add a line
   */
  addLine(x1: number = 100, y1: number = 100, x2: number = 200, y2: number = 200, options?: Partial<any>): Line {
    const line = new Line([x1, y1, x2, y2], {
      stroke: this.options.defaultStroke,
      strokeWidth: this.options.defaultStrokeWidth,
      ...options,
    });

    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();

    return line;
  }

  /**
   * Add a polygon
   */
  addPolygon(points: { x: number; y: number }[], options?: Partial<any>): Polygon {
    const polygon = new Polygon(points, {
      left: 100,
      top: 100,
      fill: this.options.defaultFill,
      stroke: this.options.defaultStroke,
      strokeWidth: this.options.defaultStrokeWidth,
      ...options,
    });

    this.canvas.add(polygon);
    this.canvas.setActiveObject(polygon);
    this.canvas.renderAll();

    return polygon;
  }

  /**
   * Change fill color of selected shape
   */
  setFillColor(color: string): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      return false;
    }

    activeObject.set('fill', color);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Change stroke color of selected shape
   */
  setStrokeColor(color: string): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      return false;
    }

    activeObject.set('stroke', color);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Change stroke width
   */
  setStrokeWidth(width: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      return false;
    }

    activeObject.set('strokeWidth', width);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Set corner radius for rectangle
   */
  setCornerRadius(radius: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'rect') {
      return false;
    }

    (activeObject as Rect).set('rx', radius);
    (activeObject as Rect).set('ry', radius);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Set opacity
   */
  setOpacity(opacity: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      return false;
    }

    activeObject.set('opacity', opacity);
    this.canvas.renderAll();
    return true;
  }
}
