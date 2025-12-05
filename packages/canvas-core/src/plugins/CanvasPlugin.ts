import type { PluginContext } from '../types';

/**
 * Base plugin class for extending canvas functionality
 */
export abstract class CanvasPlugin {
  protected context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * Initialize the plugin
   */
  abstract init(): void;

  /**
   * Clean up plugin resources
   */
  abstract destroy(): void;
}
