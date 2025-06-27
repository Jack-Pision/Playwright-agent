const { chromium } = require('playwright');

class GoogleSlidesPage {
  constructor(page) {
    this.page = page;
    
    // Main content area
    this.canvas = page.locator('.punch-viewer-content');
    this.titleInput = page.locator('[aria-label*="Rename"]');
    
    // Common actions
    this.addSlideButton = page.getByRole('button', { name: 'New slide' });
    this.shareButton = page.getByRole('button', { name: 'Share' });
  }

  async waitForDocumentLoad() {
    await this.page.waitForSelector('.punch-viewer-content', { state: 'visible', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  async typeText(text) {
    await this.canvas.click();
    await this.page.keyboard.type(text);
  }

  async changeDocumentTitle(title) {
    await this.titleInput.click();
    await this.titleInput.fill(title);
    await this.page.keyboard.press('Enter');
  }
}

module.exports = GoogleSlidesPage; 