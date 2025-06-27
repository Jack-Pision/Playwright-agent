const { expect } = require('@playwright/test');

class GoogleSlidesPage {
  constructor(page) {
    this.page = page;
    
    // Main slide editing area
    this.slideCanvas = page.locator('#canvas');
    this.currentSlide = page.locator('.punch-present-slide-container');
    this.slideEditor = page.locator('[data-test-id="slide-editor"]');
    
    // Slide navigation
    this.slideNavigator = page.locator('[data-test-id="slide-navigator"]');
    this.slideList = page.locator('[data-test-id="slide-list"]');
    this.addSlideButton = page.getByRole('button', { name: 'New slide' });
    
    // Text boxes and content
    this.titlePlaceholder = page.getByText('Click to add title');
    this.subtitlePlaceholder = page.getByText('Click to add subtitle');
    this.textBox = page.locator('[data-test-id="text-box"]');
    this.selectedTextBox = page.locator('[data-test-id="text-box"][data-selected="true"]');
    
    // Toolbar and menus
    this.toolbar = page.locator('[role="toolbar"]');
    this.fileMenu = page.getByRole('menuitem', { name: 'File' });
    this.editMenu = page.getByRole('menuitem', { name: 'Edit' });
    this.viewMenu = page.getByRole('menuitem', { name: 'View' });
    this.insertMenu = page.getByRole('menuitem', { name: 'Insert' });
    this.slideMenu = page.getByRole('menuitem', { name: 'Slide' });
    this.formatMenu = page.getByRole('menuitem', { name: 'Format' });
    
    // Formatting tools
    this.boldButton = page.getByRole('button', { name: 'Bold' });
    this.italicButton = page.getByRole('button', { name: 'Italic' });
    this.underlineButton = page.getByRole('button', { name: 'Underline' });
    this.fontSizeSelect = page.locator('[aria-label*="Font size"]');
    this.fontFamilySelect = page.locator('[aria-label*="Font family"]');
    this.textColorButton = page.getByRole('button', { name: 'Text color' });
    this.fillColorButton = page.getByRole('button', { name: 'Fill color' });
    
    // Presentation controls
    this.presentButton = page.getByRole('button', { name: 'Present' });
    this.shareButton = page.getByRole('button', { name: 'Share' });
    this.commentButton = page.getByRole('button', { name: 'Comments' });
    
    // Slide layouts and themes
    this.layoutButton = page.getByRole('button', { name: 'Layout' });
    this.themeButton = page.getByRole('button', { name: 'Theme' });
    this.transitionButton = page.getByRole('button', { name: 'Transition' });
  }

  async waitForPresentationLoad() {
    // Wait for Google Slides to be fully loaded
    await expect(this.slideCanvas).toBeVisible({ timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
    
    // Wait for the slide navigator to be visible
    await expect(this.slideNavigator).toBeVisible();
    
    // Additional wait for Google Slides specific loading
    await this.page.waitForFunction(() => {
      return document.querySelector('#canvas') !== null;
    });
  }

  async clickTitle() {
    await this.titlePlaceholder.click();
  }

  async setSlideTitle(title) {
    await this.titlePlaceholder.click();
    await this.page.keyboard.selectAll();
    await this.page.keyboard.type(title);
    
    // Click outside to confirm
    await this.slideCanvas.click({ position: { x: 100, y: 100 } });
    
    // Verify title was set
    await expect(this.page.locator(`text=${title}`)).toBeVisible();
  }

  async setSlideSubtitle(subtitle) {
    await this.subtitlePlaceholder.click();
    await this.page.keyboard.selectAll();
    await this.page.keyboard.type(subtitle);
    
    // Click outside to confirm
    await this.slideCanvas.click({ position: { x: 100, y: 100 } });
    
    // Verify subtitle was set
    await expect(this.page.locator(`text=${subtitle}`)).toBeVisible();
  }

  async addTextBox(text, x = 300, y = 300) {
    // Insert text box
    await this.insertMenu.click();
    await this.page.getByText('Text box').click();
    
    // Click on slide to place text box
    await this.slideCanvas.click({ position: { x, y } });
    
    // Type text
    await this.page.keyboard.type(text);
    
    // Click outside to confirm
    await this.slideCanvas.click({ position: { x: 100, y: 100 } });
    
    // Verify text was added
    await expect(this.page.locator(`text=${text}`)).toBeVisible();
  }

  async selectTextBox(text) {
    await this.page.locator(`text=${text}`).click();
    
    // Verify text box is selected
    await expect(this.selectedTextBox).toBeVisible();
  }

  async formatSelectedText(formatting) {
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

  async changeTextColor(color) {
    await this.textColorButton.click();
    await this.page.locator(`[data-color="${color}"]`).click();
  }

  async changeFontSize(size) {
    await this.fontSizeSelect.click();
    await this.page.getByRole('option', { name: size.toString() }).click();
  }

  async changeFontFamily(font) {
    await this.fontFamilySelect.click();
    await this.page.getByRole('option', { name: font }).click();
  }

  async addNewSlide(layout = 'title_and_content') {
    await this.addSlideButton.click();
    
    // Select layout if specified
    if (layout !== 'title_and_content') {
      const layoutMap = {
        'title_only': 'Title only',
        'blank': 'Blank',
        'caption': 'Caption',
        'two_content': 'Two content',
        'content_with_caption': 'Content with caption'
      };
      
      await this.page.getByText(layoutMap[layout] || 'Title and content').click();
    }
    
    // Wait for new slide to be added
    await expect(this.currentSlide).toBeVisible();
  }

  async navigateToSlide(slideNumber) {
    const slideThumb = this.page.locator(`[data-slide-number="${slideNumber}"]`);
    await slideThumb.click();
    
    // Verify slide is selected
    await expect(slideThumb).toHaveClass(/selected/);
  }

  async deleteSlide(slideNumber) {
    await this.navigateToSlide(slideNumber);
    await this.page.keyboard.press('Delete');
    
    // Confirm deletion if dialog appears
    const confirmButton = this.page.getByRole('button', { name: 'Delete' });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async duplicateSlide(slideNumber) {
    await this.navigateToSlide(slideNumber);
    await this.slideMenu.click();
    await this.page.getByText('Duplicate slide').click();
    
    // Verify slide was duplicated
    const slideCount = await this.slideList.locator('[data-slide-number]').count();
    expect(slideCount).toBeGreaterThan(slideNumber);
  }

  async addImage(imagePath, x = 400, y = 300) {
    await this.insertMenu.click();
    await this.page.getByText('Image').click();
    await this.page.getByText('Upload from computer').click();
    
    // Handle file upload
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
    
    // Wait for image to be uploaded and placed
    await expect(this.page.locator('img')).toBeVisible();
  }

  async addShape(shapeType = 'rectangle', x = 300, y = 300) {
    await this.insertMenu.click();
    await this.page.getByText('Shape').click();
    
    const shapeMap = {
      'rectangle': 'Rectangle',
      'circle': 'Circle',
      'triangle': 'Triangle',
      'arrow': 'Arrow',
      'star': 'Star'
    };
    
    await this.page.getByText(shapeMap[shapeType] || 'Rectangle').click();
    
    // Click and drag to create shape
    await this.slideCanvas.click({ position: { x, y } });
    await this.page.mouse.down();
    await this.page.mouse.move(x + 100, y + 100);
    await this.page.mouse.up();
    
    // Verify shape was added
    await expect(this.page.locator('[data-shape-type]')).toBeVisible();
  }

  async addChart(chartType = 'column') {
    await this.insertMenu.click();
    await this.page.getByText('Chart').click();
    
    const chartMap = {
      'column': 'Column',
      'line': 'Line',
      'pie': 'Pie',
      'bar': 'Bar',
      'scatter': 'Scatter'
    };
    
    await this.page.getByText(chartMap[chartType] || 'Column').click();
    
    // Verify chart was added
    await expect(this.page.locator('[data-chart-type]')).toBeVisible();
  }

  async changeSlideLayout(layout) {
    await this.layoutButton.click();
    
    const layoutMap = {
      'title_and_content': 'Title and content',
      'title_only': 'Title only',
      'blank': 'Blank',
      'caption': 'Caption',
      'two_content': 'Two content'
    };
    
    await this.page.getByText(layoutMap[layout] || 'Title and content').click();
  }

  async changeTheme(themeName) {
    await this.themeButton.click();
    await this.page.getByText(themeName).click();
    
    // Wait for theme to be applied
    await this.page.waitForTimeout(2000);
  }

  async addSlideTransition(transitionType = 'fade') {
    await this.transitionButton.click();
    
    const transitionMap = {
      'fade': 'Fade',
      'slide': 'Slide',
      'flip': 'Flip',
      'cube': 'Cube',
      'gallery': 'Gallery'
    };
    
    await this.page.getByText(transitionMap[transitionType] || 'Fade').click();
  }

  async startPresentation() {
    await this.presentButton.click();
    
    // Verify presentation mode started
    await expect(this.page.locator('[data-presentation-mode="true"]')).toBeVisible();
  }

  async sharePresentation(email, permission = 'editor') {
    await this.shareButton.click();
    await this.page.getByLabel('Add people and groups').fill(email);
    
    // Select permission level
    const permissionDropdown = this.page.locator('[aria-label*="permission"]');
    await permissionDropdown.click();
    await this.page.getByRole('menuitem', { name: permission }).click();
    
    await this.page.getByRole('button', { name: 'Send' }).click();
  }

  async addComment(text) {
    await this.commentButton.click();
    await this.page.getByLabel('Add a comment').fill(text);
    await this.page.getByRole('button', { name: 'Comment' }).click();
  }

  async exportPresentation(format = 'pdf') {
    await this.fileMenu.click();
    await this.page.getByText('Download').click();
    
    const formatMap = {
      'pdf': 'PDF Document (.pdf)',
      'pptx': 'Microsoft PowerPoint (.pptx)',
      'odp': 'OpenDocument Presentation (.odp)',
      'txt': 'Plain Text (.txt)',
      'jpeg': 'JPEG image (.jpg)',
      'png': 'PNG image (.png)',
      'svg': 'Scalable Vector Graphics (.svg)'
    };
    
    await this.page.getByText(formatMap[format] || formatMap['pdf']).click();
  }

  async getSlideCount() {
    return await this.slideList.locator('[data-slide-number]').count();
  }

  async getSlideContent(slideNumber) {
    await this.navigateToSlide(slideNumber);
    return await this.currentSlide.textContent();
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

  async verifyContentExists(content) {
    await expect(this.page.locator(`text=${content}`)).toBeVisible();
  }
}

module.exports = GoogleSlidesPage; 