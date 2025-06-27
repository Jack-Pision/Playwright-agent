const express = require("express");
const { chromium } = require("playwright");

// Import Page Object Models
const GoogleDocsPage = require("./page-objects/GoogleDocsPage");
const NotionPage = require("./page-objects/NotionPage");
const GoogleSlidesPage = require("./page-objects/GoogleSlidesPage");

const app = express();
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for authState

// Constants
const SUPPORTED_PLATFORMS = {
  'docs.google.com': { name: 'Google Docs', PageClass: GoogleDocsPage },
  'slides.google.com': { name: 'Google Slides', PageClass: GoogleSlidesPage },
  'notion.so': { name: 'Notion', PageClass: NotionPage },
  'www.notion.so': { name: 'Notion', PageClass: NotionPage }
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

// Enhanced document editing endpoint for AI chatbot integration
app.post("/edit-doc", async (req, res) => {
  const { docUrl, instruction, authState } = req.body;

  if (!docUrl || !instruction) {
    return res.status(400).json({
      error: "The 'docUrl' and 'instruction' are required in the request body."
    });
  }

  if (!authState) {
    return res.status(401).json({
      error: "Authentication credentials are required. Please include the 'authState' object in your request.",
      login_required: true,
    });
  }

  const platform = detectPlatform(docUrl);
  if (!platform) {
    return res.status(400).json({ error: 'Unsupported document platform for the provided URL.' });
  }

  let context;
  try {
    // Launch browser with provided auth state
    context = await chromium.launchPersistentContext('', {
      headless: true,
      storageState: authState,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    // Navigate to URL and wait for load
    await page.goto(docUrl, { waitUntil: 'networkidle' });
    
    // Create page object and execute instruction
    const docPage = new platform.PageClass(page);
    await docPage.waitForDocumentLoad();
    
    console.log(`Executing instruction: "${instruction}"`);
    
    // Parse and execute the instruction
    if (instruction.toLowerCase().includes('type') || instruction.toLowerCase().includes('write')) {
      const text = instruction.replace(/type|write/gi, '').trim();
      await docPage.typeText(text);
    } else if (instruction.toLowerCase().includes('title')) {
      const title = instruction.replace(/title/gi, '').trim();
      await docPage.changeDocumentTitle(title);
    } else {
      // Default to typing the instruction as text
      await docPage.typeText(instruction);
    }

    res.json({ 
      success: true, 
      message: `Successfully executed instruction on ${platform.name}.`,
      platform: platform.name,
      url: docUrl
    });

  } catch (error) {
    console.error(`Error during automation for ${docUrl}:`, error);
    res.status(500).json({
      error: `An error occurred during automation: ${error.message}`,
      details: error.stack
    });
  } finally {
    if (context) {
      await context.close();
      console.log('Browser context closed.');
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "2.0.0" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Playwright automation agent running on port ${PORT}`);
});
