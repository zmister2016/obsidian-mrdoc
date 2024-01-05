import { MarkdownView, App,TFile,TFolder,TAbstractFile } from "obsidian";
import { parse } from "path";

interface Image {
  path: string;
  alt: string;
  title: string;
  source: string;
}
// ![](./dsa/aa.png) local image should has ext
// ![](https://dasdasda) internet image should not has ext
// const REGEX_FILE = /\!\[(.*?)\]\((\S+\.\w+)\)|\!\[(.*?)\]\((https?:\/\/.*?)\)/g;
// const REGEX_WIKI_FILE = /\!\[\[(.*?)(\s*?\|.*?)?\]\]/g;
// const REGEX_IMG = /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g;
const REGEX_IMG = /!\[([^\]]*)]\(([^)]+?)(?: "([^"]*)")?\)/g;
export default class Helper {
  app: App;

  constructor(app: App) {
    this.app = app;
  }
  getFrontmatterValue(key: string, defaultValue: any = undefined) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      return undefined;
    }
    const path = file.path;
    const cache = this.app.metadataCache.getCache(path);

    let value = defaultValue;
    if (cache?.frontmatter && cache.frontmatter.hasOwnProperty(key)) {
      value = cache.frontmatter[key];
    }
    return value;
  }

  getEditor() {
    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView) {
      return mdView.editor;
    } else {
      return null;
    }
  }
  getValue() {
    const editor = this.getEditor();
    return editor.getValue();
  }

  setValue(value: string) {
    const editor = this.getEditor();
    const { left, top } = editor.getScrollInfo();
    const position = editor.getCursor();

    editor.setValue(value);
    editor.scrollTo(left, top);
    editor.setCursor(position);
  }

  // get all file urls, include local and internet
  // 从编辑器内容中解析出所有图片链接
  getAllFiles(): Image[] {
    const editor = this.getEditor();
    let value = editor.getValue();
    return this.getImageLink(value);
  }
  // 从粘贴板内容中解析出图片链接
  getImageLink(value: string): Image[] {
    // const matches = value.matchAll(REGEX_FILE);
    // const WikiMatches = value.matchAll(REGEX_WIKI_FILE);
    const ImgMatches = [...value.matchAll(REGEX_IMG)];

    let fileArray: Image[] = [];

    ImgMatches.map(match => {
      // console.log(match)
      const alt = match[1] || ""; // 如果 altText 不存在，设置为空字符串
      const path = match[2];
      const title = match[3] || ""; // 如果 title 不存在，设置为空字符串
    
      fileArray.push({
        path:path,
        alt: alt,
        title:title,
        source:match[0]
      });
    });

    return fileArray;
  }

  getHtmlImageLink(value: string): Image[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, 'text/html');
    const imgElements = doc.querySelectorAll('img');
    let fileArray: Image[] = [];

    imgElements.forEach((imgElement) => {
      const path = imgElement.getAttribute('src');
      const alt = imgElement.getAttribute('alt');
      const title = imgElement.getAttribute('title');
        if (path) {
          const name = alt || '';
          const source = imgElement.outerHTML;
          fileArray.push({
            path:path,
            alt: alt || '',
            title:title || '',
            source:source
          });
        }
    });

    return fileArray;

  }

  hasBlackDomain(src: string, blackDomains: string) {
    if (blackDomains.trim() === "") {
      return false;
    }
    const blackDomainList = blackDomains.split(",").filter(item => item !== "");
    let url = new URL(src);
    const domain = url.hostname;

    return blackDomainList.some(blackDomain => domain.includes(blackDomain));
  }
}