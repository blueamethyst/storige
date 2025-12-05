import type { Canvas as FabricCanvas } from 'fabric';
import type { CanvasData } from '@storige/types';
import type { Plugin } from './core/Plugin';

export interface EditorOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  maxHistorySize?: number;
}

export interface EditorInstance {
  canvas: FabricCanvas;

  // Plugin system
  use(plugin: Plugin): this;
  unuse(pluginName: string): this;
  getPlugin(name: string): Plugin | undefined;

  // Template management
  loadTemplate(data: CanvasData, saveToHistory?: boolean): void;
  exportJSON(): CanvasData;
  exportPDF(): Promise<Blob>;

  // History
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;

  // Lifecycle
  destroy(): void;
}
