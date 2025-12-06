export async function getEyeDropColor(): Promise<string | null> {
  if (!('EyeDropper' in window)) {
    console.warn('EyeDropper API not supported')
    return null
  }

  try {
    // @ts-ignore
    const eyeDropper = new EyeDropper()
    const { sRGBHex } = await eyeDropper.open()
    
    return sRGBHex
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('EyeDropper error:', error)
    }
    return null
  }
}