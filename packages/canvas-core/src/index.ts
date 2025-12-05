/**
 * @storige/canvas-core
 * Canvas engine wrapper for Fabric.js
 */

// Core
export { Editor } from './Editor';
export type { EditorOptions, EditorInstance } from './types';

// Plugin System
export { Plugin } from './core/Plugin';
export type { PluginContext, PluginOptions } from './core/Plugin';

// Plugins
export { TextPlugin } from './plugins/TextPlugin';
export { ImagePlugin } from './plugins/ImagePlugin';
export { ShapePlugin } from './plugins/ShapePlugin';
export { SelectionPlugin } from './plugins/SelectionPlugin';

// Re-export useful Fabric types
export type { Canvas as FabricCanvas, FabricObject } from 'fabric';
