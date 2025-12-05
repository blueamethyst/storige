import { useEffect, useRef } from 'react';
import {
  Editor,
  TextPlugin,
  ImagePlugin,
  ShapePlugin,
  SelectionPlugin,
} from '@storige/canvas-core';
import { useEditorStore } from '../../stores/editorStore';

interface CanvasProps {
  width?: number;
  height?: number;
}

export const Canvas = ({ width = 800, height = 600 }: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const { setEditor, setHistoryState, templateData } = useEditorStore();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor instance
    const editor = new Editor({
      container: containerRef.current,
      width,
      height,
      backgroundColor: '#ffffff',
      maxHistorySize: 50,
    });

    // Install plugins
    const textPlugin = new TextPlugin(editor.getPluginContext());
    const imagePlugin = new ImagePlugin(editor.getPluginContext());
    const shapePlugin = new ShapePlugin(editor.getPluginContext());
    const selectionPlugin = new SelectionPlugin(editor.getPluginContext());

    editor
      .use(textPlugin)
      .use(imagePlugin)
      .use(shapePlugin)
      .use(selectionPlugin);

    // Setup canvas event listeners
    editor.canvas.on('selection:created', () => updateHistoryState(editor));
    editor.canvas.on('selection:updated', () => updateHistoryState(editor));
    editor.canvas.on('selection:cleared', () => updateHistoryState(editor));
    editor.canvas.on('object:modified', () => updateHistoryState(editor));
    editor.canvas.on('object:added', () => updateHistoryState(editor));
    editor.canvas.on('object:removed', () => updateHistoryState(editor));

    editorRef.current = editor;
    setEditor(editor);

    // Initial history state
    updateHistoryState(editor);

    // Load template if exists
    if (templateData) {
      editor.loadTemplate(templateData);
    }

    // Cleanup
    return () => {
      editor.destroy();
      setEditor(null);
    };
  }, [width, height]); // Only recreate if dimensions change

  const updateHistoryState = (editor: Editor) => {
    setHistoryState(editor.canUndo(), editor.canRedo());
  };

  return (
    <div className="relative flex items-center justify-center bg-gray-100 p-8">
      <div
        ref={containerRef}
        className="shadow-lg"
        style={{
          width: width + 'px',
          height: height + 'px',
        }}
      />
    </div>
  );
};
