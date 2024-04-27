import {
    Decoration,
    DecorationSet,
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
  } from "@codemirror/view";

import { Extension} from "@codemirror/state";
import { App} from 'obsidian';
import MrdocPlugin from "src/main";
import { processMrdocUrl } from "src/utils";

const livePreviewActive = (app: App): boolean => {
  return (app.vault as any).config?.livePreview;
};

// 定义一个装饰器，用于定位实时预览中的图片
function imageDecorations(view: EditorView, plugin: MrdocPlugin) {
    const images = view.dom.querySelectorAll('div.internal-embed');
    images.forEach(element => {
        // console.log(element)
        const src = element.getAttribute('src')
        if(src.startsWith('/media')){
            const imgSrc = processMrdocUrl(plugin.settings.mrdocUrl) + src;
            const imgEle = document.createElement('img')
            imgEle.src = imgSrc;
            element.removeAttribute('class');
            element.removeAttribute('src');
            element.empty();
            element.appendChild(imgEle);
        }
    });
    return Decoration.none; // 返回空装饰器集，因为我们没有使用CodeMirror的装饰器功能
  }

// --> View Plugin
export const imageExtension = (params: { plugin: MrdocPlugin }): Extension => {
  const { plugin } = params;

  const imageViewPlugin = ViewPlugin.fromClass(
      class {
          constructor(view: EditorView) {
            if (!livePreviewActive(plugin.app)) {
              // view.dom.addEventListener('update', () => {
                imageDecorations(view,plugin);
              // });
            }
          }

          update(update: ViewUpdate) {
              if ((update.docChanged || update.viewportChanged) && !livePreviewActive(plugin.app)) {
                  imageDecorations(update.view,plugin)
              }
          }

          destroy() {}
      }
  );

  return imageViewPlugin;
};