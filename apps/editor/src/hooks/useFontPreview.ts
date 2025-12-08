import { useCallback } from 'react'
import type { FontSource } from '@/utils/fonts'
import { getFontUrl } from '@/utils/fonts'

// Simple logger for font preview
const logger = {
  info: (message: string) => console.log(`[FontPreview] ${message}`),
  error: (message: string, error?: unknown) => console.error(`[FontPreview] ${message}`, error),
}

export const SAMPLE_TEXT = '가나다라'

// Global cache for loaded fonts
const loadedFonts = new Set<string>()
const loadingFonts = new Set<string>()
const errorFonts = new Set<string>()

// Check if font is loaded
export const isFontLoaded = (fontName: string): boolean => {
  return loadedFonts.has(fontName)
}

// Check if font is loading
export const isFontLoadingGlobal = (fontName: string): boolean => {
  return loadingFonts.has(fontName)
}

// Check if font has error
export const hasFontErrorGlobal = (fontName: string): boolean => {
  return errorFonts.has(fontName)
}

// Load a font
export const loadFont = async (font: FontSource): Promise<boolean> => {
  const fontName = font.name

  // Already loaded
  if (loadedFonts.has(fontName)) {
    return true
  }

  // Has error
  if (errorFonts.has(fontName)) {
    return false
  }

  // Already loading
  if (loadingFonts.has(fontName)) {
    // Wait for loading to complete
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (loadedFonts.has(fontName)) {
          resolve(true)
        } else if (errorFonts.has(fontName)) {
          resolve(false)
        } else if (loadingFonts.has(fontName)) {
          setTimeout(checkLoaded, 50)
        } else {
          resolve(false)
        }
      }
      checkLoaded()
    })
  }

  const fontUrl = getFontUrl(font.file)
  if (!fontUrl) {
    logger.error(`Failed to get URL for font: ${fontName}`)
    errorFonts.add(fontName)
    return false
  }

  loadingFonts.add(fontName)

  try {
    const fontFace = new FontFace(fontName, `url(${fontUrl})`)
    const loadedFont = await fontFace.load()
    document.fonts.add(loadedFont)
    loadedFonts.add(fontName)
    logger.info(`Font loaded: ${fontName}`)
    return true
  } catch (error) {
    logger.error(`Failed to load font: ${fontName}`, error)
    errorFonts.add(fontName)
    return false
  } finally {
    loadingFonts.delete(fontName)
  }
}

// Hook for font preview
export const useFontPreview = () => {
  const loadFontPreview = useCallback(async (font: FontSource): Promise<boolean> => {
    return loadFont(font)
  }, [])

  const isFontLoading = useCallback((fontName: string): boolean => {
    return loadingFonts.has(fontName)
  }, [])

  const hasFontError = useCallback((fontName: string): boolean => {
    return errorFonts.has(fontName)
  }, [])

  return {
    loadFontPreview,
    isFontLoading,
    hasFontError,
  }
}

export default useFontPreview
