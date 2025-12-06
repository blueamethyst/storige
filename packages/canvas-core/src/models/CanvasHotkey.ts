export default interface CanvasHotkey {
  name: string
  input: string | string[]
  // callback
  callback: () => void
  onlyForActiveObject: boolean
  hideContext?: boolean | (() => boolean)
}
