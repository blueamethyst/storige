import { useEffect, useRef } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { editorApi } from '../api';

const AUTO_SAVE_INTERVAL = Number(import.meta.env.VITE_AUTO_SAVE_INTERVAL) || 30000; // 30 seconds

export const useAutoSave = () => {
  const { editor, sessionId, setSessionId } = useEditorStore();
  const lastSavedRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor) return;

    const autoSave = async () => {
      const currentData = JSON.stringify(editor.exportJSON());

      // Skip if no changes
      if (currentData === lastSavedRef.current) {
        return;
      }

      try {
        if (!sessionId) {
          // Create new session
          const session = await editorApi.createSession({
            canvasData: editor.exportJSON(),
          });
          setSessionId(session.id);
          console.log('[AutoSave] Session created:', session.id);
        } else {
          // Update existing session
          await editorApi.updateSession(sessionId, {
            canvasData: editor.exportJSON(),
            status: 'DRAFT',
          });
          console.log('[AutoSave] Session updated:', sessionId);
        }

        lastSavedRef.current = currentData;
      } catch (error) {
        console.error('[AutoSave] Failed to save:', error);
      }
    };

    // Initial save
    autoSave();

    // Set up interval
    intervalRef.current = setInterval(autoSave, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [editor, sessionId, setSessionId]);

  return {
    sessionId,
  };
};
