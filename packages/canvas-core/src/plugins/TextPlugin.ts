import { Textbox } from 'fabric';
import { Plugin, PluginContext, PluginOptions } from '../core/Plugin';

export interface TextPluginOptions extends PluginOptions {
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultFill?: string;
}

export class TextPlugin extends Plugin {
  constructor(context: PluginContext, options: TextPluginOptions = {}) {
    super('text', context, {
      defaultFontFamily: 'Arial',
      defaultFontSize: 24,
      defaultFill: '#000000',
      ...options,
    });
  }

  install(): void {
    // Plugin is installed, methods can be called
  }

  uninstall(): void {
    // Cleanup if needed
  }

  /**
   * Add a text object to the canvas
   */
  addText(text: string, options?: Partial<any>): Textbox {
    const textbox = new Textbox(text, {
      fontFamily: this.options.defaultFontFamily,
      fontSize: this.options.defaultFontSize,
      fill: this.options.defaultFill,
      left: 100,
      top: 100,
      width: 200,
      ...options,
    });

    this.canvas.add(textbox);
    this.canvas.setActiveObject(textbox);
    this.canvas.renderAll();

    return textbox;
  }

  /**
   * Update text content of selected object
   */
  updateText(text: string): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    (activeObject as Textbox).set('text', text);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Change font family of selected text
   */
  setFontFamily(fontFamily: string): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    (activeObject as Textbox).set('fontFamily', fontFamily);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Change font size of selected text
   */
  setFontSize(fontSize: number): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    (activeObject as Textbox).set('fontSize', fontSize);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Change text color
   */
  setTextColor(color: string): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    (activeObject as Textbox).set('fill', color);
    this.canvas.renderAll();
    return true;
  }

  /**
   * Toggle bold
   */
  toggleBold(): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    const textbox = activeObject as Textbox;
    const currentWeight = textbox.fontWeight;
    textbox.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
    this.canvas.renderAll();
    return true;
  }

  /**
   * Toggle italic
   */
  toggleItalic(): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    const textbox = activeObject as Textbox;
    const currentStyle = textbox.fontStyle;
    textbox.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
    this.canvas.renderAll();
    return true;
  }

  /**
   * Set text alignment
   */
  setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): boolean {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') {
      return false;
    }

    (activeObject as Textbox).set('textAlign', align);
    this.canvas.renderAll();
    return true;
  }
}
