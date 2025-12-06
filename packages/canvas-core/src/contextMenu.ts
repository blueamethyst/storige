//import '@/styles/contextMenu.css';
import ContextMenuItem from './models/ContextMenuItem'

class ContextMenu {
  container: HTMLElement
  readonly canvas: fabric.Canvas
  readonly menus: ContextMenuItem[]
  dom: HTMLDivElement | null = null
  parent: ContextMenu | null = null
  submenus: ContextMenu[] = []

  // flags
  shown: boolean = false

  constructor(canvas: fabric.Canvas, items: ContextMenuItem[] = []) {
    this.canvas = canvas
    this.container = canvas.wrapperEl
    this.menus = items

    this.addListeners()
  }

  hideAll() {
    if (this.dom && !this.parent) {
      if (this.shown) {
        this.hideSubMenus()

        this.shown = false
        const prev = document.getElementById('context-menu')
        if (prev && this.container.contains(prev)) {
          this.container.removeChild(prev)
        }
      }
      return
    }

    this.parent?.hide()
  }

  hide() {
    if (this.dom && this.shown) {
      this.shown = false
      this.hideSubMenus()

      const prev = document.getElementById('context-menu')
      if (prev && this.container.contains(prev)) {
        this.container.removeChild(prev)
      }

      if (this.parent && this.parent.shown) {
        this.parent.hide()
      }
    }
  }

  hideSubMenus() {
    for (const menu of this.submenus) {
      if (menu.shown) {
        menu.shown = false
        if (menu.dom && menu.container.contains(menu.dom)) {
          menu.container.removeChild(menu.dom)
        }
      }
      menu.hideSubMenus()
    }
  }

  addMenu(data: ContextMenuItem) {
    this.menus.push(data)
  }

  setMenus() {
    const hasActiveObject =
      this.canvas.getActiveObject() !== null && this.canvas.getActiveObject() !== undefined
    const available = this.menus.filter(
      (menu) =>
        (menu.hideContext instanceof Function ? !menu.hideContext() : !menu.hideContext) &&
        (menu.onlyForActiveObject ? hasActiveObject : true)
    )
    if (available.length === 0) {
      console.log('no available context menu')
      return
    }

    this.dom = this.getContextMenuDom(available)
  }

  addListeners() {
    this.container.addEventListener('contextmenu', this.onContextmenu)
    this.container.addEventListener('keydown', this.onContextmenuByHotkey)
    this.container.addEventListener('mousedown', this.onClick)
    this.container.addEventListener('blur', this.onBlur)
  }

  dispose() {
    this.dom = null
    this.container.removeEventListener('contextmenu', this.onContextmenu)
    this.container.removeEventListener('keydown', this.onContextmenuByHotkey)
    this.container.removeEventListener('mousedown', this.onClick)
    this.container.removeEventListener('blur', this.onBlur)
  }

  private show(x: number, y: number) {
    this.setMenus()

    // dom이 없으면 (available 메뉴가 없는 경우) 종료
    if (!this.dom) return

    this.dom.style.left = `${x}px`
    this.dom.style.top = `${y}px`

    this.shown = true
    this.container.appendChild(this.dom)
  }

  /// 이벤트 관련 메소드
  private onClick = (e: MouseEvent) => {
    if (!e.target) return

    const target = e.target as HTMLElement
    // 클릭한 대상이 메뉴가 아니면 숨김
    if (
      target != this.dom &&
      target.parentElement != this.dom &&
      !target.classList.contains('item') &&
      !target.parentElement?.classList.contains('item')
    ) {
      this.hideAll()

      if (e.button === 2) {
        this.show(e.clientX, e.clientY)
      }
    }
  }

  private onContextmenu = (e: MouseEvent) => {
    if (!this.dom || !e.target) return

    const target = e.target as HTMLElement

    if (
      target != this.dom &&
      target.parentElement != this.dom &&
      !target.classList.contains('item') &&
      !target.parentElement?.classList.contains('item')
    ) {
      this.hideAll()
      this.show(e.clientX, e.clientY)
    }
  }

  private onContextmenuByHotkey = (e: KeyboardEvent) => {
    if (e.key !== 'ContextMenu') return

    this.hideAll()
    /// 중앙에 표시
    const clientX = window.innerWidth / 2
    const clientY = window.innerHeight / 2
    this.show(clientX, clientY)
  }

  private onBlur = () => {
    console.log('hide all')
    this.hideAll()
  }

  private getContextMenuDom(menus: ContextMenuItem[]): HTMLDivElement {
    const prev = document.getElementById('context-menu')
    if (prev && this.container.contains(prev)) {
      this.container.removeChild(prev)
    }

    const wrapper = document.createElement('div')
    wrapper.classList.add('context')
    wrapper.id = 'context-menu'

    for (const menu of menus) {
      wrapper.appendChild(this.getContextItemDom(menu))
    }

    return wrapper
  }

  private getContextItemDom(data: ContextMenuItem | null) {
    const item = document.createElement('div')

    if (data === null) {
      item.classList.add('separator')
      return item
    } else {
      item.classList.add('item')
    }

    const label = document.createElement('span')
    label.classList.add('label')
    label.innerText = data.name?.toString() ?? ''
    item.appendChild(label)

    if (data.color) {
      item.style.cssText = `color: ${data.color}`
    }

    if (data.disabled === true) {
      item.classList.add('disabled')
    }

    const hotkey = document.createElement('span')
    hotkey.classList.add('hotkey')
    hotkey.innerText = data.input.toString()
    item.appendChild(hotkey)

    // 하위 메뉴가 있을경우
    if (data.children && data.children!.length > 0) {
      const menu = new ContextMenu(this.canvas, data.children ?? [])
      menu.parent = this

      const openContext = () => {
        if (this.dom === null) return
        if (data.disabled === true) return

        this.hideSubMenus()

        const x = this.dom.offsetLeft + this.dom.clientWidth + item.offsetLeft
        const y = this.dom.offsetTop + item.offsetTop

        if (!menu.shown) {
          menu.show(x, y)
        } else {
          menu.hide()
        }
      }

      this.submenus.push(menu)

      item.classList.add('has-submenu')
      item.addEventListener('click', openContext)
      item.addEventListener('mousemove', openContext)
    } else {
      item.addEventListener('click', () => {
        this.hideSubMenus()

        if (item.classList.contains('disabled')) return

        // call onClick
        data.callback()

        this.hideAll()
      })

      item.addEventListener('mousemove', () => {
        this.hideSubMenus()
      })
    }

    return item
  }
}

export default ContextMenu
