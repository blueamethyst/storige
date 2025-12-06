import CanvasHotkey from "./CanvasHotkey";

export default interface ContextMenuItem extends CanvasHotkey {
  // name
  name: string;
  // key name
  input: string;
  // callback
  callback: () => void;
  // sub hotkeys
  children?: ContextMenuItem[];
  // label color
  color?: string;
  disabled?: boolean;
}

type OnMenuActivated = (menu: ContextFunctionParams) => void;

export interface ContextFunctionParams {
  handled: boolean;
  item: HTMLElement;
  label: HTMLSpanElement;
  hotkey: HTMLSpanElement;
  menus: (ContextMenuItem | null)[];
  data: ContextMenuItem;
}
