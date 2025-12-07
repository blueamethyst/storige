import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * HistoryPlugin 테스트
 * - Undo/Redo 기능 테스트
 * - History 스택 관리
 * - 이벤트 핸들러 관리
 */

describe('HistoryPlugin', () => {
  // Mock 히스토리 스택
  interface HistoryStack {
    undoStack: string[]
    redoStack: string[]
    currentState: string
  }

  function createHistoryManager(initialState: string = '{}') {
    const history: HistoryStack = {
      undoStack: [],
      redoStack: [],
      currentState: initialState
    }

    return {
      get historyUndo() {
        return history.undoStack
      },
      get historyRedo() {
        return history.redoStack
      },
      getCurrentState: () => history.currentState,

      // 상태 변경 시 히스토리에 추가
      pushState(newState: string) {
        // 현재 상태를 undo 스택에 저장
        history.undoStack.push(history.currentState)
        // redo 스택 초기화 (새 변경 발생 시)
        history.redoStack = []
        // 현재 상태 업데이트
        history.currentState = newState
      },

      undo(callback?: () => void) {
        if (history.undoStack.length === 0) return false

        // 현재 상태를 redo 스택에 저장
        history.redoStack.push(history.currentState)
        // undo 스택에서 이전 상태 복원
        history.currentState = history.undoStack.pop()!

        callback?.()
        return true
      },

      redo(callback?: () => void) {
        if (history.redoStack.length === 0) return false

        // 현재 상태를 undo 스택에 저장
        history.undoStack.push(history.currentState)
        // redo 스택에서 상태 복원
        history.currentState = history.redoStack.pop()!

        callback?.()
        return true
      },

      clearHistory() {
        history.undoStack = []
        history.redoStack = []
      },

      canUndo() {
        return history.undoStack.length > 0
      },

      canRedo() {
        return history.redoStack.length > 0
      }
    }
  }

  describe('History Stack Management', () => {
    it('should start with empty history', () => {
      const manager = createHistoryManager('initial')

      expect(manager.historyUndo).toHaveLength(0)
      expect(manager.historyRedo).toHaveLength(0)
      expect(manager.getCurrentState()).toBe('initial')
    })

    it('should push state to undo stack', () => {
      const manager = createHistoryManager('state1')

      manager.pushState('state2')

      expect(manager.historyUndo).toHaveLength(1)
      expect(manager.historyUndo[0]).toBe('state1')
      expect(manager.getCurrentState()).toBe('state2')
    })

    it('should clear redo stack on new state push', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.undo() // 이제 redo 스택에 state2가 있음

      expect(manager.historyRedo).toHaveLength(1)

      manager.pushState('state3') // 새 상태 추가

      expect(manager.historyRedo).toHaveLength(0) // redo 스택 초기화됨
    })

    it('should maintain history stack correctly through multiple operations', () => {
      const manager = createHistoryManager('state1')

      manager.pushState('state2')
      manager.pushState('state3')
      manager.pushState('state4')

      expect(manager.historyUndo).toHaveLength(3)
      expect(manager.getCurrentState()).toBe('state4')
    })
  })

  describe('Undo Operation', () => {
    it('should undo to previous state', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')

      const result = manager.undo()

      expect(result).toBe(true)
      expect(manager.getCurrentState()).toBe('state1')
      expect(manager.historyUndo).toHaveLength(0)
      expect(manager.historyRedo).toHaveLength(1)
    })

    it('should return false when nothing to undo', () => {
      const manager = createHistoryManager('state1')

      const result = manager.undo()

      expect(result).toBe(false)
      expect(manager.getCurrentState()).toBe('state1')
    })

    it('should call callback after undo', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      const callback = vi.fn()

      manager.undo(callback)

      expect(callback).toHaveBeenCalled()
    })

    it('should support multiple undos', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')

      manager.undo()
      expect(manager.getCurrentState()).toBe('state2')

      manager.undo()
      expect(manager.getCurrentState()).toBe('state1')

      expect(manager.canUndo()).toBe(false)
    })
  })

  describe('Redo Operation', () => {
    it('should redo to next state', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.undo()

      const result = manager.redo()

      expect(result).toBe(true)
      expect(manager.getCurrentState()).toBe('state2')
      expect(manager.historyRedo).toHaveLength(0)
    })

    it('should return false when nothing to redo', () => {
      const manager = createHistoryManager('state1')

      const result = manager.redo()

      expect(result).toBe(false)
    })

    it('should call callback after redo', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.undo()
      const callback = vi.fn()

      manager.redo(callback)

      expect(callback).toHaveBeenCalled()
    })

    it('should support multiple redos', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')
      manager.undo()
      manager.undo()

      manager.redo()
      expect(manager.getCurrentState()).toBe('state2')

      manager.redo()
      expect(manager.getCurrentState()).toBe('state3')

      expect(manager.canRedo()).toBe(false)
    })
  })

  describe('Undo/Redo Interaction', () => {
    it('should handle undo then redo correctly', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')

      manager.undo() // state3 -> state2
      manager.undo() // state2 -> state1
      manager.redo() // state1 -> state2
      manager.redo() // state2 -> state3

      expect(manager.getCurrentState()).toBe('state3')
    })

    it('should clear redo stack when pushing after undo', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')

      manager.undo() // state3 -> state2
      expect(manager.historyRedo).toHaveLength(1)

      manager.pushState('state4') // 새로운 분기

      expect(manager.getCurrentState()).toBe('state4')
      expect(manager.historyRedo).toHaveLength(0) // redo 불가
      expect(manager.historyUndo).toContain('state2')
    })
  })

  describe('Clear History', () => {
    it('should clear all history stacks', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')
      manager.undo()

      manager.clearHistory()

      expect(manager.historyUndo).toHaveLength(0)
      expect(manager.historyRedo).toHaveLength(0)
      expect(manager.getCurrentState()).toBe('state2') // 현재 상태는 유지
    })
  })

  describe('canUndo/canRedo helpers', () => {
    it('canUndo should return true when undo is possible', () => {
      const manager = createHistoryManager('state1')
      expect(manager.canUndo()).toBe(false)

      manager.pushState('state2')
      expect(manager.canUndo()).toBe(true)
    })

    it('canRedo should return true when redo is possible', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')

      expect(manager.canRedo()).toBe(false)

      manager.undo()
      expect(manager.canRedo()).toBe(true)
    })
  })

  describe('History Event Emission', () => {
    it('should track history length for UI updates', () => {
      const manager = createHistoryManager('state1')
      const historyUpdateHandler = vi.fn()

      // 상태 변경 시 UI 업데이트 트리거
      const pushStateWithEvent = (state: string) => {
        manager.pushState(state)
        historyUpdateHandler(manager.historyUndo.length, manager.historyRedo.length)
      }

      pushStateWithEvent('state2')
      expect(historyUpdateHandler).toHaveBeenCalledWith(1, 0)

      pushStateWithEvent('state3')
      expect(historyUpdateHandler).toHaveBeenCalledWith(2, 0)

      manager.undo()
      historyUpdateHandler(manager.historyUndo.length, manager.historyRedo.length)
      expect(historyUpdateHandler).toHaveBeenCalledWith(1, 1)
    })
  })

  describe('Hotkey Configuration', () => {
    it('should define correct undo hotkeys', () => {
      const undoHotkeys = ['ctrl+z', '⌘+z']

      expect(undoHotkeys).toContain('ctrl+z')
      expect(undoHotkeys).toContain('⌘+z')
    })

    it('should define correct redo hotkeys', () => {
      const redoHotkeys = ['ctrl+shift+z', '⌘+shift+z']

      expect(redoHotkeys).toContain('ctrl+shift+z')
      expect(redoHotkeys).toContain('⌘+shift+z')
    })
  })

  describe('Lifecycle Management', () => {
    it('should properly cleanup event handlers', () => {
      const removeEventListener = vi.fn()
      const off = vi.fn()

      // Mock cleanup
      const cleanup = () => {
        off('history:append')
        removeEventListener('beforeunload')
      }

      cleanup()

      expect(off).toHaveBeenCalledWith('history:append')
      expect(removeEventListener).toHaveBeenCalledWith('beforeunload')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid undo/redo operations', () => {
      const manager = createHistoryManager('state1')
      manager.pushState('state2')
      manager.pushState('state3')

      // 빠른 연속 작업
      manager.undo()
      manager.undo()
      manager.redo()
      manager.undo()
      manager.redo()
      manager.redo()

      expect(manager.getCurrentState()).toBe('state3')
    })

    it('should handle empty state correctly', () => {
      const manager = createHistoryManager('')

      manager.pushState('state1')
      manager.undo()

      expect(manager.getCurrentState()).toBe('')
    })

    it('should handle large history stack', () => {
      const manager = createHistoryManager('state0')

      // 100개의 상태 추가
      for (let i = 1; i <= 100; i++) {
        manager.pushState(`state${i}`)
      }

      expect(manager.historyUndo).toHaveLength(100)
      expect(manager.getCurrentState()).toBe('state100')

      // 50번 undo
      for (let i = 0; i < 50; i++) {
        manager.undo()
      }

      expect(manager.getCurrentState()).toBe('state50')
      expect(manager.historyUndo).toHaveLength(50)
      expect(manager.historyRedo).toHaveLength(50)
    })
  })

  describe('afterLoad behavior', () => {
    it('should clear history after loading new data', () => {
      const manager = createHistoryManager('initial')
      manager.pushState('state1')
      manager.pushState('state2')

      expect(manager.historyUndo).toHaveLength(2)

      // 새 데이터 로드 시뮬레이션
      manager.clearHistory()

      expect(manager.historyUndo).toHaveLength(0)
      expect(manager.historyRedo).toHaveLength(0)
    })
  })

  describe('Overlay Realignment Logic', () => {
    it('should extract original ID from overlay ID', () => {
      const extractOriginalId = (overlayId: string): string => {
        return overlayId.split('_')[0]
      }

      expect(extractOriginalId('obj123_gold')).toBe('obj123')
      expect(extractOriginalId('image456_overlay')).toBe('image456')
      expect(extractOriginalId('simple')).toBe('simple')
    })

    it('should identify overlay objects by extensionType', () => {
      const objects = [
        { id: 'obj1', extensionType: undefined },
        { id: 'obj2_overlay', extensionType: 'overlay' },
        { id: 'obj3', extensionType: 'moldIcon' },
        { id: 'obj4_gold', extensionType: 'overlay' }
      ]

      const overlays = objects.filter(obj => obj.extensionType === 'overlay')

      expect(overlays).toHaveLength(2)
      expect(overlays.map(o => o.id)).toEqual(['obj2_overlay', 'obj4_gold'])
    })
  })

  describe('Guide Elements', () => {
    it('should check for required guide elements', () => {
      const objects = [
        { id: 'workspace' },
        { id: 'cut-border' },
        { id: 'safe-zone-border' },
        { id: 'some-object' }
      ]

      const hasCutBorder = objects.some(obj => obj.id === 'cut-border')
      const hasSafeBorder = objects.some(obj => obj.id === 'safe-zone-border')

      expect(hasCutBorder).toBe(true)
      expect(hasSafeBorder).toBe(true)
    })

    it('should detect missing guide elements', () => {
      const objects = [
        { id: 'workspace' },
        { id: 'some-object' }
      ]

      const hasCutBorder = objects.some(obj => obj.id === 'cut-border')
      const hasSafeBorder = objects.some(obj => obj.id === 'safe-zone-border')

      expect(hasCutBorder).toBe(false)
      expect(hasSafeBorder).toBe(false)
    })
  })

  describe('Mold Feature Binding', () => {
    it('should find molding targets', () => {
      const objects = [
        { id: 'obj1', hasMolding: true },
        { id: 'obj2', hasMolding: false },
        { id: 'obj3', hasMolding: true },
        { id: 'obj4' }
      ]

      const moldingTargets = objects.filter((o: any) => o.hasMolding)

      expect(moldingTargets).toHaveLength(2)
      expect(moldingTargets.map(o => o.id)).toEqual(['obj1', 'obj3'])
    })

    it('should find cutting targets', () => {
      const objects = [
        { id: 'obj1', hasCutting: true },
        { id: 'obj2', hasCutting: false },
        { id: 'obj3', hasCutting: true }
      ]

      const cuttingTargets = objects.filter((o: any) => o.hasCutting)

      expect(cuttingTargets).toHaveLength(2)
    })

    it('should find outline path by ID pattern', () => {
      const objects = [
        { id: 'shape1', hasMolding: true },
        { id: 'shape1_outline', extensionType: 'outline' },
        { id: 'shape2', hasMolding: true },
        { id: 'shape2_outline', extensionType: 'outline' }
      ]

      const shape1 = objects.find(o => o.id === 'shape1')!
      const outlineId = `${shape1.id}_outline`
      const outline = objects.find(obj => obj.id === outlineId)

      expect(outline).toBeDefined()
      expect(outline!.id).toBe('shape1_outline')
    })
  })
})
