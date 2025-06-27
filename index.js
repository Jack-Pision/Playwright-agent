const express = require("express");
const { chromium } = require("playwright");

// Import Page Object Models
const GoogleDocsPage = require("./page-objects/GoogleDocsPage");
const NotionPage = require("./page-objects/NotionPage");
const GoogleSlidesPage = require("./page-objects/GoogleSlidesPage");

const app = express();
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for credentials

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

// New token-based authentication function
async function authenticateWithToken(browser, credentials) {
  console.log('🔐 Starting OAuth token authentication...');
  
  try {
    // Create a new context for authentication
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    // Method 1: Try to validate the token first
    console.log('📡 Validating OAuth token...');
    
    try {
      await page.goto(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${credentials.access_token}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      const tokenInfo = await page.evaluate(() => {
        try {
          const text = document.body.textContent;
          return JSON.parse(text);
        } catch {
          return null;
        }
      });

      if (!tokenInfo || tokenInfo.error) {
        throw new Error(`Token validation failed: ${tokenInfo?.error || 'Invalid token'}`);
      }

      console.log(`✅ Token validated for user: ${tokenInfo.email}`);
      
      // Method 2: Use the token to access Google APIs and establish session
      console.log('🔄 Establishing authenticated session...');
      
      // Navigate to Google accounts with the token
      await page.goto('https://accounts.google.com/signin/oauth/consent', {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Inject the token into the page context
      await page.evaluate((token) => {
        // Set the token in various storage locations
        localStorage.setItem('access_token', token);
        sessionStorage.setItem('access_token', token);
        
        // Override fetch to include the token
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
          };
          return originalFetch(url, options);
        };

        // Override XMLHttpRequest to include the token
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
          const xhr = new originalXHR();
          const originalOpen = xhr.open;
          xhr.open = function(method, url, ...args) {
            originalOpen.apply(this, [method, url, ...args]);
            this.setRequestHeader('Authorization', `Bearer ${token}`);
          };
          return xhr;
        };
      }, credentials.access_token);

      // Method 3: Navigate to Google Drive to establish the session
      console.log('🚀 Accessing Google Drive to establish session...');
      await page.goto('https://drive.google.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for potential redirects
      await page.waitForTimeout(3000);

      // Check if we're successfully authenticated
      const currentUrl = page.url();
      const isAuthenticated = await page.evaluate(() => {
        // Multiple checks for authentication
        const checks = [
          // Check if we're not on a login page
          !document.querySelector('input[type="email"]'),
          !document.querySelector('input[type="password"]'),
          !document.querySelector('#identifierId'),
          
          // Check for Google Drive UI elements
          document.querySelector('[data-target="drive"]') !== null,
          document.querySelector('[role="main"]') !== null,
          document.querySelector('.a-s-fa-Ha-pa') !== null,
          
          // Check for Google bar
          document.querySelector('#gb') !== null,
          
          // Check URL doesn't contain signin
          !window.location.href.includes('signin'),
          !window.location.href.includes('accounts.google.com/signin')
        ];
        
        // Return true if any of the positive checks pass
        return checks.some(check => check === true);
      });

      console.log(`🔍 Authentication check - URL: ${currentUrl}, Authenticated: ${isAuthenticated}`);

      if (isAuthenticated || !currentUrl.includes('accounts.google.com/signin')) {
        console.log('✅ OAuth authentication successful');
        return context;
      } else {
        // Method 4: Fallback - try to use Google's OAuth2 playground approach
        console.log('⚠️ Trying fallback authentication method...');
        
        await page.goto(`https://developers.google.com/oauthplayground/`, {
          waitUntil: 'networkidle'
        });

        // Try to inject the token and navigate to Google services
        await page.evaluate((token) => {
          document.cookie = `oauth_token=${token}; domain=.google.com; path=/`;
          localStorage.setItem('oauth_token', token);
        }, credentials.access_token);

        // Navigate back to Google Drive
        await page.goto('https://drive.google.com', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        const finalCheck = await page.evaluate(() => {
          return !document.querySelector('input[type="email"]') && 
                 !window.location.href.includes('accounts.google.com/signin');
        });

        if (finalCheck) {
          console.log('✅ Fallback authentication successful');
          return context;
        } else {
          throw new Error('All authentication methods failed - token may be invalid or expired');
        }
      }

    } catch (tokenError) {
      console.error('❌ Token validation failed:', tokenError.message);
      throw new Error(`OAuth token authentication failed: ${tokenError.message}`);
    }

  } catch (error) {
    console.error('❌ OAuth authentication failed:', error.message);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Enhanced document editing endpoint for AI chatbot integration
app.post("/edit-doc", async (req, res) => {
  const { docUrl, instruction, credentials, authState } = req.body;

  if (!docUrl || !instruction) {
    return res.status(400).json({
      error: "The 'docUrl' and 'instruction' are required in the request body."
    });
  }

  // Check for credentials (new OAuth method) or authState (legacy method)
  if (!credentials && !authState) {
    return res.status(401).json({
      error: "Authentication credentials are required. Please include either 'credentials' (OAuth tokens) or 'authState' object in your request.",
      login_required: true,
    });
  }

  const platform = detectPlatform(docUrl);
  if (!platform) {
    return res.status(400).json({ error: 'Unsupported document platform for the provided URL.' });
  }

  let browser;
  let context;
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    // Choose authentication method
    if (credentials && credentials.access_token) {
      console.log('🔑 Using OAuth token authentication');
      context = await authenticateWithToken(browser, credentials);
    } else if (authState) {
      console.log('🔑 Using legacy authState authentication');
      context = await browser.newContext({
        storageState: authState,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
    } else {
      throw new Error('No valid authentication method provided');
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    // Navigate to URL and wait for load
    console.log(`📄 Navigating to document: ${docUrl}`);
    await page.goto(docUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Create page object and execute instruction
    const docPage = new platform.PageClass(page);
    await docPage.waitForDocumentLoad();
    
    console.log(`🤖 Executing instruction: "${instruction}"`);
    
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
      url: docUrl,
      authMethod: credentials ? 'oauth' : 'legacy'
    });

  } catch (error) {
    console.error(`❌ Error during automation for ${docUrl}:`, error);
    res.status(500).json({
      error: `An error occurred during automation: ${error.message}`,
      details: error.stack,
      authMethod: credentials ? 'oauth' : 'legacy'
    });
  } finally {
    if (context) {
      await context.close();
      console.log('🔒 Browser context closed.');
    }
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed.');
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "2.1.0" });
});

// Test OAuth authentication endpoint
app.post("/test-auth", async (req, res) => {
  const { credentials } = req.body;

  if (!credentials || !credentials.access_token) {
    return res.status(400).json({
      error: "OAuth credentials with access_token are required for testing."
    });
  }

  let browser;
  let context;
  
  try {
    console.log('🧪 Testing OAuth authentication...');
    
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    context = await authenticateWithToken(browser, credentials);
    
    // Test if we can access Google Drive
    const page = await context.newPage();
    await page.goto('https://drive.google.com', { waitUntil: 'networkidle', timeout: 30000 });
    
    const authTest = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasEmailInput: !!document.querySelector('input[type="email"]'),
        hasGoogleBar: !!document.querySelector('#gb'),
        hasMainContent: !!document.querySelector('[role="main"]'),
        title: document.title
      };
    });

    res.json({
      success: true,
      message: "OAuth authentication test completed",
      authTest,
      authenticated: !authTest.hasEmailInput && !authTest.url.includes('accounts.google.com/signin')
    });

  } catch (error) {
    console.error('❌ OAuth test failed:', error);
    res.status(500).json({
      success: false,
      error: `OAuth authentication test failed: ${error.message}`,
      details: error.stack
    });
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Playwright automation agent running on port ${PORT}`);
  console.log(`📋 Supported authentication methods: OAuth tokens, Legacy authState`);
});
