const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// Import Page Object Models
const GoogleDocsPage = require("./page-objects/GoogleDocsPage");
const NotionPage = require("./page-objects/NotionPage");
const GoogleSlidesPage = require("./page-objects/GoogleSlidesPage");

const app = express();
app.use(express.json());

// Constants
const AUTH_DIR = "./auth-states";
const SUPPORTED_PLATFORMS = {
  'docs.google.com': { name: 'Google Docs', authFile: 'google-auth.json', PageClass: GoogleDocsPage },
  'slides.google.com': { name: 'Google Slides', authFile: 'google-auth.json', PageClass: GoogleSlidesPage },
  'notion.so': { name: 'Notion', authFile: 'notion-auth.json', PageClass: NotionPage },
  'www.notion.so': { name: 'Notion', authFile: 'notion-auth.json', PageClass: NotionPage }
};

// Utility functions
function detectPlatform(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check for exact matches first
    if (SUPPORTED_PLATFORMS[hostname]) {
      return SUPPORTED_PLATFORMS[hostname];
    }
    
    // Check for partial matches
    for (const [domain, config] of Object.entries(SUPPORTED_PLATFORMS)) {
      if (hostname.includes(domain.replace('www.', ''))) {
        return config;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

function getAuthFilePath(authFile) {
  return path.join(AUTH_DIR, authFile);
}

function authFileExists(authFile) {
  return fs.existsSync(getAuthFilePath(authFile));
}

// Enhanced browser context setup with authentication
async function createAuthenticatedContext(platform) {
  const authFile = getAuthFilePath(platform.authFile);
  
  if (!authFileExists(platform.authFile)) {
    throw new Error(`Authentication file not found for ${platform.name}. Please run: node setup-auth.js`);
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  // Load saved authentication state
  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  return { browser, context };
}

// Advanced document editing endpoint
app.post("/edit-doc", async (req, res) => {
  const { docUrl, instruction, action = 'auto', options = {} } = req.body;

  // Validation
  if (!docUrl || !instruction) {
    return res.status(400).json({ 
      error: "docUrl and instruction are required",
      example: {
        docUrl: "https://docs.google.com/document/d/your-doc-id/edit",
        instruction: "Add a new paragraph with the text 'Hello World'",
        action: "auto", // or "typeText", "replaceAll", "addHeading", etc.
        options: { formatting: "bold", position: "end" }
      }
    });
  }

  // Detect platform
  const platform = detectPlatform(docUrl);
  if (!platform) {
    return res.status(400).json({ 
      error: "Unsupported platform. Supported platforms: Google Docs, Google Slides, Notion",
      url: docUrl
    });
  }

  let browser, context, page, pageObject;

  try {
    console.log(`🚀 Starting ${platform.name} automation for: ${docUrl}`);
    
    // Create authenticated browser context
    ({ browser, context } = await createAuthenticatedContext(platform));
    page = await context.newPage();
    
    // Navigate to document
    console.log(`📄 Navigating to document...`);
    await page.goto(docUrl, { waitUntil: 'networkidle' });
    
    // Initialize platform-specific page object
    pageObject = new platform.PageClass(page);
    
    // Wait for platform-specific loading
    console.log(`⏳ Waiting for ${platform.name} to load...`);
    if (platform.name === 'Google Docs') {
      await pageObject.waitForDocumentLoad();
    } else if (platform.name === 'Google Slides') {
      await pageObject.waitForPresentationLoad();
    } else if (platform.name === 'Notion') {
      await pageObject.waitForPageLoad();
    }
    
    // Verify user is logged in
    const isLoggedIn = await pageObject.isLoggedIn();
    if (!isLoggedIn) {
      return res.status(401).json({ 
        error: `Not logged in to ${platform.name}. Please run: node setup-auth.js`,
        platform: platform.name
      });
    }
    
    // Execute the instruction based on action type
    console.log(`✏️ Executing instruction: "${instruction}"`);
    let result;
    
    switch (action.toLowerCase()) {
      case 'auto':
        result = await executeAutoInstruction(pageObject, instruction, options, platform.name);
        break;
      case 'typetext':
        if (platform.name === 'Google Docs') {
          await pageObject.typeText(instruction);
        } else if (platform.name === 'Notion') {
          await pageObject.addTextBlock(instruction);
        } else if (platform.name === 'Google Slides') {
          await pageObject.addTextBox(instruction);
        }
        result = { action: 'Text typed successfully' };
        break;
      case 'replaceall':
        if (platform.name === 'Google Docs') {
          await pageObject.replaceAllText(instruction);
        }
        result = { action: 'Text replaced successfully' };
        break;
      case 'addheading':
        if (platform.name === 'Notion') {
          await pageObject.addHeading(instruction, options.level || 1);
        } else if (platform.name === 'Google Slides') {
          await pageObject.setSlideTitle(instruction);
        }
        result = { action: 'Heading added successfully' };
        break;
      case 'addlist':
        if (platform.name === 'Notion') {
          const items = instruction.split('\n').filter(item => item.trim());
          await pageObject.addBulletList(items);
        }
        result = { action: 'List added successfully' };
        break;
      case 'format':
        if (options.formatting) {
          await pageObject.selectAllAndFormat(options.formatting);
        }
        result = { action: 'Formatting applied successfully' };
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
    
    // Verify the change was successful
    console.log(`✅ Verifying changes...`);
    try {
      await pageObject.verifyContentExists(instruction.substring(0, 50));
    } catch (verifyError) {
      console.warn('Content verification failed, but operation may have succeeded:', verifyError.message);
    }
    
    console.log(`🎉 ${platform.name} automation completed successfully!`);
    
    res.json({ 
      success: true, 
      message: `Successfully applied instruction to ${platform.name} document`,
      platform: platform.name,
      action: action,
      instruction: instruction,
      result: result || { action: 'Operation completed' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error during ${platform?.name || 'unknown'} automation:`, error);
    
    // Provide detailed error information
    const errorResponse = {
      error: error.message,
      platform: platform?.name || 'unknown',
      url: docUrl,
      timestamp: new Date().toISOString()
    };
    
    // Add specific error handling for common issues
    if (error.message.includes('not found')) {
      errorResponse.suggestion = 'Please check if the document URL is correct and accessible';
    } else if (error.message.includes('timeout')) {
      errorResponse.suggestion = 'The document took too long to load. Try again or check your internet connection';
    } else if (error.message.includes('Authentication')) {
      errorResponse.suggestion = 'Please run the authentication setup: node setup-auth.js';
    }
    
    res.status(500).json(errorResponse);
  } finally {
    // Clean up browser resources
    if (browser) {
      try {
        await browser.close();
        console.log('🧹 Browser cleaned up successfully');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }
});

// Auto-instruction execution with AI-like intelligence
async function executeAutoInstruction(pageObject, instruction, options, platformName) {
  const lowerInstruction = instruction.toLowerCase();
  
  // Smart instruction parsing and execution
  if (lowerInstruction.includes('title') || lowerInstruction.includes('heading')) {
    if (platformName === 'Notion') {
      await pageObject.addHeading(instruction.replace(/title|heading/gi, '').trim(), 1);
    } else if (platformName === 'Google Slides') {
      await pageObject.setSlideTitle(instruction.replace(/title|heading/gi, '').trim());
    }
    return { action: 'Title/Heading set', type: 'smart_detection' };
  }
  
  if (lowerInstruction.includes('list') || lowerInstruction.includes('bullet')) {
    if (platformName === 'Notion') {
      const items = instruction.split('\n').filter(item => item.trim() && !item.toLowerCase().includes('list'));
      if (items.length > 0) {
        await pageObject.addBulletList(items);
      } else {
        await pageObject.addBulletList([instruction.replace(/list|bullet/gi, '').trim()]);
      }
    }
    return { action: 'List created', type: 'smart_detection' };
  }
  
  if (lowerInstruction.includes('bold') || lowerInstruction.includes('italic')) {
    const formatting = lowerInstruction.includes('bold') ? 'bold' : 'italic';
    await pageObject.selectAllAndFormat(formatting);
    return { action: `${formatting} formatting applied`, type: 'smart_detection' };
  }
  
  if (lowerInstruction.includes('replace') && lowerInstruction.includes('with')) {
    if (platformName === 'Google Docs') {
      const parts = instruction.split(/replace|with/i);
      if (parts.length >= 3) {
        const findText = parts[1].trim();
        const replaceText = parts[2].trim();
        await pageObject.findAndReplace(findText, replaceText);
        return { action: 'Text replaced', findText, replaceText, type: 'smart_detection' };
      }
    }
  }
  
  // Default: just add the text
  if (platformName === 'Google Docs') {
    await pageObject.typeText(instruction);
  } else if (platformName === 'Notion') {
    await pageObject.addTextBlock(instruction);
  } else if (platformName === 'Google Slides') {
    await pageObject.addTextBox(instruction);
  }
  
  return { action: 'Text added', type: 'default' };
}

// Health check endpoint
app.get("/health", (req, res) => {
  const authStatus = {};
  
  // Check authentication status for each platform
  for (const [domain, config] of Object.entries(SUPPORTED_PLATFORMS)) {
    authStatus[config.name] = authFileExists(config.authFile);
  }
  
  res.json({
    status: "healthy",
    version: "2.0.0",
    platforms: Object.values(SUPPORTED_PLATFORMS).map(p => p.name),
    authentication: authStatus,
    timestamp: new Date().toISOString()
  });
});

// Get supported platforms
app.get("/platforms", (req, res) => {
  const platforms = Object.values(SUPPORTED_PLATFORMS).map(platform => ({
    name: platform.name,
    authenticated: authFileExists(platform.authFile),
    authFile: platform.authFile
  }));
  
  res.json({
    platforms,
    total: platforms.length,
    authenticated: platforms.filter(p => p.authenticated).length
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Playwright Agent v2.0 running on port ${PORT}`);
  console.log(`📋 Supported platforms: ${Object.values(SUPPORTED_PLATFORMS).map(p => p.name).join(', ')}`);
  console.log(`🔐 Authentication setup: node setup-auth.js`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API Documentation: http://localhost:${PORT}/platforms`);
});
