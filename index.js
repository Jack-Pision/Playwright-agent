const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { getCredentials, saveCredentials } = require('./supabase-service');

// Import Page Object Models
const GoogleDocsPage = require("./page-objects/GoogleDocsPage");
const NotionPage = require("./page-objects/NotionPage");
const GoogleSlidesPage = require("./page-objects/GoogleSlidesPage");

// Import cloud authentication system
const {
  detectFileTypeFromUrl,
  detectFileTypeFromContent,
  hasAuthentication,
  getAuthFilePath,
  autoSetupAuthentication
} = require("./cloud-auth");

const app = express();
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for authState

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

// Helper functions for smart detection
function getPlatformName(fileType) {
  const typeMap = {
    'google-docs': 'Google Docs',
    'google-slides': 'Google Slides',
    'google-sheets': 'Google Sheets',
    'notion': 'Notion',
    'microsoft-word': 'Microsoft Word',
    'microsoft-powerpoint': 'Microsoft PowerPoint',
    'microsoft-office': 'Microsoft Office'
  };
  return typeMap[fileType] || 'Unknown';
}

function getPageClass(fileType) {
  const classMap = {
    'google-docs': GoogleDocsPage,
    'google-slides': GoogleSlidesPage,
    'google-sheets': GoogleDocsPage, // Use docs page for sheets for now
    'notion': NotionPage,
    'microsoft-word': GoogleDocsPage, // Similar interface
    'microsoft-powerpoint': GoogleSlidesPage, // Similar interface
    'microsoft-office': GoogleDocsPage
  };
  return classMap[fileType] || GoogleDocsPage;
}

// Cloud-optimized browser context setup with auto-authentication
async function createAuthenticatedContext(platform) {
  // Try auto-setup authentication if missing and credentials available
  if (!hasAuthentication(platform.authFile.replace('-auth.json', ''))) {
    console.log(`🔄 Auto-setting up authentication for ${platform.name}...`);
    await autoSetupAuthentication();
  }

  const authFile = getAuthFilePath(platform.authFile.replace('-auth.json', ''));
  
  if (!fs.existsSync(authFile)) {
    throw new Error(`Authentication not configured for ${platform.name}. Please set environment variables: GOOGLE_EMAIL, GOOGLE_PASSWORD, NOTION_EMAIL, NOTION_PASSWORD, etc.`);
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
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

// Enhanced document editing endpoint for AI chatbot integration
app.post("/edit-doc", async (req, res) => {
  const { docUrl, instruction, userId } = req.body;

  if (!docUrl || !instruction || !userId) {
    return res.status(400).json({ 
      error: "docUrl, instruction, and userId are required.",
      example: {
        userId: "user_12345",
        docUrl: "https://docs.google.com/document/d/your-doc-id/edit",
        instruction: "Add a new paragraph with the text 'Hello World'",
      }
    });
  }

  const platform = detectPlatform(docUrl);
  if (!platform) {
    return res.status(400).json({ error: 'Unsupported document platform.' });
  }

  let browser;
  try {
    const authState = await getCredentials(userId, platform.type);

    if (!authState) {
      return res.status(401).json({
        error: `Authentication required for ${platform.name}.`,
        platform: platform.type,
        loginUrl: `https://your-chatbot-frontend.com/auth-handler?userId=${userId}&platform=${platform.type}`
      });
    }

    const context = await chromium.launchPersistentContext('', {
        headless: true,
        storageState: authState,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    const docPage = new platform.PageClass(page);

    console.log(`Navigating to document: ${docUrl}`);
    await docPage.navigate(docUrl);

    console.log(`Executing instruction: "${instruction}"`);
    await docPage.executeInstruction(instruction);

    res.json({ success: true, message: `Successfully executed instruction on ${platform.name}.` });
    
    await context.close();

  } catch (error) {
    console.error(`Error during /edit-doc: ${error.message}`);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
    if (browser) await browser.close();
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

// Enhanced health check endpoint with cloud deployment support
app.get("/health", (req, res) => {
  const authStatus = {};
  const envCredentials = {};
  
  // Check authentication status for each platform
  const platforms = ['google', 'notion', 'microsoft'];
  platforms.forEach(platform => {
    const platformName = getPlatformName(platform === 'google' ? 'google-docs' : platform);
    authStatus[platformName] = hasAuthentication(platform);
    envCredentials[platformName] = {
      hasEmail: !!process.env[`${platform.toUpperCase()}_EMAIL`],
      hasPassword: !!process.env[`${platform.toUpperCase()}_PASSWORD`]
    };
  });

  // Deployment environment detection
  const isRender = !!process.env.RENDER;
  const isLocal = process.env.NODE_ENV !== 'production' && !isRender;
  
  res.json({
    status: "healthy",
    version: "3.0.0-supabase",
    environment: {
      isRender,
      isLocal,
      deployment: isRender ? 'render' : isLocal ? 'local' : 'production'
    },
    platforms: ['Google Docs', 'Google Slides', 'Google Sheets', 'Notion', 'Microsoft Office'],
    authentication: authStatus,
    credentials: envCredentials,
    features: {
      smartFileDetection: true,
      aiChatbotIntegration: true,
      cloudDeployment: true,
      autoAuthentication: true
    },
    uptime: process.uptime(),
    supabase: {
      connected: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    timestamp: new Date().toISOString()
  });
});

// Smart file detection endpoint for AI chatbot integration
app.post("/detect-file", (req, res) => {
  const { url, content = '', filename = '', context = '' } = req.body;
  
  let detectedType = null;
  
  if (url) {
    detectedType = detectFileTypeFromUrl(url);
  } else if (content || filename) {
    detectedType = detectFileTypeFromContent(content, filename);
  }
  
  if (detectedType) {
    res.json({
      success: true,
      detected: {
        type: detectedType.type,
        platform: detectedType.platform,
        platformName: getPlatformName(detectedType.type),
        authFile: detectedType.authFile,
        isAuthenticated: hasAuthentication(detectedType.platform),
        canAutomate: hasAuthentication(detectedType.platform)
      },
      suggestions: getActionSuggestions(detectedType.type),
      examples: getExampleInstructions(detectedType.type)
    });
  } else {
    res.json({
      success: false,
      error: "Could not detect file type",
      supportedTypes: [
        'Google Docs (docs.google.com/document)',
        'Google Slides (docs.google.com/presentation)',
        'Google Sheets (docs.google.com/spreadsheets)',
        'Notion (notion.so)',
        'Microsoft Word (.docx, .doc)',
        'Microsoft PowerPoint (.pptx, .ppt)'
      ]
    });
  }
});

// Get supported platforms
app.get("/platforms", (req, res) => {
  const platforms = ['google', 'notion', 'microsoft'].map(platform => ({
    name: getPlatformName(platform === 'google' ? 'google-docs' : platform),
    platform: platform,
    authenticated: hasAuthentication(platform),
    hasCredentials: {
      email: !!process.env[`${platform.toUpperCase()}_EMAIL`],
      password: !!process.env[`${platform.toUpperCase()}_PASSWORD`]
    }
  }));
  
  res.json({
    platforms,
    total: platforms.length,
    authenticated: platforms.filter(p => p.authenticated).length,
    cloudReady: platforms.filter(p => p.hasCredentials.email && p.hasCredentials.password).length
  });
});

// Helper functions for AI suggestions
function getActionSuggestions(fileType) {
  const suggestions = {
    'google-docs': ['typeText', 'replaceAll', 'addHeading', 'format', 'findAndReplace'],
    'google-slides': ['setSlideTitle', 'addTextBox', 'addNewSlide', 'changeTheme'],
    'notion': ['addTextBlock', 'addHeading', 'addBulletList', 'addCodeBlock'],
    'microsoft-word': ['typeText', 'replaceAll', 'format'],
    'microsoft-powerpoint': ['setSlideTitle', 'addTextBox']
  };
  return suggestions[fileType] || ['auto'];
}

function getExampleInstructions(fileType) {
  const examples = {
    'google-docs': [
      'Add a heading: Project Overview',
      'Replace "old text" with "new text"',
      'Make all text bold',
      'Add a new paragraph with project details'
    ],
    'google-slides': [
      'Set slide title to: Welcome Presentation',
      'Add a text box with: Key Points',
      'Add a new slide with title layout',
      'Change theme to modern'
    ],
    'notion': [
      'Add a heading: Meeting Notes',
      'Create a bullet list with action items',
      'Add a code block with JavaScript',
      'Add a quote block with inspiration'
    ]
  };
  return examples[fileType] || ['Add text to document'];
}

// Endpoint for the chatbot to save new credentials to Supabase
app.post('/save-credentials', async (req, res) => {
  const { userId, platform, authState } = req.body;

  if (!userId || !platform || !authState) {
    return res.status(400).json({ error: 'userId, platform, and authState are required.' });
  }

  try {
    await saveCredentials(userId, platform, authState);
    res.status(201).json({ success: true, message: 'Credentials saved successfully.' });
  } catch (error) {
    console.error(`Error during /save-credentials: ${error.message}`);
    res.status(500).json({ error: `Failed to save credentials: ${error.message}` });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Playwright Agent (Supabase Edition) is running on port ${PORT}`);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ WARNING: Supabase environment variables are not set. The agent will not be able to connect to the database.');
  }
  console.log(`📋 Supported platforms: ${Object.values(SUPPORTED_PLATFORMS).map(p => p.name).join(', ')}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API Documentation: http://localhost:${PORT}/platforms`);
});
