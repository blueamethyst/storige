import { useEditorStore, Tool } from '../../stores/editorStore';
import {
  TextPlugin,
  ImagePlugin,
  ShapePlugin,
  SelectionPlugin,
} from '@storige/canvas-core';

interface ToolbarProps {
  onOpenTemplates?: () => void;
}

export const Toolbar = ({ onOpenTemplates }: ToolbarProps) => {
  const {
    editor,
    currentTool,
    setCurrentTool,
    canUndo,
    canRedo,
    toggleSidebar,
  } = useEditorStore();

  const handleToolClick = (tool: Tool) => {
    setCurrentTool(tool);

    if (!editor) return;

    // Execute tool-specific action
    switch (tool) {
      case 'text': {
        const textPlugin = editor.getPlugin('text') as TextPlugin;
        textPlugin?.addText('텍스트를 입력하세요');
        break;
      }
      case 'rectangle': {
        const shapePlugin = editor.getPlugin('shape') as ShapePlugin;
        shapePlugin?.addRectangle();
        break;
      }
      case 'circle': {
        const shapePlugin = editor.getPlugin('shape') as ShapePlugin;
        shapePlugin?.addCircle();
        break;
      }
      case 'triangle': {
        const shapePlugin = editor.getPlugin('shape') as ShapePlugin;
        shapePlugin?.addTriangle();
        break;
      }
      case 'line': {
        const shapePlugin = editor.getPlugin('shape') as ShapePlugin;
        shapePlugin?.addLine();
        break;
      }
    }
  };

  const handleUndo = () => {
    editor?.undo();
  };

  const handleRedo = () => {
    editor?.redo();
  };

  const handleDelete = () => {
    const selectionPlugin = editor?.getPlugin('selection') as SelectionPlugin;
    selectionPlugin?.deleteSelected();
  };

  const handleDuplicate = () => {
    const selectionPlugin = editor?.getPlugin('selection') as SelectionPlugin;
    selectionPlugin?.duplicateSelected();
  };

  const handleBringToFront = () => {
    const selectionPlugin = editor?.getPlugin('selection') as SelectionPlugin;
    selectionPlugin?.bringToFront();
  };

  const handleSendToBack = () => {
    const selectionPlugin = editor?.getPlugin('selection') as SelectionPlugin;
    selectionPlugin?.sendToBack();
  };

  const handleSave = () => {
    if (!editor) return;
    const json = editor.exportJSON();
    console.log('Saved:', json);
    // TODO: Call API to save
  };

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: '선택', icon: '↖️' },
    { id: 'text', label: '텍스트', icon: 'T' },
    { id: 'image', label: '이미지', icon: '🖼️' },
    { id: 'rectangle', label: '사각형', icon: '⬜' },
    { id: 'circle', label: '원', icon: '⭕' },
    { id: 'triangle', label: '삼각형', icon: '🔺' },
    { id: 'line', label: '선', icon: '📏' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Tools */}
        <div className="flex items-center gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                currentTool === tool.id ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title={tool.label}
            >
              <span className="text-xl">{tool.icon}</span>
            </button>
          ))}

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* History */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="실행 취소"
          >
            ↶
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="다시 실행"
          >
            ↷
          </button>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Object actions */}
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded hover:bg-gray-100"
            title="삭제"
          >
            🗑️
          </button>
          <button
            onClick={handleDuplicate}
            className="px-3 py-2 rounded hover:bg-gray-100"
            title="복제"
          >
            📋
          </button>
          <button
            onClick={handleBringToFront}
            className="px-3 py-2 rounded hover:bg-gray-100"
            title="맨 앞으로"
          >
            ⬆️
          </button>
          <button
            onClick={handleSendToBack}
            className="px-3 py-2 rounded hover:bg-gray-100"
            title="맨 뒤로"
          >
            ⬇️
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="px-4 py-2 rounded hover:bg-gray-100"
              title="템플릿 열기"
            >
              📁 템플릿
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className="px-3 py-2 rounded hover:bg-gray-100"
            title="속성 패널"
          >
            ⚙️
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
