import { Canvas as FabricCanvas, util } from 'fabric';
import type { CanvasData } from '@storige/types';
import type { EditorOptions, EditorInstance } from './types';
import { Plugin, PluginContext } from './core/Plugin';
import { v4 as uuidv4 } from 'uuid';

export class Editor implements EditorInstance {
  public canvas: FabricCanvas;
  private container: HTMLElement;
  private plugins: Map<string, Plugin>;
  private history: CanvasData[];
  private historyIndex: number;
  private maxHistorySize: number;

  constructor(options: EditorOptions) {
    // Get container element
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)!
      : options.container;

    if (!this.container) {
      throw new Error('Container element not found');
    }

    // Create canvas element
    const canvasElement = document.createElement('canvas');
    this.container.appendChild(canvasElement);

    // Initialize Fabric canvas
    this.canvas = new FabricCanvas(canvasElement, {
      width: options.width || 800,
      height: options.height || 600,
      backgroundColor: options.backgroundColor || '#ffffff',
    });

    // Initialize plugins system
    this.plugins = new Map();

    // Initialize history
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = options.maxHistorySize || 50;

    // Save initial state
    this.saveHistory();

    // Setup event listeners for history
    this.setupHistoryListeners();
  }

  // ============================================================================
  // Plugin System
  // ============================================================================

  use(plugin: Plugin): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already installed`);
      return this;
    }

    plugin.install();
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  unuse(pluginName: string): this {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      console.warn(`Plugin ${pluginName} is not installed`);
      return this;
    }

    plugin.uninstall();
    this.plugins.delete(pluginName);
    return this;
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getPluginContext(): PluginContext {
    return {
      canvas: this.canvas,
      editor: this,
    };
  }

  // ============================================================================
  // History Management
  // ============================================================================

  private setupHistoryListeners(): void {
    // Listen to object modifications
    this.canvas.on('object:added', () => this.saveHistory());
    this.canvas.on('object:modified', () => this.saveHistory());
    this.canvas.on('object:removed', () => this.saveHistory());
  }

  private saveHistory(): void {
    // Remove any states after current index (when undoing then making changes)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new state
    this.history.push(this.exportJSON());
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo(): boolean {
    if (this.historyIndex <= 0) {
      return false;
    }

    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.loadTemplate(state, false); // false = don't save to history
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) {
      return false;
    }

    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.loadTemplate(state, false); // false = don't save to history
    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  clearHistory(): void {
    this.history = [this.exportJSON()];
    this.historyIndex = 0;
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  /**
   * Load template data into the canvas
   */
  loadTemplate(data: CanvasData, saveToHistory: boolean = true): void {
    this.canvas.clear();

    if (data.background) {
      this.canvas.setBackgroundColor(data.background as string, () => {
        this.canvas.renderAll();
      });
    }

    // Load objects using Fabric's built-in method
    if (data.objects && data.objects.length > 0) {
      util.enlivenObjects(data.objects as any[], {}).then((enlivenedObjects: any[]) => {
        enlivenedObjects.forEach((obj) => {
          this.canvas.add(obj);
        });
        this.canvas.renderAll();

        if (saveToHistory) {
          this.saveHistory();
        }
      });
    } else if (saveToHistory) {
      this.saveHistory();
    }
  }

  /**
   * Export canvas data as JSON
   */
  exportJSON(): CanvasData {
    const json = this.canvas.toJSON();

    return {
      version: '1.0.0',
      width: this.canvas.width || 800,
      height: this.canvas.height || 600,
      objects: json.objects || [],
      background: json.background,
    };
  }

  /**
   * Export canvas as PDF
   * TODO: Implement PDF export using jsPDF or backend API
   */
  async exportPDF(): Promise<Blob> {
    throw new Error('PDF export not yet implemented');
  }

  /**
   * Clean up and destroy the editor
   */
  destroy(): void {
    this.canvas.dispose();
    if (this.container && this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
