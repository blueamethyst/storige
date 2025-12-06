import { EventEmitter } from 'events'
import hotkeys from 'hotkeys-js'
import { AsyncSeriesHook } from 'tapable'
import { fabric } from 'fabric'
import { Lifecycle, PluginBase } from './plugin'
import CanvasHotkey from './models/CanvasHotkey'
import ContextMenuItem from './models/ContextMenuItem'
import ContextMenu from './contextMenu'
import { isArray } from 'lodash-es'

class Editor extends EventEmitter {
  [key: string]: any

  public hooks: Map<keyof Lifecycle, AsyncSeriesHook<any, any>> = new Map()

  private contextMenu: ContextMenu | undefined

  private plugins: Map<string, PluginBase> = new Map()

  private canvas: fabric.Canvas | null = null
  private hooksInitialized: boolean = false

  constructor() {
    super()
    // 이벤트 이미터의 최대 리스너 수 증가
    this.setMaxListeners(30)
  }

  get customLifeCycles(): (keyof Lifecycle)[] {
    return ['mounted', 'destroyed', 'beforeLoad', 'afterLoad', 'beforeSave', 'afterSave']
  }

  getPlugin<T extends PluginBase>(pluginName: string): T | undefined {
    if (this.plugins.has(pluginName)) {
      return this.plugins.get(pluginName) as T
    } else {
      return undefined
    }
  }

  init(canvas: fabric.Canvas) {
    this.canvas = canvas
    this.initContextMenu(canvas)
    this.initActionHooks()

    this.once('ready', () => {})
  }

  use(plugin: PluginBase): void {
    if (!this.plugins.has(plugin.name) && this.canvas) {
      this.plugins.set(plugin.name, plugin)

      this.bindingHooks(plugin)
      this.bindingHotkeys(plugin)
      this.bindingContextItems(plugin)

      console.debug('plugin setup', plugin.name)

      // noinspection JSIgnoredPromiseFromCall
      plugin.mounted()
    }
  }

  dispose() {
    for (const pluginName in this.pluginMap) {
      const plugin = this.pluginMap[pluginName]
      plugin.dispose && plugin.dispose()
    }

    this.canvas = null
    this.plugins.clear()
    this.hooks.clear()
    //document.removeEventListener('mousedown', (opt) => this.showContexxtMenu(opt, this.contextMenu!));

    // 모든 이벤트 리스너 제거
    this.removeAllListeners()
  }

  private bindingHooks(plugin: PluginBase) {
    this.customLifeCycles.forEach((hookName) => {
      const hook = plugin[hookName]

      if (hook) {
        this.hooks.get(hookName)?.tapPromise(plugin.name + hookName, (...args) => {
          return hook.apply(plugin, args) as Promise<any>
        })
      }
    })
  }

  private bindingHotkeys(plugin: PluginBase) {
    plugin?.hotkeys?.forEach((hotkey: CanvasHotkey) => {
      const inputArray = Array.isArray(hotkey.input) ? hotkey.input : [hotkey.input]
      inputArray.forEach((input) => {
        hotkeys(input, { keyup: true }, (e) => {
          if (e.type === 'keydown') {
            if (hotkey.onlyForActiveObject) {
              const activeObject = this.canvas?.getActiveObject()
              if (!activeObject) return
            }

            // Prevent default browser behavior for hotkeys
            e.preventDefault()
            hotkey.callback()
          }
        })
      })
    })
  }

  private bindingContextItems(plugin: PluginBase) {
    plugin.hotkeys?.forEach((item: CanvasHotkey) => {
      const menu: ContextMenuItem = {
        ...item,
        input: isArray(item.input) ? item.input[0] : item.input
      }
      this.contextMenu?.addMenu(menu)
    })
  }

  private initContextMenu(canvas: fabric.Canvas) {
    this.contextMenu = new ContextMenu(canvas, [])
  }

  private initActionHooks() {
    // 이미 초기화되었는지 확인
    if (this.hooksInitialized) return
    this.customLifeCycles.forEach((hookName) => {
      this.hooks.set(hookName, new AsyncSeriesHook(['arg']))
    })

    this.hooksInitialized = true
  }
}

export default Editor
