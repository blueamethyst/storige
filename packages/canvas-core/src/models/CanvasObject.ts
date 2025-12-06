import { SelectionType } from './SelectionType'

export interface CanvasObject {
  id: string
  type: SelectionType
  visible: boolean
  locked: boolean
  selected: boolean
  editable?: boolean
  name?: string
  displayOrder: number
}
