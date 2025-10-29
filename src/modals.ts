import { App, Modal, ButtonComponent } from "obsidian";

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
		contentEl.createEl("p", { text: "此操作将会从指定的 MrDoc 文集中拉取文档到本地 Vault 仓库。" });
		contentEl.createEl("li", { text: "Vault 内存在的同名文件，将会跳过！" });
		contentEl.createEl("li", { text: "Vault 同层级下不支持同名文件/文件夹，故 MrDoc 的同层级同名文档只同步其中一个！" });
		contentEl.createEl("li", { text: "拉取的文件将与 MrDoc 文档建立映射关系，在 Vault 内对文件进行的操作将同步至 MrDoc！" });
		contentEl.createEl("li", { text: "请谨慎进行此操作，确保没有重要文件在 Vault 仓库内！" });

		contentEl.createEl("br");

		// ✅ 使用 ButtonComponent 而不是 createEl
		const confirmButton = new ButtonComponent(contentEl)
			.setButtonText("已知晓风险，确认拉取")
			.setCta() // 代替 cls: 'mod-cta'
			.onClick(() => {
				this.onConfirm();
				this.close();
			});

		new ButtonComponent(contentEl)
			.setButtonText("取消")
			.onClick(() => this.close());
	}
}

// 加载中模态框
export class LoadingModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "任务进行中..." });
	}
}

// 拉取完成模态框
export class PulledModal extends Modal {
	infoArray: any[];

	constructor(app: App, infoArray: any[]) {
		super(app);
		this.infoArray = infoArray;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "已完成拉取！" });
		contentEl.createEl("p", { text: "已完成从 MrDoc 拉取文档到本地，详情如下：" });

		const contentDiv = contentEl.createEl("div", { cls: "pulled-modal-div" });
		this.infoArray.forEach((data) => {
			contentDiv.createEl("li", { text: data });
		});

		// ✅ 使用 ButtonComponent 并设置为 CTA 按钮
		new ButtonComponent(contentEl)
			.setButtonText("好的")
			.setCta()
			.onClick(() => this.close());
	}
}
