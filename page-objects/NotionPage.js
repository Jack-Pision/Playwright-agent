const { chromium } = require('playwright');

class NotionPage {
  constructor(page) {
    this.page = page;
    
    // Main content area
    this.editor = page.locator('[contenteditable="true"]');
    this.titleInput = page.locator('[placeholder="Untitled"]');
    
    // Common actions
    this.addBlockButton = page.getByRole('button', { name: 'Add block' });
    this.shareButton = page.getByRole('button', { name: 'Share' });
  }

  async waitForDocumentLoad() {
    await this.page.waitForSelector('[contenteditable="true"]', { state: 'visible', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  async typeText(text) {
    await this.editor.click();
    await this.editor.type(text);
  }

  async changeDocumentTitle(title) {
    await this.titleInput.click();
    await this.titleInput.fill(title);
    await this.page.keyboard.press('Enter');
  }
}

module.exports = NotionPage; 