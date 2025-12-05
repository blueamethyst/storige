import { FabricObject, ActiveSelection } from 'fabric';
import { Plugin, PluginContext, PluginOptions } from '../core/Plugin';

export class SelectionPlugin extends Plugin {
  constructor(context: PluginContext, options: PluginOptions = {}) {
    super('selection', context, options);
  }

  install(): void {
    // Plugin is installed
  }

  uninstall(): void {
    // Cleanup if needed
  }

  /**
   * Get currently selected object
   */
  getActiveObject(): FabricObject | null {
    return this.canvas.getActiveObject() || null;
  }

  /**
   * Get all selected objects
   */
  getActiveObjects(): FabricObject[] {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) {
      return [];
    }

    if (activeObject.type === 'activeSelection') {
      return (activeObject as ActiveSelection).getObjects();
    }

    return [activeObject];
  }

  /**
   * Select object by ID or reference
   */
  selectObject(obj: FabricObject | string): boolean {
    let targetObj: FabricObject | undefined;

    if (typeof obj === 'string') {
      // Find by custom ID
      targetObj = this.canvas.getObjects().find((o: any) => o.id === obj);
    } else {
      targetObj = obj;
    }

    if (!targetObj) {
      return false;
    }

    this.canvas.setActiveObject(targetObj);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Deselect all
   */
  clearSelection(): void {
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  /**
   * Select all objects
   */
  selectAll(): void {
    const selection = new ActiveSelection(this.canvas.getObjects(), {
      canvas: this.canvas,
    });
    this.canvas.setActiveObject(selection);
    this.canvas.renderAll();
  }

  /**
   * Delete selected object(s)
   */
  deleteSelected(): boolean {
    const activeObjects = this.getActiveObjects();
    if (activeObjects.length === 0) {
      return false;
    }

    activeObjects.forEach((obj) => {
      this.canvas.remove(obj);
    });

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    return true;
  }

  /**
   * Duplicate selected object(s)
   */
  async duplicateSelected(offset: number = 10): Promise<FabricObject[]> {
    const activeObjects = this.getActiveObjects();
    if (activeObjects.length === 0) {
      return [];
    }

    const cloned: FabricObject[] = [];

    for (const obj of activeObjects) {
      const clone = await obj.clone();
      clone.set({
        left: (clone.left || 0) + offset,
        top: (clone.top || 0) + offset,
      });
      this.canvas.add(clone);
      cloned.push(clone);
    }

    // Select the duplicated objects
    if (cloned.length === 1) {
      this.canvas.setActiveObject(cloned[0]);
    } else if (cloned.length > 1) {
      const selection = new ActiveSelection(cloned, {
        canvas: this.canvas,
      });
      this.canvas.setActiveObject(selection);
    }

    this.canvas.renderAll();
    return cloned;
  }

  /**
   * Bring to front
   */
  bringToFront(): boolean {
    const activeObject = this.getActiveObject();
    if (!activeObject) {
      return false;
    }

    this.canvas.bringObjectToFront(activeObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Send to back
   */
  sendToBack(): boolean {
    const activeObject = this.getActiveObject();
    if (!activeObject) {
      return false;
    }

    this.canvas.sendObjectToBack(activeObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Bring forward
   */
  bringForward(): boolean {
    const activeObject = this.getActiveObject();
    if (!activeObject) {
      return false;
    }

    this.canvas.bringObjectForward(activeObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Send backward
   */
  sendBackward(): boolean {
    const activeObject = this.getActiveObject();
    if (!activeObject) {
      return false;
    }

    this.canvas.sendObjectBackwards(activeObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Align selected object(s)
   */
  align(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): boolean {
    const activeObjects = this.getActiveObjects();
    if (activeObjects.length === 0) {
      return false;
    }

    const canvasWidth = this.canvas.width || 800;
    const canvasHeight = this.canvas.height || 600;

    activeObjects.forEach((obj) => {
      const width = (obj.width || 0) * (obj.scaleX || 1);
      const height = (obj.height || 0) * (obj.scaleY || 1);

      switch (alignment) {
        case 'left':
          obj.set('left', 0);
          break;
        case 'center':
          obj.set('left', (canvasWidth - width) / 2);
          break;
        case 'right':
          obj.set('left', canvasWidth - width);
          break;
        case 'top':
          obj.set('top', 0);
          break;
        case 'middle':
          obj.set('top', (canvasHeight - height) / 2);
          break;
        case 'bottom':
          obj.set('top', canvasHeight - height);
          break;
      }

      obj.setCoords();
    });

    this.canvas.renderAll();
    return true;
  }

  /**
   * Lock/unlock selected object
   */
  toggleLock(): boolean {
    const activeObject = this.getActiveObject();
    if (!activeObject) {
      return false;
    }

    const isLocked = activeObject.lockMovementX && activeObject.lockMovementY;

    activeObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      selectable: isLocked, // If locked, make unselectable
    });

    this.canvas.renderAll();
    return true;
  }
}
