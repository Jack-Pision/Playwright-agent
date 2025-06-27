const { expect } = require('@playwright/test');

class NotionPage {
  constructor(page) {
    this.page = page;
    
    // Intelligent locators for Notion's block-based editor
    this.editor = page.locator('[data-content-editable-root="true"]');
    this.titleInput = page.locator('h1[data-content-editable-leaf="true"]');
    this.newBlockButton = page.locator('[data-test-id="new-block-button"]');
    this.blockMenu = page.locator('[data-test-id="block-menu"]');
    
    // Sidebar and navigation
    this.sidebar = page.locator('[data-test-id="sidebar"]');
    this.shareButton = page.getByRole('button', { name: 'Share' });
    this.templateButton = page.getByRole('button', { name: 'Templates' });
    this.updatesButton = page.getByRole('button', { name: 'Updates' });
    
    // Block types
    this.textBlock = page.locator('[data-block-type="text"]');
    this.headingBlock = page.locator('[data-block-type="heading"]');
    this.todoBlock = page.locator('[data-block-type="todo"]');
    this.bulletBlock = page.locator('[data-block-type="bulleted_list"]');
    this.numberedBlock = page.locator('[data-block-type="numbered_list"]');
    this.codeBlock = page.locator('[data-block-type="code"]');
    this.quoteBlock = page.locator('[data-block-type="quote"]');
    
    // Formatting toolbar
    this.formatToolbar = page.locator('[data-test-id="format-toolbar"]');
    this.boldButton = page.getByRole('button', { name: 'Bold' });
    this.italicButton = page.getByRole('button', { name: 'Italic' });
    this.underlineButton = page.getByRole('button', { name: 'Underline' });
    this.strikethroughButton = page.getByRole('button', { name: 'Strikethrough' });
    this.codeButton = page.getByRole('button', { name: 'Code' });
    this.linkButton = page.getByRole('button', { name: 'Link' });
  }

  async waitForPageLoad() {
    // Wait for the Notion page to be fully loaded
    await expect(this.editor).toBeVisible({ timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
    
    // Wait for Notion-specific loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingSpinner = document.querySelector('[data-test-id="loading-spinner"]');
      return loadingSpinner === null;
    });
  }

  async setPageTitle(title) {
    await this.titleInput.click();
    await this.titleInput.fill(title);
    await this.page.keyboard.press('Enter');
    
    // Verify title was set
    await expect(this.titleInput).toHaveText(title);
  }

  async addTextBlock(text) {
    // Click at the end of the page to create a new block
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type(text);
    
    // Verify text was added
    await expect(this.page.locator(`text=${text}`)).toBeVisible();
  }

  async addHeading(text, level = 1) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    
    // Type the heading syntax
    const headingPrefix = '#'.repeat(level) + ' ';
    await this.page.keyboard.type(headingPrefix + text);
    
    // Verify heading was created
    const headingSelector = `h${level}:has-text("${text}")`;
    await expect(this.page.locator(headingSelector)).toBeVisible();
  }

  async addBulletList(items) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    
    for (let i = 0; i < items.length; i++) {
      if (i === 0) {
        await this.page.keyboard.type('• ' + items[i]);
      } else {
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type('• ' + items[i]);
      }
    }
    
    // Verify list was created
    for (const item of items) {
      await expect(this.page.locator(`text=${item}`)).toBeVisible();
    }
  }

  async addNumberedList(items) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    
    for (let i = 0; i < items.length; i++) {
      if (i === 0) {
        await this.page.keyboard.type(`1. ${items[i]}`);
      } else {
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type(`${i + 1}. ${items[i]}`);
      }
    }
    
    // Verify list was created
    for (const item of items) {
      await expect(this.page.locator(`text=${item}`)).toBeVisible();
    }
  }

  async addTodoList(items) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    
    for (let i = 0; i < items.length; i++) {
      if (i === 0) {
        await this.page.keyboard.type('[] ' + items[i]);
      } else {
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type('[] ' + items[i]);
      }
    }
    
    // Verify todos were created
    for (const item of items) {
      await expect(this.page.locator(`text=${item}`)).toBeVisible();
    }
  }

  async addCodeBlock(code, language = 'javascript') {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type('```' + language);
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type(code);
    
    // Verify code block was created
    await expect(this.codeBlock).toBeVisible();
  }

  async addQuote(text) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type('> ' + text);
    
    // Verify quote was created
    await expect(this.quoteBlock).toBeVisible();
  }

  async addTable(rows = 3, cols = 3) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type('/table');
    await this.page.keyboard.press('Enter');
    
    // Verify table was created
    await expect(this.page.locator('table')).toBeVisible();
  }

  async addDatabase(name, properties = []) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type('/database');
    await this.page.keyboard.press('Enter');
    
    // Set database name
    await this.page.locator('[data-test-id="database-title"]').fill(name);
    
    // Add properties if specified
    for (const property of properties) {
      await this.page.getByRole('button', { name: 'Add property' }).click();
      await this.page.locator('[data-test-id="property-name"]').fill(property.name);
      await this.page.locator('[data-test-id="property-type"]').selectOption(property.type);
      await this.page.keyboard.press('Enter');
    }
    
    // Verify database was created
    await expect(this.page.locator('[data-test-id="database"]')).toBeVisible();
  }

  async formatSelectedText(formatting) {
    // Select some text first (this assumes text is already selected)
    switch (formatting.toLowerCase()) {
      case 'bold':
        await this.page.keyboard.press('Control+B');
        break;
      case 'italic':
        await this.page.keyboard.press('Control+I');
        break;
      case 'underline':
        await this.page.keyboard.press('Control+U');
        break;
      case 'strikethrough':
        await this.page.keyboard.press('Control+Shift+S');
        break;
      case 'code':
        await this.page.keyboard.press('Control+E');
        break;
      default:
        throw new Error(`Unsupported formatting: ${formatting}`);
    }
  }

  async selectTextAndFormat(text, formatting) {
    // Find and select the text
    await this.page.locator(`text=${text}`).first().click();
    await this.page.keyboard.press('Control+A');
    
    await this.formatSelectedText(formatting);
  }

  async addLink(text, url) {
    await this.editor.click();
    await this.page.keyboard.type(text);
    
    // Select the text
    await this.page.keyboard.press('Control+A');
    
    // Add link
    await this.page.keyboard.press('Control+K');
    await this.page.locator('[data-test-id="link-url-input"]').fill(url);
    await this.page.keyboard.press('Enter');
    
    // Verify link was created
    await expect(this.page.locator(`a[href="${url}"]`)).toBeVisible();
  }

  async addImage(imageUrl) {
    await this.editor.click();
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.type('/image');
    await this.page.keyboard.press('Enter');
    
    // Add image URL
    await this.page.locator('[data-test-id="image-url-input"]').fill(imageUrl);
    await this.page.keyboard.press('Enter');
    
    // Verify image was added
    await expect(this.page.locator(`img[src*="${imageUrl}"]`)).toBeVisible();
  }

  async sharePageWithEmail(email, permission = 'edit') {
    await this.shareButton.click();
    await this.page.getByLabel('Invite people').fill(email);
    
    // Select permission level
    const permissionDropdown = this.page.locator('[data-test-id="permission-select"]');
    await permissionDropdown.click();
    await this.page.getByRole('option', { name: permission }).click();
    
    await this.page.getByRole('button', { name: 'Invite' }).click();
    
    // Verify sharing dialog appeared
    await expect(this.page.locator('[data-test-id="share-dialog"]')).toBeVisible();
  }

  async duplicatePage() {
    await this.page.getByRole('button', { name: 'More' }).click();
    await this.page.getByText('Duplicate').click();
    
    // Verify page was duplicated (new page should load)
    await this.waitForPageLoad();
  }

  async exportPage(format = 'pdf') {
    await this.page.getByRole('button', { name: 'More' }).click();
    await this.page.getByText('Export').click();
    
    const formatMap = {
      'pdf': 'PDF',
      'html': 'HTML',
      'markdown': 'Markdown'
    };
    
    await this.page.getByRole('button', { name: formatMap[format] || 'PDF' }).click();
    await this.page.getByRole('button', { name: 'Export' }).click();
  }

  async getPageContent() {
    return await this.editor.textContent();
  }

  async searchInPage(query) {
    await this.page.keyboard.press('Control+F');
    await this.page.locator('[data-test-id="search-input"]').fill(query);
    
    // Return search results count
    const resultsCount = await this.page.locator('[data-test-id="search-results-count"]').textContent();
    return parseInt(resultsCount) || 0;
  }

  async isLoggedIn() {
    try {
      // Check if we can see the sidebar (only visible when logged in)
      await expect(this.sidebar).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifyContentExists(content) {
    await expect(this.page.locator(`text=${content}`)).toBeVisible();
  }
}

module.exports = NotionPage; 