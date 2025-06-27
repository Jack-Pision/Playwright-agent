const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = './auth-states';
const PLATFORMS = {
  google: 'https://accounts.google.com',
  notion: 'https://www.notion.so/login',
  microsoft: 'https://login.microsoftonline.com'
};

async function setupAuthentication() {
  // Create auth directory if it doesn't exist
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR);
  }

  console.log('🚀 Starting authentication setup...\n');
  console.log('This will open browser windows for you to manually log in to each platform.');
  console.log('After logging in, close the browser tab to save the session.\n');

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });

  for (const [platform, loginUrl] of Object.entries(PLATFORMS)) {
    console.log(`\n📍 Setting up ${platform.toUpperCase()} authentication...`);
    console.log(`Opening ${loginUrl}`);
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(loginUrl);
      
      // Wait for user to manually log in
      console.log(`\n⏳ Please log in to ${platform.toUpperCase()} in the browser window.`);
      console.log('After successful login, close this browser tab to continue...');
      
      // Wait for the page to be closed by user
      await page.waitForEvent('close', { timeout: 300000 }); // 5 minutes timeout
      
    } catch (error) {
      if (error.message.includes('Page closed')) {
        // This is expected when user closes the tab
        console.log(`✅ ${platform.toUpperCase()} login completed!`);
        
        // Save the authentication state
        const authFile = path.join(AUTH_DIR, `${platform}-auth.json`);
        await context.storageState({ path: authFile });
        console.log(`💾 Authentication state saved to ${authFile}`);
        
      } else if (error.message.includes('Timeout')) {
        console.log(`❌ Timeout waiting for ${platform.toUpperCase()} login. Skipping...`);
      } else {
        console.log(`❌ Error setting up ${platform.toUpperCase()}: ${error.message}`);
      }
    }
    
    await context.close();
  }

  await browser.close();
  
  console.log('\n🎉 Authentication setup complete!');
  console.log('You can now run your automation scripts with saved login states.');
  console.log('\n📁 Auth files saved in:', AUTH_DIR);
  
  // List saved auth files
  const authFiles = fs.readdirSync(AUTH_DIR).filter(f => f.endsWith('-auth.json'));
  if (authFiles.length > 0) {
    console.log('\n📋 Available authentication states:');
    authFiles.forEach(file => {
      const platform = file.replace('-auth.json', '');
      console.log(`  ✓ ${platform.toUpperCase()}`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  setupAuthentication().catch(console.error);
}

module.exports = { setupAuthentication, AUTH_DIR }; 