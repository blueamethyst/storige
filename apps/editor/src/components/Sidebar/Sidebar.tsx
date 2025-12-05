import { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { TextPlugin, ShapePlugin, SelectionPlugin } from '@storige/canvas-core';
import { FabricObject } from 'fabric';

export const Sidebar = () => {
  const { editor, isSidebarOpen } = useEditorStore();
  const [activeObject, setActiveObject] = useState<FabricObject | null>(null);
  const [objectType, setObjectType] = useState<string>('');

  // Properties
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fillColor, setFillColor] = useState('#000000');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const selectionPlugin = editor.getPlugin('selection') as SelectionPlugin;
      const obj = selectionPlugin?.getActiveObject();

      setActiveObject(obj);
      setObjectType(obj?.type || '');

      if (obj) {
        // Update properties from object
        setFillColor((obj.fill as string) || '#000000');
        setStrokeColor((obj.stroke as string) || '#000000');
        setStrokeWidth(obj.strokeWidth || 1);
        setOpacity(obj.opacity || 1);

        if (obj.type === 'textbox') {
          setFontSize((obj as any).fontSize || 24);
          setFontFamily((obj as any).fontFamily || 'Arial');
        }
      }
    };

    editor.canvas.on('selection:created', updateSelection);
    editor.canvas.on('selection:updated', updateSelection);
    editor.canvas.on('selection:cleared', () => {
      setActiveObject(null);
      setObjectType('');
    });

    return () => {
      editor.canvas.off('selection:created', updateSelection);
      editor.canvas.off('selection:updated', updateSelection);
      editor.canvas.off('selection:cleared');
    };
  }, [editor]);

  const handleFontSizeChange = (value: number) => {
    setFontSize(value);
    const textPlugin = editor?.getPlugin('text') as TextPlugin;
    textPlugin?.setFontSize(value);
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    const textPlugin = editor?.getPlugin('text') as TextPlugin;
    textPlugin?.setFontFamily(value);
  };

  const handleFillColorChange = (value: string) => {
    setFillColor(value);
    if (objectType === 'textbox') {
      const textPlugin = editor?.getPlugin('text') as TextPlugin;
      textPlugin?.setTextColor(value);
    } else {
      const shapePlugin = editor?.getPlugin('shape') as ShapePlugin;
      shapePlugin?.setFillColor(value);
    }
  };

  const handleStrokeColorChange = (value: string) => {
    setStrokeColor(value);
    const shapePlugin = editor?.getPlugin('shape') as ShapePlugin;
    shapePlugin?.setStrokeColor(value);
  };

  const handleStrokeWidthChange = (value: number) => {
    setStrokeWidth(value);
    const shapePlugin = editor?.getPlugin('shape') as ShapePlugin;
    shapePlugin?.setStrokeWidth(value);
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    const shapePlugin = editor?.getPlugin('shape') as ShapePlugin;
    shapePlugin?.setOpacity(value);
  };

  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const selectionPlugin = editor?.getPlugin('selection') as SelectionPlugin;
    selectionPlugin?.align(alignment);
  };

  if (!isSidebarOpen) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">속성</h2>

      {!activeObject ? (
        <p className="text-gray-500 text-sm">객체를 선택해주세요</p>
      ) : (
        <div className="space-y-6">
          {/* Object Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              객체 타입
            </label>
            <p className="text-sm text-gray-600 capitalize">{objectType}</p>
          </div>

          {/* Text Properties */}
          {objectType === 'textbox' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  폰트 크기
                </label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="8"
                  max="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  폰트
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontFamilyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>
            </>
          )}

          {/* Fill Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {objectType === 'textbox' ? '텍스트 색상' : '채우기 색상'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => handleFillColorChange(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => handleFillColorChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          {/* Stroke Color (for shapes) */}
          {objectType !== 'textbox' && objectType !== 'image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  테두리 색상
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  테두리 두께
                </label>
                <input
                  type="number"
                  value={strokeWidth}
                  onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  min="0"
                  max="50"
                />
              </div>
            </>
          )}

          {/* Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              투명도: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full"
              min="0"
              max="1"
              step="0.1"
            />
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정렬
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAlign('left')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                왼쪽
              </button>
              <button
                onClick={() => handleAlign('center')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                중앙
              </button>
              <button
                onClick={() => handleAlign('right')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                오른쪽
              </button>
              <button
                onClick={() => handleAlign('top')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                위
              </button>
              <button
                onClick={() => handleAlign('middle')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                가운데
              </button>
              <button
                onClick={() => handleAlign('bottom')}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                아래
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
