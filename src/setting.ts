import { App, PluginSettingTab, Setting, Notice,Modal,setIcon } from "obsidian";
import MrdocPlugin from "./main";
import type { TextComponent } from "obsidian";
import { requestUrl,RequestUrlParam, } from "obsidian";
import { MrdocApiReq } from "./api";
import { processMrdocUrl } from "./utils";

export interface MrdocPluginSettings {
	mrdocUrl: string;
	mrdocToken: string;
	saveImg: boolean;
	applyImage: boolean;
	projects: object;
	defaultProject: string;
	fileMap: Array<any>;
	realtimeSync: boolean;
	pulling:boolean,
	pushing:boolean

}

export const DEFAULT_SETTINGS: MrdocPluginSettings = {
	mrdocUrl: '',
	mrdocToken: '',
	saveImg: true,
	applyImage: false,
	projects: [],
	defaultProject: '',
	fileMap: [],
	realtimeSync: false,
	pulling:false,
	pushing:false
}

  
// 定义一个密码输入框显示函数
const wrapTextWithPasswordHide = (text: TextComponent) => {
	const hider = text.inputEl.insertAdjacentElement("afterend", createSpan());
	// the init type of hider is "hidden" === eyeOff === password
	setIcon(hider,'eye')
	hider.addEventListener("click", (e) => {
		const isText = text.inputEl.getAttribute("type") === "text";
		const icon = isText ? 'eye' : 'eye-off';
		setIcon(hider, icon);
		text.inputEl.setAttribute("type", isText ? "password" : "text");
		text.inputEl.focus();
	});

	// the init type of text el is password
	text.inputEl.setAttribute("type", "password");
	return text;
};

// 实例化一个插件设置面板
export class MrdocSettingTab extends PluginSettingTab {
	plugin: MrdocPlugin;

	constructor(app: App, plugin: MrdocPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h1',{ text: 'MrDoc'});
		// containerEl.createEl('h2', { text: '基础' });

		new Setting(containerEl)
			.setName('MrDoc URL')
			.setClass('mrdoc-settings-input')
			.setDesc('请输入你的 MrDoc URL 地址')
			.addText(text => text
				.setPlaceholder('例如：https://doc.mrdoc.pro')
				.setValue(this.plugin.settings.mrdocUrl)
				.onChange(async (value) => {
					this.plugin.settings.mrdocUrl = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('用户 Token')
			.setClass('mrdoc-settings-input')
			.setDesc('请输入你的 MrDoc 用户 Token')
			.addText((text) => {
				wrapTextWithPasswordHide(text);
				text
					.setPlaceholder('请输入你的 MrDoc 用户 Token')
					.setValue(this.plugin.settings.mrdocToken)
					.onChange(async(value) =>{
						this.plugin.settings.mrdocToken = value;
						await this.plugin.saveSettings();
					})
					.inputEl.type = 'password'; // 设置输入框类型为密码
				});

		new Setting(containerEl)
			.setName('检查可否连接')
			.setClass('mrdoc-settings-input')
			.setDesc('检查填写的配置是否可连接')
			.addButton((button) => {
				button.setButtonText('检查').onClick(async () => {
				  try {
					new Notice("正在测试连接……")
					// 读取设置中的 URL 和 Token
					const mrdocUrl = processMrdocUrl(this.plugin.settings.mrdocUrl);
					const mrdocToken = this.plugin.settings.mrdocToken;
		
					if (!mrdocUrl || !mrdocToken) {
					  throw new Error('MrDoc URL and Token are required');
					}

					// 禁用按钮
					button.setDisabled(true);
		
					// 构建 API 请求 URL
					const apiUrl = `${mrdocUrl}/api/check_token/`; // 根据实际需要拼接路径
					const queryString = `token=${mrdocToken}`;
		
					// 发起 API 请求
					const response = await requestUrl({url:`${apiUrl}?${queryString}`});
					if (response.json.status){
						new Notice("测试连接成功！")
					}
				  } catch (error) {
					console.error('Error during API request:', error);
					new Notice(`Error during API request: ${error.message}`);
				  } finally {
					// 启用按钮
					button.setDisabled(false);
				  }
				});
			});

		new Setting(containerEl).setName('功能').setHeading();

		// 添加下拉选项框
		new Setting(containerEl)
		.setName('MrDoc 目标文集')
		.setClass('mrdoc-projects')
		.setDesc('从列表中选择一个文集')
		.addDropdown(async (dropdown) => {
			// 使用 API 获取下拉选项框的数据
			const apiData = this.plugin.settings.projects;

			// 将 API 数据添加到下拉选项框
			apiData.forEach((item) => {
				dropdown.addOption(item.id, item.name);
			});

			// 设置下拉选项框的默认值
			dropdown.setValue(this.plugin.settings.defaultProject);

			// 监听选项变化事件
			dropdown.onChange(async (value) => {
				this.plugin.settings.defaultProject = value;
				this.plugin.saveSettings();
			});
			
		})
		.addButton(async (button) => {
			button.setButtonText("刷新");
			button.onClick(async () => {
				await this.getProjectsData();
				this.plugin.saveSettings();
				this.display()
			});
		  })
		  .addButton(async (button) =>{
			button.setButtonText("新建");
			button.onClick(async () => {
				const modal = new CreateProjectModal(this.app,this.createProject.bind(this))
				modal.open()
			});
		  })

		new Setting(containerEl)
		  .setName('重置文档映射')
		  .setClass('mrdoc-settings-input')
		  .setDesc('重置本地文档与 MrDoc 文档的映射关系')
		  .addButton((button) => {
			  button.setButtonText('重置').onClick(async () => {
				this.plugin.settings.fileMap = [];
				  this.plugin.saveSettings();
				  new Notice("文档映射重置完成！")
			  });
		  });

		new Setting(containerEl)
		  .setName('实时更新文档内容')
		  .setDesc('当你修改文档/文件夹时，实时地将其变动更新到 MrDoc。你还可以通过文件菜单「同步至 MrDoc」进行文档同步更新。')
		  .addToggle((toggle) => {
			toggle
			  .setValue(this.plugin.settings.realtimeSync)
			  .onChange((value) => {
				this.plugin.settings.realtimeSync = value;
				this.plugin.saveSettings();
			  });
		  });
		
		new Setting(containerEl)
			.setName('转存图片')
			.setDesc('文档编辑器中粘贴、拖入本地和网络图片时，将图片转存至 MrDoc')
			.addToggle((toggle) => {
			  toggle
				.setValue(this.plugin.settings.saveImg)
				.onChange((value) => {
				  this.plugin.settings.saveImg = value;
				  this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('转存剪切板文本中的图片')
			.setDesc('如果剪切板文本中包含图片链接，将这些图片转存至 MrDoc')
			.addToggle((toggle) => {
			  toggle
				.setValue(this.plugin.settings.applyImage)
				.onChange((value) => {
				  this.plugin.settings.applyImage = value;
				  this.plugin.saveSettings();
				});
			});

	}
	
	async getProjectsData(): Promise<void> {
		try {
			new Notice("正在获取文集列表……")
			// 读取设置中的 URL 和 Token
			const mrdocUrl = processMrdocUrl(this.plugin.settings.mrdocUrl);
			const mrdocToken = this.plugin.settings.mrdocToken;

			if (!mrdocUrl || !mrdocToken) {
			  throw new Error('MrDoc URL and Token are required');
			}

			// 构建 API 请求 URL
			const apiUrl = `${mrdocUrl}/api/get_projects/`; // 根据实际需要拼接路径
			const queryString = `token=${mrdocToken}`;

			// 发起 API 请求
			const response = await requestUrl({url:`${apiUrl}?${queryString}`});
			if (response.json.status){
				new Notice("获取文集列表成功！")
				this.plugin.settings.projects = response.json.data
			}
		  } catch (error) {
			new Notice(`获取文集列表异常: ${error.message}`);
			this.plugin.settings.projects = []
		  }
	}

	// 新建文集
	async createProject(name:string): Promise<void> {
		// console.log("文件参数为：",name)
		if(typeof name === "string" && name.trim() !== ""){
			let doc = {name: name}
			const resp = await this.plugin.req.createProject(doc)
			if(resp.status){
				new Notice("新建文集："+name+"成功！")
				await this.getProjectsData();
				this.plugin.saveSettings();
				this.display()
			}else{
				new Notice("新建文集异常！")
			}
		}else{
			new Notice("无效的输入值！")
		}
		
	}
}

// 新建文集的模态框
export class CreateProjectModal extends Modal {
  result: string;
  onSubmit: (result: string) => void;

  constructor(app: App, onSubmit: any) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "创建一个新的觅思文档文集" });

    new Setting(contentEl)
      .setName("名称")
	  .setDesc('文集权限为私密，文集信息配置请前往MrDoc进行修改')
      .addText((text) =>
        text.onChange((value) => {
          this.result = value
        }));

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("提交")
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.result);
          }));
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}