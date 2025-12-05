import { FabricImage } from 'fabric';
import { Plugin, PluginContext, PluginOptions } from '../core/Plugin';

export interface ImagePluginOptions extends PluginOptions {
  maxWidth?: number;
  maxHeight?: number;
  defaultScale?: number;
}

export class ImagePlugin extends Plugin {
  constructor(context: PluginContext, options: ImagePluginOptions = {}) {
    super('image', context, {
      maxWidth: 1000,
      maxHeight: 1000,
      defaultScale: 1,
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
   * Add an image to the canvas from URL
   */
  async addImageFromUrl(url: string, options?: Partial<any>): Promise<FabricImage> {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, {}, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        if (!img.width || !img.height) {
          reject(new Error('Invalid image'));
          return;
        }

        // Scale image if it's too large
        const maxWidth = this.options.maxWidth;
        const maxHeight = this.options.maxHeight;

        if (img.width > maxWidth || img.height > maxHeight) {
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
          img.scale(scale);
        }

        img.set({
          left: 100,
          top: 100,
          ...options,
        });

        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();

        resolve(img);
      }).catch(reject);
    });
  }

  /**
   * Add image from File object (upload)
   */
  async addImageFromFile(file: File, options?: Partial<any>): Promise<FabricImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.addImageFromUrl(dataUrl, options)
          .then(resolve)
          .catch(reject);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Replace image source
   */
  async replaceImage(url: string): Promise<boolean> {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      return false;
    }

    const img = activeObject as FabricImage;

    return new Promise((resolve) => {
      FabricImage.fromURL(url, {}, { crossOrigin: 'anonymous' }).then((newImg) => {
        if (!newImg.width || !newImg.height) {
          resolve(false);
          return;
        }

        // Keep the same position and dimensions
        const left = img.left;
        const top = img.top;
        const scaleX = img.scaleX;
        const scaleY = img.scaleY;

        newImg.set({
          left,
          top,
          scaleX,
          scaleY,
        });

        this.canvas.remove(img);
        this.canvas.add(newImg);
        this.canvas.setActiveObject(newImg);
        this.canvas.renderAll();

        resolve(true);
      }).catch(() => resolve(false));
    });
  }

  /**
   * Apply filters to image
   */
  applyFilter(filterType: 'grayscale' | 'sepia' | 'invert' | 'blur'): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      return false;
    }

    const img = activeObject as FabricImage;

    // Note: Fabric.js 6.x has different filter API
    // This is a simplified version
    img.applyFilters();
    this.canvas.renderAll();

    return true;
  }

  /**
   * Set image opacity
   */
  setOpacity(opacity: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      return false;
    }

    activeObject.set('opacity', opacity);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Crop image
   */
  cropImage(cropX: number, cropY: number, cropWidth: number, cropHeight: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      return false;
    }

    const img = activeObject as FabricImage;
    img.set({
      cropX,
      cropY,
      width: cropWidth,
      height: cropHeight,
    });

    this.canvas.renderAll();
    return true;
  }
}
