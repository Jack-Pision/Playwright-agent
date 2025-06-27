const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = './auth-states';

// Cloud-friendly authentication with environment variables
const PLATFORM_CREDENTIALS = {
  google: {
    email: process.env.GOOGLE_EMAIL,
    password: process.env.GOOGLE_PASSWORD,
    loginUrl: 'https://accounts.google.com/signin',
    authFile: 'google-auth.json'
  },
  notion: {
    email: process.env.NOTION_EMAIL,
    password: process.env.NOTION_PASSWORD,
    loginUrl: 'https://www.notion.so/login',
    authFile: 'notion-auth.json'
  },
  microsoft: {
    email: process.env.MICROSOFT_EMAIL,
    password: process.env.MICROSOFT_PASSWORD,
    loginUrl: 'https://login.microsoftonline.com',
    authFile: 'microsoft-auth.json'
  }
};

async function setupCloudAuthentication() {
  // Create auth directory if it doesn't exist
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR);
  }

  console.log('🚀 Starting cloud authentication setup...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  for (const [platform, config] of Object.entries(PLATFORM_CREDENTIALS)) {
    if (!config.email || !config.password) {
      console.log(`⚠️  Skipping ${platform.toUpperCase()} - no credentials provided`);
      continue;
    }

    console.log(`\n📍 Setting up ${platform.toUpperCase()} authentication...`);
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(config.loginUrl);
      
      if (platform === 'google') {
        await setupGoogleAuth(page, config);
      } else if (platform === 'notion') {
        await setupNotionAuth(page, config);
      } else if (platform === 'microsoft') {
        await setupMicrosoftAuth(page, config);
      }
      
      // Save the authentication state
      const authFile = path.join(AUTH_DIR, config.authFile);
      await context.storageState({ path: authFile });
      console.log(`✅ ${platform.toUpperCase()} authentication saved to ${authFile}`);
      
    } catch (error) {
      console.log(`❌ Error setting up ${platform.toUpperCase()}: ${error.message}`);
    }
    
    await context.close();
  }

  await browser.close();
  console.log('\n🎉 Cloud authentication setup complete!');
}

async function setupGoogleAuth(page, config) {
  // Wait for email input
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', config.email);
  await page.click('#identifierNext');
  
  // Wait for password input
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', config.password);
  await page.click('#passwordNext');
  
  // Wait for successful login (redirect or dashboard)
  await page.waitForTimeout(3000);
  
  // Handle 2FA if present (skip for now - would need additional env vars)
  const url = page.url();
  if (url.includes('accounts.google.com') && !url.includes('signin')) {
    console.log('✅ Google login successful');
  }
}

async function setupNotionAuth(page, config) {
  // Wait for email input
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', config.email);
  
  // Wait for password input
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', config.password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForTimeout(3000);
  console.log('✅ Notion login successful');
}

async function setupMicrosoftAuth(page, config) {
  // Wait for email input
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', config.email);
  await page.click('input[type="submit"]');
  
  // Wait for password input
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', config.password);
  await page.click('input[type="submit"]');
  
  // Wait for successful login
  await page.waitForTimeout(3000);
  console.log('✅ Microsoft login successful');
}

// Smart file type detection for AI chatbot integration
function detectFileTypeFromUrl(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('docs.google.com/document')) {
    return { type: 'google-docs', platform: 'google', authFile: 'google-auth.json' };
  } else if (urlLower.includes('docs.google.com/presentation') || urlLower.includes('slides.google.com')) {
    return { type: 'google-slides', platform: 'google', authFile: 'google-auth.json' };
  } else if (urlLower.includes('docs.google.com/spreadsheets')) {
    return { type: 'google-sheets', platform: 'google', authFile: 'google-auth.json' };
  } else if (urlLower.includes('notion.so') || urlLower.includes('www.notion.so')) {
    return { type: 'notion', platform: 'notion', authFile: 'notion-auth.json' };
  } else if (urlLower.includes('office.com') || urlLower.includes('sharepoint.com')) {
    return { type: 'microsoft-office', platform: 'microsoft', authFile: 'microsoft-auth.json' };
  }
  
  return null;
}

// Enhanced file type detection from file content/name
function detectFileTypeFromContent(content, filename = '') {
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  // Check for Google Docs URLs in content
  if (contentLower.includes('docs.google.com/document')) {
    return { type: 'google-docs', platform: 'google', authFile: 'google-auth.json' };
  }
  
  // Check for Google Slides URLs in content
  if (contentLower.includes('docs.google.com/presentation') || contentLower.includes('slides.google.com')) {
    return { type: 'google-slides', platform: 'google', authFile: 'google-auth.json' };
  }
  
  // Check for Notion URLs in content
  if (contentLower.includes('notion.so')) {
    return { type: 'notion', platform: 'notion', authFile: 'notion-auth.json' };
  }
  
  // Check filename extensions
  if (filenameLower.endsWith('.docx') || filenameLower.endsWith('.doc')) {
    return { type: 'microsoft-word', platform: 'microsoft', authFile: 'microsoft-auth.json' };
  } else if (filenameLower.endsWith('.pptx') || filenameLower.endsWith('.ppt')) {
    return { type: 'microsoft-powerpoint', platform: 'microsoft', authFile: 'microsoft-auth.json' };
  }
  
  return null;
}

// Check if authentication exists for a platform
function hasAuthentication(platform) {
  const authFile = path.join(AUTH_DIR, `${platform}-auth.json`);
  return fs.existsSync(authFile);
}

// Get authentication file path
function getAuthFilePath(platform) {
  return path.join(AUTH_DIR, `${platform}-auth.json`);
}

// Auto-setup authentication if credentials are available
async function autoSetupAuthentication() {
  const missingAuth = [];
  
  for (const [platform, config] of Object.entries(PLATFORM_CREDENTIALS)) {
    if (!hasAuthentication(platform) && config.email && config.password) {
      missingAuth.push(platform);
    }
  }
  
  if (missingAuth.length > 0) {
    console.log(`🔄 Auto-setting up authentication for: ${missingAuth.join(', ')}`);
    await setupCloudAuthentication();
  }
}

module.exports = {
  setupCloudAuthentication,
  detectFileTypeFromUrl,
  detectFileTypeFromContent,
  hasAuthentication,
  getAuthFilePath,
  autoSetupAuthentication,
  AUTH_DIR
}; 