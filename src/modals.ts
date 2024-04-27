import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting,TFile,TFolder } from 'obsidian';

// 拉取模态框
export class PullMrdocModal extends Modal {
	onConfirm: () => void;
  
	constructor(app: App, onConfirm: () => void) {
	  super(app);
	  this.onConfirm = onConfirm;
	}
  
	onOpen() {
	  const { contentEl } = this;
  
	  contentEl.createEl("h2", { text: "拉取 MrDoc 文档到本地" });
	  // 添加对话框内容和交互元素
	  contentEl.createEl('p', { text: '此操作将会从指定的 MrDoc 文集中拉取文档到 Obsidian 本地。' });
	  contentEl.createEl('li', { text: 'Obsidian Vault 内存在的同名文件，将会跳过！' });
      contentEl.createEl('li', { text: 'Obsidian 同层级下不支持同名文件/文件夹，故 MrDoc 的同层级同名文档只同步其中一个！' });
	  contentEl.createEl('li', { text: '拉取的文件将与 MrDoc 文档建立映射关系，在 Obsidian 内对文件进行的操作将同步至 MrDoc！' });
	  contentEl.createEl('li', { text: '请谨慎进行此操作，确保没有重要文件在 Obsidian Vault 内！' });
	  contentEl.createEl('br');
	  const confirmButton = contentEl.createEl('button', {
		text: '已知晓风险，确认拉取',
		cls: 'mod-cta',
		});
		confirmButton.addEventListener('click', () => {
            // 在这里调用传递进来的方法
            this.onConfirm();
            this.close();
        });

	  const cancelButton = contentEl.createEl('button', {
		text: '取消',
		cls: 'mod',
		});
		cancelButton.addEventListener('click', () => {
            this.close();
        });
	}
  }

// 加载对话框
export class LoadingModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
		contentEl.empty();  // 清空内容
        contentEl.createEl('h2', { text: '任务进行中...' });

    }
};

// 加载拉取完成对话框
export class PulledModal extends Modal {
    infoArray: any[]

    constructor(app: App, infoArray:any[]) {
        super(app);
        this.infoArray = infoArray
    }

    onOpen() {
        const { contentEl } = this;
		contentEl.empty();  // 清空内容
        contentEl.createEl('h2', { text: '已完成拉取！' });
        contentEl.createEl('p', { text: '已完成从 MrDoc 拉取文档到本地，详情如下：' });
        const contentDiv = contentEl.createEl("div",{cls:'pulled-modal-div'});
        this.infoArray.forEach((data)=>{
            contentDiv.createEl('li', { text: data });
        })

        const confirmButton = contentEl.createEl('button', {
            text: '好的',
            cls: 'mod-cta',
            });
            confirmButton.addEventListener('click', () => {
                this.close();
            });

    }

}

