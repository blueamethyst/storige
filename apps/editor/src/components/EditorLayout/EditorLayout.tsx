import { useState } from 'react';
import { Toolbar } from '../Toolbar';
import { Canvas } from '../Canvas';
import { Sidebar } from '../Sidebar';
import { TemplateSelector } from '../TemplateSelector';
import { useAutoSave } from '../../hooks/useAutoSave';

export const EditorLayout = () => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Auto-save functionality
  useAutoSave();

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <Toolbar onOpenTemplates={() => setShowTemplateSelector(true)} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 overflow-auto">
          <Canvas width={800} height={600} />
        </div>

        {/* Sidebar */}
        <Sidebar />
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector onClose={() => setShowTemplateSelector(false)} />
      )}
    </div>
  );
};
