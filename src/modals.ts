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

        // 创建加载框
        const loadingIndicator = contentEl.createEl('div', { cls: 'loading-indicator' });
        loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';

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
        const contentDiv = contentEl.createEl("div");
        contentDiv.style.maxHeight = '300px';
        contentDiv.style.overflowY = 'auto';
        contentDiv.style.marginBottom = '10px';
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

// 图片列表模态框
class ImagePickerModal extends Modal {
    selectedImageUrl: string | null = null;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        // Fetch image data from the API
        // Replace the following with your actual API call
        const imageData = this.fetchImageData();

        // Display the image data in the modal
        this.displayImages(contentEl, imageData);
    }

    fetchImageData() {
        // Replace this with your API endpoint for fetching image data
        const apiUrl = 'https://api.example.com/images';
        
        // Perform an API call to fetch image data
        // Replace this with your actual API call logic
        // You might want to use libraries like axios or fetch
        // to make the HTTP request
        // For simplicity, we'll use a mock API call
        const mockImageData = [
            { id: 1, url: 'https://example.com/image1.jpg' },
            { id: 2, url: 'https://example.com/image2.jpg' },
            // Add more images as needed
        ];

        return mockImageData;
    }

    displayImages(contentEl, imageData) {
        // Display images in the modal
        imageData.forEach((image) => {
            const imgElement = contentEl.createEl('img', { attr: { src: image.url }, cls: 'image-preview' });

            // Add click event listener to select an image
            imgElement.addEventListener('click', () => this.onImageSelect(image.url));
        });

        // Add a button to insert the selected image into the editor
        const insertButton = contentEl.createEl('button', { text: 'Insert Image', cls: 'mod-cta' });
        insertButton.addEventListener('click', () => this.insertImage());
    }

    onImageSelect(selectedImageUrl) {
        // Store the selected image URL in a variable
        this.selectedImageUrl = selectedImageUrl;
    }

    insertImage() {
        // Get the active editor
        const activeEditor = this.app.workspace.activeLeaf.view.sourceMode.cmEditor;

        // Get the selected image URL
        const imageUrl = this.selectedImageUrl;

        if (activeEditor && imageUrl) {
            // Insert the selected image URL at the cursor position
            activeEditor.replaceSelection(`![Alt Text](${imageUrl})`);

            // Close the modal
            this.close();
        }
    }
}

