import type { Canvas as FabricCanvas } from 'fabric';

export interface PluginOptions {
  [key: string]: any;
}

export interface PluginContext {
  canvas: FabricCanvas;
  editor: any; // Reference to Editor instance
}

export abstract class Plugin {
  public name: string;
  protected canvas: FabricCanvas;
  protected editor: any;
  protected options: PluginOptions;

  constructor(name: string, context: PluginContext, options: PluginOptions = {}) {
    this.name = name;
    this.canvas = context.canvas;
    this.editor = context.editor;
    this.options = options;
  }

  /**
   * Called when plugin is installed
   */
  abstract install(): void;

  /**
   * Called when plugin is uninstalled
   */
  abstract uninstall(): void;

  /**
   * Get plugin configuration
   */
  getOptions(): PluginOptions {
    return this.options;
  }

  /**
   * Update plugin configuration
   */
  setOptions(options: Partial<PluginOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
