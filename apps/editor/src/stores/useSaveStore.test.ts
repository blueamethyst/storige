import { describe, it, expect, beforeEach } from 'vitest';
import { useSaveStore, getSaveStatusText, getSaveStatusColor, type SaveStatus } from './useSaveStore';

describe('useSaveStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useSaveStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSaveStore.getState();

      expect(state.status).toBe('saved');
      expect(state.lastSavedAt).toBeNull();
      expect(state.lastModifiedAt).toBeNull();
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
      expect(state.maxRetries).toBe(3);
      expect(state.isOnline).toBe(true);
      expect(state.autoSaveEnabled).toBe(true);
      expect(state.autoSaveInterval).toBe(30000);
      expect(state.isDirty).toBe(false);
      expect(state.hasLocalBackup).toBe(false);
      expect(state.localBackupAt).toBeNull();
    });
  });

  describe('saving state management', () => {
    it('setSaving should update status', () => {
      useSaveStore.getState().setSaving();

      expect(useSaveStore.getState().status).toBe('saving');
      expect(useSaveStore.getState().error).toBeNull();
    });

    it('setSaved should update status and timestamps', () => {
      useSaveStore.getState().markDirty();
      useSaveStore.getState().setSaved();
      const state = useSaveStore.getState();

      expect(state.status).toBe('saved');
      expect(state.lastSavedAt).toBeInstanceOf(Date);
      expect(state.isDirty).toBe(false);
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
    });

    it('setFailed should update status and error', () => {
      const errorMessage = 'Network error';
      useSaveStore.getState().setFailed(errorMessage);
      const state = useSaveStore.getState();

      expect(state.status).toBe('failed');
      expect(state.error).toBe(errorMessage);
    });

    it('setUnsaved should update status and mark dirty', () => {
      useSaveStore.getState().setUnsaved();
      const state = useSaveStore.getState();

      expect(state.status).toBe('unsaved');
      expect(state.lastModifiedAt).toBeInstanceOf(Date);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('dirty state', () => {
    it('markDirty should set isDirty and status', () => {
      useSaveStore.getState().markDirty();
      const state = useSaveStore.getState();

      expect(state.isDirty).toBe(true);
      expect(state.lastModifiedAt).toBeInstanceOf(Date);
      expect(state.status).toBe('unsaved');
    });

    it('markClean should clear isDirty', () => {
      useSaveStore.getState().markDirty();
      useSaveStore.getState().markClean();

      expect(useSaveStore.getState().isDirty).toBe(false);
    });
  });

  describe('network state', () => {
    it('setOnline true should update isOnline', () => {
      useSaveStore.getState().setOnline(false);
      useSaveStore.getState().setOnline(true);

      expect(useSaveStore.getState().isOnline).toBe(true);
    });

    it('setOnline false should set offline status', () => {
      useSaveStore.getState().setOnline(false);
      const state = useSaveStore.getState();

      expect(state.isOnline).toBe(false);
      expect(state.status).toBe('offline');
    });
  });

  describe('auto save settings', () => {
    it('setAutoSaveEnabled should update setting', () => {
      useSaveStore.getState().setAutoSaveEnabled(false);

      expect(useSaveStore.getState().autoSaveEnabled).toBe(false);
    });

    it('setAutoSaveInterval should update setting', () => {
      useSaveStore.getState().setAutoSaveInterval(60000);

      expect(useSaveStore.getState().autoSaveInterval).toBe(60000);
    });
  });

  describe('retry logic', () => {
    it('incrementRetry should increase retry count', () => {
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().incrementRetry();

      expect(useSaveStore.getState().retryCount).toBe(2);
    });

    it('resetRetry should reset retry count', () => {
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().resetRetry();

      expect(useSaveStore.getState().retryCount).toBe(0);
    });

    it('canRetry should return true when retries available', () => {
      expect(useSaveStore.getState().canRetry()).toBe(true);

      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().incrementRetry();
      expect(useSaveStore.getState().canRetry()).toBe(true);
    });

    it('canRetry should return false when max retries reached', () => {
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().incrementRetry();

      expect(useSaveStore.getState().canRetry()).toBe(false);
    });
  });

  describe('local backup', () => {
    it('setLocalBackup should update backup state', () => {
      const backupDate = new Date();
      useSaveStore.getState().setLocalBackup(true, backupDate);
      const state = useSaveStore.getState();

      expect(state.hasLocalBackup).toBe(true);
      expect(state.localBackupAt).toBe(backupDate);
    });

    it('setLocalBackup with no date should use current date', () => {
      useSaveStore.getState().setLocalBackup(true);
      const state = useSaveStore.getState();

      expect(state.hasLocalBackup).toBe(true);
      expect(state.localBackupAt).toBeInstanceOf(Date);
    });

    it('clearLocalBackup should reset backup state', () => {
      useSaveStore.getState().setLocalBackup(true);
      useSaveStore.getState().clearLocalBackup();
      const state = useSaveStore.getState();

      expect(state.hasLocalBackup).toBe(false);
      expect(state.localBackupAt).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Modify various state
      useSaveStore.getState().setFailed('Error');
      useSaveStore.getState().markDirty();
      useSaveStore.getState().incrementRetry();
      useSaveStore.getState().setLocalBackup(true);
      useSaveStore.getState().setOnline(false);

      // Reset
      useSaveStore.getState().reset();
      const state = useSaveStore.getState();

      expect(state.status).toBe('saved');
      expect(state.error).toBeNull();
      expect(state.isDirty).toBe(false);
      expect(state.retryCount).toBe(0);
      expect(state.hasLocalBackup).toBe(false);
      expect(state.isOnline).toBe(true);
    });
  });
});

describe('getSaveStatusText', () => {
  it('should return correct text for each status', () => {
    const testCases: Array<{ status: SaveStatus; expected: string }> = [
      { status: 'saved', expected: '저장됨' },
      { status: 'saving', expected: '저장 중...' },
      { status: 'failed', expected: '저장 실패' },
      { status: 'unsaved', expected: '저장되지 않음' },
      { status: 'offline', expected: '오프라인' },
    ];

    testCases.forEach(({ status, expected }) => {
      expect(getSaveStatusText(status)).toBe(expected);
    });
  });
});

describe('getSaveStatusColor', () => {
  it('should return correct color class for each status', () => {
    const testCases: Array<{ status: SaveStatus; expected: string }> = [
      { status: 'saved', expected: 'text-green-600' },
      { status: 'saving', expected: 'text-blue-600' },
      { status: 'failed', expected: 'text-red-600' },
      { status: 'unsaved', expected: 'text-yellow-600' },
      { status: 'offline', expected: 'text-gray-600' },
    ];

    testCases.forEach(({ status, expected }) => {
      expect(getSaveStatusColor(status)).toBe(expected);
    });
  });
});
