import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting,TFile,TFolder } from 'obsidian';
import { MrdocSettingTab, MrdocPluginSettings, DEFAULT_SETTINGS } from './setting';
import Helper from "./helper";
import { MrdocApiReq } from "./api";
import { PullMrdocModal,LoadingModal,PulledModal } from "./modals";
import { imgFileToBase64,processMrdocUrl } from './utils';
// Remember to rename these classes and interfaces!

// 实例化一个插件
export default class MrdocPlugin extends Plugin {
	settings: MrdocPluginSettings;
	helper: Helper;
	editor: Editor;
	req: MrdocApiReq;
	statusBar: HTMLElement;
	loadingModal: Modal;
	pullInfoArray:any[];

	async onload() {
		await this.loadSettings();

		this.req = new MrdocApiReq(this.settings,this);
		this.loadingModal = new LoadingModal(this.app);
		this.helper = new Helper(this.app);
		this.pullInfoArray = [];

		// 添加右键文件菜单
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
			  menu.addItem((item) => {
				item
				  .setTitle("同步到 MrDoc")
				  .setIcon("document")
				  .onClick(async () => {
					await this.onSyncItem(file)
				  });
			  });
			})
		  );

		// 左侧功能区 - 推送图标

		// 左侧功能区 - 拉取图标
		const pullIconEl = this.addRibbonIcon('file-down', '拉取 MrDoc 文档到本地', (evt: MouseEvent) => {
			this.showPullModal()
		});
		pullIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// 注册快捷键
        // this.addCommand({
        //     id: 'push-file-to-mrdoc', // 唯一标识符
        //     name: 'Push Content To MrDoc', // 显示的名称
        //     callback: this.onSave.bind(this), // 回调方法
        //     hotkeys: [
        //         {
        //             modifiers: ['Mod'], // Mod 表示 Command 键（Mac）或 Ctrl 键（Windows）
        //             key: 'M',
        //         },
        //     ],
        // });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		// 添加一个设置选项卡面板，以便用户配置插件的各个功能
		this.addSettingTab(new MrdocSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.createStatusBar();

		// 注册侦听文档变动事件
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', this.onVaultCreate.bind(this)));
			this.registerEvent(this.app.vault.on('rename', this.onVaultRename.bind(this)));
			this.registerEvent(this.app.vault.on('modify', this.onVaultModify.bind(this)));
			this.registerEvent(this.app.vault.on('delete', this.onVaultDelete.bind(this)));	
		})

		// 注册侦听编辑器的粘贴和拖拽事件
		this.registerEvent(this.app.workspace.on('editor-paste',this.onEditorPaste.bind(this)));
		this.registerEvent(this.app.workspace.on('editor-drop',this.onEditorDrop.bind(this)));

	}

	onunload() {

	}

	// 创建一个statusBar状态栏
	createStatusBar() {
		// 创建状态栏项
		this.statusBar = this.addStatusBarItem();
		this.statusBar.setText('');
	  }

	// 加载配置
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// 保存配置
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async pullMrDoc(){
		let doc = {
			pid:this.settings.defaultProject
		}
		let docs = await this.req.getProjectDocs(doc)
		this.pullInfoArray = []
		console.log(docs)
		if(docs.status){
			this.settings.pulling = true
			await this.saveSettings()
			// console.log("pull状态修改为true：",this.settings.pulling)
			let counter = 0;
			await this.createFilesAndFolders(docs.data,'')
			// if(counter === docs.total.length){
				this.settings.pulling = false;
				await this.saveSettings()
				// console.log("pull状态修改为false：",this.settings.pulling)
			// }
		}else{
			let msg = "【拉取失败】MrDoc 文档"
			new Notice(msg)
			this.pullInfoArray.push(msg)
		}
		this.loadingModal.close()
		const pulled = new PulledModal(this.app,this.pullInfoArray)
		pulled.open()
	}

	async createFilesAndFolders(data: any, basePath: string,) {
		for (const doc of data) {
			const cleanBasePath = basePath.replace(/^\//, '');
			const docPath = cleanBasePath ? `${cleanBasePath}/${doc.name}` : doc.name;
			if (doc.sub.length === 0) {// 如果 sub 为空，创建文件
				// console.log(`创建文件：${docPath}`);
				await this.createFile(docPath,doc);
			} else {// 如果 sub 不为空，创建文件夹并递归处理 sub
				// console.log(`创建文件夹：${docPath}`);
				await this.createFolder(docPath,doc.id);
				await this.createFilesAndFolders(doc.sub, docPath);
			}
		}
	}

	// 获取文档内容并创建obsidian文件
	async createFile(docPath:string,doc:any){
		// console.log(docPath)
		let data = {did:doc.id}
		let docContent = await this.req.getDoc(data)
		if(!docContent.status){
			new Notice(`【拉取失败】文档：${doc.name}`);
			return
		};
		
		const filePath = `${docPath}.md`
		const fileExits = this.app.vault.getAbstractFileByPath(filePath) // 获取本地文件是否存在
		const mapExits = this.settings.fileMap.find(item => item.doc_id === doc.id) // 获取文档映射是否存在
		const mapFileExits = (mapExits && mapExits.path) ? this.app.vault.getAbstractFileByPath(mapExits.path) : false; // 获取文档映射的本地文件是否存在

		if(!mapExits && !fileExits){ // 既不存在文档映射，也不存在本地同名文件，直接新建文件
			const file = await this.app.vault.create(filePath,docContent.data.md_content)
			this.settings.fileMap.push({ path: file.path, doc_id: doc.id });
			this.saveSettings()
			let msg = `【已创建】文件：${doc.name}`
			new Notice(msg)
			this.pullInfoArray.push(msg)
		}else if(mapExits){ // 如果存在文档映射
			if(fileExits && mapFileExits && fileExits.path != mapFileExits.path){ // 存在本地文件和映射文件，且两者不一致
				mapExits.path = filePath;
				this.saveSettings()
				await this.compareFileModified(fileExits,docContent)
			}else if(fileExits && mapFileExits && fileExits.path === mapFileExits.path){ // 存在本地文件和映射文件，且两者一致
				await this.compareFileModified(fileExits,docContent)
			}else if(mapFileExits && !fileExits){ // 存在映射文件，不存在本地文件
				const renameFile = await this.app.vault.rename(mapFileExits,filePath)
				mapExits.path = filePath;
				this.saveSettings()
				await this.compareFileModified(mapFileExits,docContent)
			}else if(fileExits && !mapFileExits){ // 存在本地文件，不存在映射文件
				mapExits.path = filePath;
				this.saveSettings()
				await this.compareFileModified(fileExits,docContent)
			}else{
				let msg = `【已存在】文件：${doc.name}`
				new Notice(msg)
				this.pullInfoArray.push(msg)
			}
		}else{
			let msg = `【已存在】文件：${doc.name}`
			new Notice(msg)
			this.pullInfoArray.push(msg)
		}
	}

	// 对比文件最后修改时间判断是否需要更新内容
	private async compareFileModified(file:any,doc:any){
		const localModified = new Date(file.stat.mtime);
		const mrdocModified = new Date(doc.data.modify_time);
		// console.log(file.stat.mtime,doc.data.modify_time)
		// console.log(localModified,mrdocModified)
		if (localModified.getTime() < mrdocModified.getTime()) {
			// console.log("Obsidian 本地文件比远程文件旧");
			const modify = await this.app.vault.modify(file,doc.data.md_content)
			let msg = `【已更新】文件：${doc.data.name}`
			new Notice(msg)
			this.pullInfoArray.push(msg)
		}else{
			let msg = `【无需更新】文件：${doc.data.name}`
			new Notice(msg)
			this.pullInfoArray.push(msg)
		}
	}

	// 创建文件夹
	private async createFolder(docPath: string, docId:any){
		const fileExits = this.app.vault.getAbstractFileByPath(`${docPath}`)
		if(fileExits){
			// console.log(`文件夹${docPath}已存在`,fileExits)
			new Notice(`【已存在】文件夹：${docPath}`)
		}else{
			const file = await this.app.vault.createFolder(`${docPath}`)
			this.settings.fileMap.push({ path: file.path, doc_id: docId });
			this.saveSettings()
			new Notice(`【已创建】文件夹：${docPath}`)
		}
	}

	async toCreate(file: any){
		const fileType = this.isFileOrFolder(file)
		switch(fileType){
			case "file":
				let fileExt = file.extension;
				if(fileExt == 'md'){
					await this.handleMarkdown(file)
				}else if (fileExt == 'html'){
					await this.handleHTML(file)
				}
				break;
			case "folder":
				await this.handleFolder(file)
		}
	}

	async toModify(file:any){
		const fileType = this.isFileOrFolder(file)
		switch(fileType){
			case 'file':
				await this.handleModifyFile(file);
				break;
			case 'folder':
				await this.handleModifyFolder(file);
				break;
		}
	}

	// 手动保存内容到MrDoc
	async onSave(){
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			// const filePath = activeFile.path;
			// console.log(`当前编辑文件路径: ${filePath}`);
			await this.onSyncItem(activeFile)
		}
	}

	// 响应「同步」按钮的点击
	async onSyncItem(file: any){
		// console.log("同步文档：",file)
		// 判断是否存在映射
		let found = this.settings.fileMap.find(item => item.path === file.path)
		if(found){ // 如果存在映射，修改文件
			this.toModify(file)
		}else{ // 如果不存在映射，创建文件
			this.toCreate(file)
		}
	}

	// 侦听文档的创建
	async onVaultCreate(file: any) {
		// if(!this.settings.realtimeSync) return;
		if(this.settings.pulling) return;
		// console.log(this.settings.pulling)
		// console.log("新建文件：",file)
		this.toCreate(file)
	}

	// 侦听文档的修改
	async onVaultModify(file: any) {
		if(!this.settings.realtimeSync) return;
		// console.log("修改文件：",file)
		this.toModify(file)
	}

	// 侦听文档的重命名
	async onVaultRename(file: any,oldPath:string) {
		// if(!this.settings.realtimeSync) return;
		if(this.settings.pulling) return;
		// console.log("文件重命名：",file,oldPath)
		// 修改映射表
		let found = this.settings.fileMap.find(item => item.path === oldPath)
		if(found){
			found.path = file.path
			this.saveSettings()
			this.onVaultModify(file);
		}
	}

	// 侦听文档的删除
	async onVaultDelete(file: any) {
		// console.log("删除文件")
		// 判断是否存在映射
		let found = this.settings.fileMap.find(item => item.path === file.path);
		if(found){
			let doc_id = found.doc_id;
			let newMap = this.settings.fileMap.filter(item => item.path !== file.path);
			this.settings.fileMap = newMap;
			this.saveSettings();
			let doc = {did:doc_id};
			const res = await this.req.delDoc(doc);
			if(res.status){
				new Notice("文档已同步删除！")
			}else{
				new Notice("文档同步删除失败，请前往MrDoc自行删除！")
			}
		}
		
	}

	// 编辑器粘贴事件
	async onEditorPaste(evt: ClipboardEvent,editor: Editor, view: MarkdownView){
		// console.log("编辑器粘贴事件")
        // // 获取粘贴板的数据
        const clipboardData = evt.clipboardData;
        // console.log("粘贴板类型：",clipboardData?.types)

		if (clipboardData.types.includes('text/html') || clipboardData.types.includes('text/plain')) {
			if(!this.settings.applyImage) return;

			const clipboardValue = clipboardData.types.includes('text/html') ? clipboardData.getData("text/html") : clipboardData.getData("text/plain");
			const imageList = clipboardData.types.includes('text/html')
			  ? this.helper.getHtmlImageLink(clipboardValue)
					.filter(image => image.path.startsWith("http"))
					.filter(
					  image =>
						!this.helper.hasBlackDomain(image.path, this.settings.mrdocUrl)
					)
			  : this.helper.getImageLink(clipboardValue)
					.filter(image => image.path.startsWith("http"))
					.filter(
					  image =>
						!this.helper.hasBlackDomain(image.path, this.settings.mrdocUrl)
					);
			
            if (imageList.length !== 0) {
				// console.log("粘贴板图片列表：",imageList)
				new Notice("外链图片转存中……")
				this.req.uploadUrlImageBatch(imageList.map(img => img))
				.then(res => {
					let value = this.helper.getValue();
					res.map(item =>{
						if(!item.success) return;
						let mrdocUrl = processMrdocUrl(this.settings.mrdocUrl)
						if(item.originalFile.title == ""){
							value = value.replaceAll(
								`![${item.originalFile.alt}](${item.originalURL})`,
								`![${item.originalFile.alt}](${mrdocUrl}${item.url})`
							  );
						}else{
							value = value.replaceAll(
								`![${item.originalFile.alt}](${item.originalURL} "${item.originalFile.title}")`,
								`![${item.originalFile.alt}](${mrdocUrl}${item.url} "${item.originalFile.title}")`
							  );
						}
					});
					this.helper.setValue(value);
					new Notice("外链图片转存完成！")
				})
			}

		}else if (clipboardData.types.includes('Files')) {
			if(!this.settings.saveImg) return;
			evt.preventDefault();
            const files = clipboardData.files;
			if(files){
				for (const file of files) {
					if (file.type.startsWith('image/')) {
						// console.log('粘贴的图片:', file);
						let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
						this.insertTemporaryText(editor, pasteId);
						const name = file.name;
						const imgData = {
							'base64':await imgFileToBase64(file)
						};
						const resp = await this.req.uploadImage(imgData)
						// console.log(resp)
						if(resp.success == 1){
							let mrdocUrl = processMrdocUrl(this.settings.mrdocUrl)
							let imgUrl = `${mrdocUrl}${resp.url}`
							this.embedMarkDownImage(editor, pasteId, imgUrl, name);
						}else{
							new Notice("粘贴图片上传失败")
						}
					}
				}
			}
        }
		
	}

	// 编辑器拖拽事件
	async onEditorDrop(evt:DragEvent, editor:Editor,markdownView: MarkdownView){
		if(!this.settings.saveImg) return;

		let files = evt.dataTransfer.files;

		if (files.length !== 0 && files[0].type.startsWith("image")) {
            let sendFiles: Array<string> = [];
            let files = evt.dataTransfer.files;
            Array.from(files).forEach((item, index) => {
              sendFiles.push(item.path);
            });
            evt.preventDefault();

			for (const file of files) {
				// console.log('拖入的图片:', file);
				let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
				this.insertTemporaryText(editor, pasteId);
				const name = file.name;
				const imgData = {
					'base64':await imgFileToBase64(file)
				};
				const resp = await this.req.uploadImage(imgData)
				// console.log(resp)
				if(resp.success == 1){
					let mrdocUrl = processMrdocUrl(this.settings.mrdocUrl)
					let imgUrl = `${mrdocUrl}${resp.url}`
					this.embedMarkDownImage(editor, pasteId, imgUrl, name);
				}else{
					new Notice("拖入图片上传失败")
				}
			}
          }
	}

	// 解析文件的上级
	async getFileParent(file:any){
		if(file.parent.parent === null){ // 没有上级
			return 0
		}

		const parentPathSegments = [];
		let currentFolder = file.parent;

		// 逐层向上访问 parent 属性，直到根目录
		while (currentFolder) {
			if(currentFolder.name !== ''){
				parentPathSegments.unshift(currentFolder.name);
			}
			currentFolder = currentFolder.parent;
		}

		// 拼接上级路径
		const parentPath = parentPathSegments.join("/");
		// console.log("上级路径：",parentPathSegments,parentPath)
		let found = this.settings.fileMap.find(item => item.path === parentPath)
		if (found){
			return found.doc_id
		} else {
			return 0
		}
	}

	// 创建 Markdown 文件文档
	async handleMarkdown(file:any) {
		let parentValue = await this.getFileParent(file);
		let doc = {
		  pid: this.settings.defaultProject,
		  title: file.basename,
		  editor_mode: 1,
		  doc: '',
		  parent_doc: parentValue,
		};
		return this.handleDocument(file, doc);
	  }
	
	  // 创建 HTML 文件文档
	  async handleHTML(file:any) {
		let parentValue = await this.getFileParent(file);
		let doc = {
		  pid: this.settings.defaultProject,
		  title: file.basename,
		  editor_mode: 3,
		  doc: '',
		  parent_doc: parentValue,
		};
		return this.handleDocument(file, doc);
	  }

	  // 创建文件夹文档
	async handleFolder(file:any) {
		let parentValue = await this.getFileParent(file);
		let doc = {
		  pid: this.settings.defaultProject,
		  title: file.name,
		  editor_mode: 1,
		  doc: '',
		  parent_doc: parentValue,
		};
		return this.handleDocument(file, doc);
	  }
	
	  // 创建文档
	  async handleDocument(file:any, doc:any) {
		const res = await this.req.createDoc(doc);
		if (res.status) {
		  this.settings.fileMap.push({ path: file.path, doc_id: res.data });
		  this.saveSettings();
		  new Notice("文档" + doc.title + "已同步至MrDoc！");
		} else {
		  new Notice("文档同步至MrDoc失败！");
		}
	  }

	  //  修改文件
	  async handleModifyFile(file:any){
		// console.log(file)
		// 判断是否存在映射
		let found = this.settings.fileMap.find(item => item.path === file.path)
		if(found){
			let content = await this.app.vault.cachedRead(file)
			let parentValue = await this.getFileParent(file);
			// console.log(content)
			let doc = {
				pid:this.settings.defaultProject,
				did:found.doc_id,
				title:file.basename,
				doc:content,
				parent_doc: parentValue,
			}
			return this.handleModify(doc)
		}
	  }

	  // 修改文件夹
	  async handleModifyFolder(file:any){
		// 判断是否存在映射
		let found = this.settings.fileMap.find(item => item.path === file.path)
		if(found){
			let parentValue = await this.getFileParent(file);
			let doc = {
				pid:this.settings.defaultProject,
				did:found.doc_id,
				title:file.name,
				doc:'',
				parent_doc: parentValue,
			}
			return this.handleModify(doc)
		}
	  }

	  // 处理修改操作
	  async handleModify(doc:any){
		const res = await this.req.modifyDoc(doc)
		if(res.status){
			let formattedTime = this.formatCurrentTime()
			this.statusBar.setText(`同步于：${formattedTime}`)
			if(!this.settings.realtimeSync){
				new Notice("文档已同步至 MrDoc")
			}
		}else{
			new Notice("文档同步至MrDoc失败！")
		}
	  }
	  
	// 判断文件类型
	isFileOrFolder(file: any) {
		if (file instanceof TFile) {
			return "file";
		} else if (file instanceof TFolder) {
			return "folder";
		} else {
			return "unknown";
		}
	}

	  // 格式化当前时间
	  formatCurrentTime(){
		const currentDate = new Date();
		const f_time = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;
		return f_time
	}

	// 【图片】上传插入临时文本
	insertTemporaryText(editor: Editor, pasteId: string) {
		let progressText = MrdocPlugin.progressTextFor(pasteId);
		editor.replaceSelection(progressText + "\n");
	  }
	
	//   【图片】上传进度文本
	private static progressTextFor(id: string) {
		return `![Uploading file...${id}]()`;
	}

	embedMarkDownImage(
		editor: Editor,
		pasteId: string,
		imageUrl: any,
		name: string = ""
	  ) {
		let progressText = MrdocPlugin.progressTextFor(pasteId);
		// name = this.handleName(name);
	
		let markDownImage = `![${name}](${imageUrl})`;
	
		MrdocPlugin.replaceFirstOccurrence(
		  editor,
		  progressText,
		  markDownImage
		);
	  }

	static replaceFirstOccurrence(
		editor: Editor,
		target: string,
		replacement: string
	  ) {
		let lines = editor.getValue().split("\n");
		for (let i = 0; i < lines.length; i++) {
		  let ch = lines[i].indexOf(target);
		  if (ch != -1) {
			let from = { line: i, ch: ch };
			let to = { line: i, ch: ch + target.length };
			editor.replaceRange(replacement, from, to);
			break;
		  }
		}
	  }
	

	// 显示拉取模态框
    private async showPullModal() {
		if (!this.loadingModal) {
			this.loadingModal = new LoadingModal(this.app);
		}
		const modal = new PullMrdocModal(this.app, () => {
			// 在这里写模态框内部的逻辑
			this.pullMrDoc()
			this.loadingModal!.open()
		});
		modal.open();
    }
}
