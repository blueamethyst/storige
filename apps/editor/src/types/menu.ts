import type { Icon } from '@phosphor-icons/react'

export interface AppMenu {
  type: string
  label: string
  icon?: Icon
  onTap?: () => void
  component?: React.ComponentType
}
