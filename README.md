A plugin that synchronizes documents between Obsidian and MrDoc.

- Provides a new solution for local document remote synchronization for Obsidian users.
- Offers a new solution for online document browsing for local Obsidian documents.
- Provides a new solution for offline writing, saving, and synchronizing documents for MrDoc users.

## System Requirements

- MrDoc Professional Edition `v1.3.6+` or MrDoc Open Source Edition `v0.9.2+`.
- Obsidian `v1.4.16+`.

## Correspondence of Basic Concepts

- Obsidian's "Vault" corresponds to MrDoc's "Collection."
- "Markdown files" in Obsidian Vault correspond to "Documents" in MrDoc.
- "Folders" in Obsidian Vault correspond to "Documents" in MrDoc that contain subordinate documents.

## Plugin Rules

### Vault

In Obsidian, you need to select the target collection of MrDoc on the plugin's settings page.
> If you want to synchronize documents to a new MrDoc collection, click the "Create New" button to create a collection first and then select it.

### Pull Remote Documents

The plugin adds a functional icon button to the left toolbar, used to pull all documents from the specified MrDoc collection to Obsidian locally. After clicking the pull operation, the plugin retrieves information about all documents in the specified collection and prepares to write it to the local Obsidian.

- If there is no file/folder with the same name locally, create a new file/folder.
- If a local file with the same name already exists, check whether there is a mapping relationship between the local file and the remote document:
    - If a mapping relationship exists, compare the last modification time of the local file and the remote document:
        - If the local file's last modification time is newer than the remote document, skip.
        - If the local file's last modification time is older than the remote document, overwrite the local file with the content of the remote document.
    - If there is no mapping relationship, skip.
- If a local folder with the same name already exists, skip.

### Create New File/Folder

When creating a new file/folder locally in Obsidian, the plugin automatically creates a document in the MrDoc collection specified and maintains a mapping relationship between the local document and the remote document within the plugin.

### Rename File/Folder

When renaming a file/folder locally in Obsidian, the plugin automatically modifies the corresponding document title on MrDoc.

### Modify File

After modifying the file content, you can click the "Sync to MrDoc" menu in the editor's top-right "More Options" to push the document's updates to MrDoc.

You can also hover over a specific document in the left file list of the Obsidian software, right-click the mouse to bring up the context menu, and click the "Sync to MrDoc" menu to push the document's updates to MrDoc.

In addition, the plugin provides a "Real-time Push" option. You can enable "Real-time Update Document Content" on the plugin's settings page. In this way, when you modify the file content in Obsidian, the plugin will instantly update the latest file content to MrDoc.

### Delete File/Folder

If there is a mapping relationship between the local file/folder in Obsidian and MrDoc, deleting the file/folder locally will also synchronize the deletion of the document in MrDoc (soft delete, the document goes to the trash).

### Image Handling

For image handling, the plugin provides two options:

- Save local images
- Save clipboard images

**1. Save Local Images**

When you paste or drag local images into the Obsidian editor, the plugin uploads the images to MrDoc, then returns the image link address from MrDoc and inserts it into the Obsidian editor.

**2. Save Clipboard Images**

When you copy text elsewhere to paste into the Obsidian editor, the plugin extracts image links from it and uploads them to MrDoc. It then returns the image link address from MrDoc, replacing the original image links in the text.

### Reset Mapping Relationship

After mapping relationships are established between Obsidian local files and MrDoc documents, if you need to break their binding, you can click "Reset Document Mapping" on the plugin's settings page. This way, operations on Obsidian local files will not be synchronized to MrDoc.