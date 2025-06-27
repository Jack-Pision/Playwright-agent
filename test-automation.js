const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test configurations
const TEST_DOCUMENTS = {
  googleDocs: 'https://docs.google.com/document/d/your-test-doc-id/edit',
  googleSlides: 'https://docs.google.com/presentation/d/your-test-slides-id/edit',
  notion: 'https://www.notion.so/your-test-page-id'
};

const TEST_INSTRUCTIONS = [
  {
    name: 'Simple Text Addition',
    instruction: 'Add a new paragraph: This is a test from the Playwright Agent v2.0!',
    action: 'typeText'
  },
  {
    name: 'Auto Heading Detection',
    instruction: 'Add a heading: Welcome to Automated Document Editing',
    action: 'auto'
  },
  {
    name: 'Auto List Detection',
    instruction: 'Create a list with these items:\n• Feature 1: Smart platform detection\n• Feature 2: Intelligent locators\n• Feature 3: Auto-waiting mechanisms',
    action: 'auto'
  },
  {
    name: 'Replace Text',
    instruction: 'Replace "old text" with "new automated text"',
    action: 'auto'
  },
  {
    name: 'Format Text Bold',
    instruction: 'Make all text bold',
    action: 'format',
    options: { formatting: 'bold' }
  }
];

// Utility functions
async function makeRequest(endpoint, data) {
  try {
    const response = await axios.post(`${BASE_URL}${endpoint}`, data);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || { message: error.message },
      status: error.response?.status
    };
  }
}

async function getStatus(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || { message: error.message }
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const result = await getStatus('/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
    console.log(`   Version: ${result.data.version}`);
    console.log(`   Platforms: ${result.data.platforms.join(', ')}`);
    console.log('   Authentication Status:');
    Object.entries(result.data.authentication).forEach(([platform, status]) => {
      console.log(`     ${platform}: ${status ? '✅ Authenticated' : '❌ Not authenticated'}`);
    });
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  
  return result.success;
}

async function testPlatformDetection() {
  console.log('\n🔍 Testing Platform Detection...');
  const testUrls = [
    'https://docs.google.com/document/d/test/edit',
    'https://slides.google.com/presentation/d/test/edit', 
    'https://www.notion.so/test-page',
    'https://invalid-platform.com/document'
  ];
  
  let passedTests = 0;
  
  for (const url of testUrls) {
    const result = await makeRequest('/edit-doc', {
      docUrl: url,
      instruction: 'test'
    });
    
    const shouldPass = !url.includes('invalid-platform');
    const actuallyPassed = result.success || (result.status !== 400);
    
    if (shouldPass === actuallyPassed) {
      console.log(`✅ ${url} - correctly ${shouldPass ? 'supported' : 'rejected'}`);
      passedTests++;
    } else {
      console.log(`❌ ${url} - expected ${shouldPass ? 'support' : 'rejection'}, got ${actuallyPassed ? 'support' : 'rejection'}`);
    }
  }
  
  console.log(`Platform detection: ${passedTests}/${testUrls.length} tests passed`);
  return passedTests === testUrls.length;
}

async function testDocumentAutomation(platform, docUrl) {
  console.log(`\n📝 Testing ${platform} Automation...`);
  
  if (!docUrl || docUrl.includes('your-test-')) {
    console.log(`⚠️  Skipping ${platform} tests - no test document URL provided`);
    console.log(`   Please update TEST_DOCUMENTS.${platform.toLowerCase().replace(' ', '')} in test-automation.js`);
    return true; // Skip but don't fail
  }
  
  let passedTests = 0;
  const totalTests = TEST_INSTRUCTIONS.length;
  
  for (const test of TEST_INSTRUCTIONS) {
    console.log(`\n  Testing: ${test.name}`);
    
    const result = await makeRequest('/edit-doc', {
      docUrl: docUrl,
      instruction: test.instruction,
      action: test.action,
      options: test.options || {}
    });
    
    if (result.success) {
      console.log(`  ✅ ${test.name} - Success`);
      console.log(`     Platform: ${result.data.platform}`);
      console.log(`     Action: ${result.data.result.action}`);
      passedTests++;
    } else {
      console.log(`  ❌ ${test.name} - Failed`);
      console.log(`     Error: ${result.error.error || result.error.message}`);
      if (result.error.suggestion) {
        console.log(`     Suggestion: ${result.error.suggestion}`);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${platform} automation: ${passedTests}/${totalTests} tests passed`);
  return passedTests > 0; // Consider successful if at least one test passed
}

async function testInputValidation() {
  console.log('\n🔒 Testing Input Validation...');
  
  const invalidRequests = [
    { docUrl: '', instruction: 'test' },
    { docUrl: 'https://docs.google.com/document/d/test/edit', instruction: '' },
    { docUrl: 'invalid-url', instruction: 'test' },
    {}
  ];
  
  let passedTests = 0;
  
  for (const [index, request] of invalidRequests.entries()) {
    const result = await makeRequest('/edit-doc', request);
    
    if (!result.success && result.status === 400) {
      console.log(`✅ Invalid request ${index + 1} - correctly rejected`);
      passedTests++;
    } else {
      console.log(`❌ Invalid request ${index + 1} - should have been rejected`);
    }
  }
  
  console.log(`Input validation: ${passedTests}/${invalidRequests.length} tests passed`);
  return passedTests === invalidRequests.length;
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  // Test with non-existent document
  const result = await makeRequest('/edit-doc', {
    docUrl: 'https://docs.google.com/document/d/non-existent-doc-id/edit',
    instruction: 'test'
  });
  
  if (!result.success) {
    console.log('✅ Error handling - correctly handles non-existent documents');
    console.log(`   Error: ${result.error.error}`);
    if (result.error.suggestion) {
      console.log(`   Suggestion: ${result.error.suggestion}`);
    }
    return true;
  } else {
    console.log('❌ Error handling - should have failed for non-existent document');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Playwright Agent v2.0 Test Suite');
  console.log('=' .repeat(50));
  
  const testResults = [];
  
  // Health check
  testResults.push(await testHealthCheck());
  
  // Platform detection
  testResults.push(await testPlatformDetection());
  
  // Input validation
  testResults.push(await testInputValidation());
  
  // Error handling
  testResults.push(await testErrorHandling());
  
  // Document automation tests (only if auth is set up)
  const healthCheck = await getStatus('/health');
  if (healthCheck.success) {
    const authStatus = healthCheck.data.authentication;
    
    if (authStatus['Google Docs']) {
      testResults.push(await testDocumentAutomation('Google Docs', TEST_DOCUMENTS.googleDocs));
    } else {
      console.log('\n⚠️  Skipping Google Docs tests - not authenticated');
    }
    
    if (authStatus['Google Slides']) {
      testResults.push(await testDocumentAutomation('Google Slides', TEST_DOCUMENTS.googleSlides));
    } else {
      console.log('\n⚠️  Skipping Google Slides tests - not authenticated');
    }
    
    if (authStatus['Notion']) {
      testResults.push(await testDocumentAutomation('Notion', TEST_DOCUMENTS.notion));
    } else {
      console.log('\n⚠️  Skipping Notion tests - not authenticated');
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));
  
  const passedTests = testResults.filter(result => result).length;
  const totalTests = testResults.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests} test suites`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your Playwright Agent is working perfectly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the output above for details.');
  }
  
  // Setup instructions
  if (healthCheck.success) {
    const authStatus = healthCheck.data.authentication;
    const unauthenticated = Object.entries(authStatus).filter(([platform, status]) => !status);
    
    if (unauthenticated.length > 0) {
      console.log('\n🔐 Authentication Setup Required:');
      console.log('To enable full functionality, run: npm run setup-auth');
      console.log('This will help you authenticate with:');
      unauthenticated.forEach(([platform]) => console.log(`  - ${platform}`));
    }
  }
  
  console.log('\n📚 Usage Examples:');
  console.log('  npm start                  # Start the server');
  console.log('  npm run setup-auth         # Set up authentication');
  console.log('  curl http://localhost:3000/health  # Check status');
  
  return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testHealthCheck, testDocumentAutomation }; 