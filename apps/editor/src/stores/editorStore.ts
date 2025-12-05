import { create } from 'zustand';
import { Editor } from '@storige/canvas-core';
import type { CanvasData } from '@storige/types';

export type Tool = 'select' | 'text' | 'image' | 'rectangle' | 'circle' | 'triangle' | 'line';

interface EditorState {
  // Editor instance
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Current tool
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;

  // Selected object
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;

  // History state
  canUndo: boolean;
  canRedo: boolean;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;

  // Template data
  templateData: CanvasData | null;
  setTemplateData: (data: CanvasData | null) => void;

  // Session ID (for auto-save)
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),

  currentTool: 'select',
  setCurrentTool: (tool) => set({ currentTool: tool }),

  selectedObjectId: null,
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  canUndo: false,
  canRedo: false,
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),

  templateData: null,
  setTemplateData: (data) => set({ templateData: data }),

  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
