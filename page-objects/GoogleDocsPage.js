const { expect } = require('@playwright/test');

class GoogleDocsPage {
  constructor(page) {
    this.page = page;
    
    // Intelligent locators using user-facing attributes
    this.editor = page.frameLocator('iframe.docs-texteventtarget-iframe').locator('[contenteditable="true"]');
    this.menuBar = page.locator('[role="menubar"]');
    this.fileMenu = page.getByRole('menuitem', { name: 'File' });
    this.editMenu = page.getByRole('menuitem', { name: 'Edit' });
    this.formatMenu = page.getByRole('menuitem', { name: 'Format' });
    this.shareButton = page.getByRole('button', { name: 'Share' });
    this.commentButton = page.getByRole('button', { name: 'Add comment' });
    
    // Formatting toolbar
    this.boldButton = page.getByRole('button', { name: 'Bold' });
    this.italicButton = page.getByRole('button', { name: 'Italic' });
    this.underlineButton = page.getByRole('button', { name: 'Underline' });
    this.fontSizeDropdown = page.locator('[aria-label*="Font size"]');
    
    // Document title
    this.documentTitle = page.locator('input[aria-label*="Rename"]');
  }

  async waitForDocumentLoad() {
    // Wait for the document to be fully loaded
    await expect(this.editor).toBeVisible({ timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
    
    // Additional wait for Google Docs specific loading
    await this.page.waitForFunction(() => {
      return document.querySelector('iframe.docs-texteventtarget-iframe') !== null;
    });
  }

  async typeText(text) {
    await this.editor.click();
    await this.editor.type(text);
    
    // Verify text was actually typed
    const editorContent = await this.editor.textContent();
    if (!editorContent.includes(text)) {
      throw new Error(`Failed to type text: "${text}"`);
    }
  }

  async replaceAllText(newText) {
    await this.editor.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(newText);
    
    // Verify replacement
    await expect(this.editor).toContainText(newText);
  }

  async insertTextAtEnd(text) {
    await this.editor.click();
    await this.page.keyboard.press('Control+End');
    await this.page.keyboard.type(text);
  }

  async insertTextAtBeginning(text) {
    await this.editor.click();
    await this.page.keyboard.press('Control+Home');
    await this.page.keyboard.type(text);
  }

  async selectAllAndFormat(formatting) {
    await this.editor.click();
    await this.page.keyboard.press('Control+A');
    
    switch (formatting.toLowerCase()) {
      case 'bold':
        await this.boldButton.click();
        break;
      case 'italic':
        await this.italicButton.click();
        break;
      case 'underline':
        await this.underlineButton.click();
        break;
      default:
        throw new Error(`Unsupported formatting: ${formatting}`);
    }
  }

  async findAndReplace(findText, replaceText) {
    // Open Find & Replace dialog
    await this.page.keyboard.press('Control+H');
    
    // Wait for dialog and fill fields
    await this.page.getByLabel('Find').fill(findText);
    await this.page.getByLabel('Replace with').fill(replaceText);
    await this.page.getByRole('button', { name: 'Replace all' }).click();
    
    // Close dialog
    await this.page.keyboard.press('Escape');
  }

  async addComment(text) {
    await this.commentButton.click();
    await this.page.getByLabel('Add a comment').fill(text);
    await this.page.getByRole('button', { name: 'Comment' }).click();
  }

  async shareDocument(email, permission = 'editor') {
    await this.shareButton.click();
    await this.page.getByLabel('Add people and groups').fill(email);
    
    // Select permission level
    const permissionDropdown = this.page.locator('[aria-label*="permission"]');
    await permissionDropdown.click();
    await this.page.getByRole('menuitem', { name: permission }).click();
    
    await this.page.getByRole('button', { name: 'Send' }).click();
  }

  async changeDocumentTitle(newTitle) {
    await this.documentTitle.click();
    await this.documentTitle.fill(newTitle);
    await this.page.keyboard.press('Enter');
  }

  async exportDocument(format = 'pdf') {
    await this.fileMenu.click();
    await this.page.getByText('Download').click();
    
    const formatMap = {
      'pdf': 'PDF Document (.pdf)',
      'docx': 'Microsoft Word (.docx)',
      'odt': 'OpenDocument Format (.odt)',
      'txt': 'Plain Text (.txt)'
    };
    
    await this.page.getByText(formatMap[format] || formatMap['pdf']).click();
  }

  async insertTable(rows = 2, cols = 2) {
    await this.page.getByRole('menuitem', { name: 'Insert' }).click();
    await this.page.getByText('Table').click();
    
    // Select table size (simplified - Google Docs has a grid selector)
    await this.page.locator(`[data-rows="${rows}"][data-cols="${cols}"]`).click();
  }

  async insertImage(imagePath) {
    await this.page.getByRole('menuitem', { name: 'Insert' }).click();
    await this.page.getByText('Image').click();
    await this.page.getByText('Upload from computer').click();
    
    // Handle file upload
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
  }

  async getDocumentText() {
    return await this.editor.textContent();
  }

  async verifyTextExists(text) {
    await expect(this.editor).toContainText(text);
  }

  async isLoggedIn() {
    try {
      // Check if we can see the share button (only visible when logged in)
      await expect(this.shareButton).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = GoogleDocsPage; 