# Playwright Document Automation Agent v2.0

A powerful, intelligent document automation agent that can seamlessly edit Google Docs, Google Slides, and Notion pages without requiring API keys. Built with advanced Playwright techniques and smart locators for maximum reliability.

## 🚀 Features

### ✨ **What Makes This Powerful**

- **🎯 Smart Platform Detection**: Automatically detects Google Docs, Slides, or Notion from URLs
- **🔐 One-Time Authentication**: Set up login once, automate forever
- **🤖 AI-Like Instruction Processing**: Understands natural language instructions
- **🎪 Advanced Playwright Techniques**: Uses resilient locators and auto-waiting
- **📦 Page Object Models**: Clean, maintainable architecture
- **✅ Success Verification**: Confirms changes were actually applied
- **🛡️ Robust Error Handling**: Detailed error messages and recovery suggestions

### 📋 **Supported Platforms & Actions**

| Platform | Text Editing | Formatting | Lists | Comments | Sharing | Export |
|----------|--------------|------------|-------|----------|---------|---------|
| **Google Docs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Google Slides** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Notion** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

## 🔧 Installation & Setup

### 1. **Install Dependencies**

```bash
# Install all required packages
npm install

# Install Playwright browsers
npx playwright install chromium
```

### 2. **Set Up Authentication (One-Time Setup)**

This is the **key step** that makes everything work:

```bash
# Run the authentication setup
npm run setup-auth
```

**What happens:**
1. Opens browser windows for Google, Notion, and Microsoft
2. You manually log in to each platform (just like normal)
3. Your login sessions are saved securely
4. Future automation runs use these saved sessions

**Important:** You only need to do this once! The agent will stay logged in.

### 3. **Start the Server**

```bash
npm start
```

The server will start on `http://localhost:3000` with these endpoints:
- `POST /edit-doc` - Main automation endpoint
- `GET /health` - Check system status
- `GET /platforms` - List supported platforms

## 📚 Usage Examples

### **Basic Text Addition**

```bash
curl -X POST http://localhost:3000/edit-doc \
  -H "Content-Type: application/json" \
  -d '{
    "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
    "instruction": "Add a new paragraph: Hello from automation!"
  }'
```

### **Smart Instruction Processing**

The agent understands natural language and automatically detects intent:

```javascript
// Automatically detects this should create a heading
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
  "instruction": "Add a heading: Project Overview",
  "action": "auto"
}

// Automatically detects this should create a list
{
  "docUrl": "https://www.notion.so/your-page-id",
  "instruction": "Create a list:\n• Task 1: Research\n• Task 2: Design\n• Task 3: Development",
  "action": "auto"
}

// Automatically detects find and replace
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit", 
  "instruction": "Replace 'old version' with 'new version'",
  "action": "auto"
}
```

### **Specific Action Types**

For precise control, specify the exact action:

```javascript
// Google Docs Examples
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
  "instruction": "This text will be typed",
  "action": "typeText"
}

{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
  "instruction": "This will replace all existing text",
  "action": "replaceAll"
}

// Notion Examples
{
  "docUrl": "https://www.notion.so/your-page-id",
  "instruction": "Welcome to My Page",
  "action": "addHeading",
  "options": { "level": 1 }
}

// Google Slides Examples
{
  "docUrl": "https://docs.google.com/presentation/d/your-slides-id/edit",
  "instruction": "Presentation Title",
  "action": "addHeading"
}
```

### **Advanced Formatting**

```javascript
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
  "instruction": "Make this text bold",
  "action": "format",
  "options": { "formatting": "bold" }
}
```

## 🎯 Action Types Reference

| Action | Description | Platforms | Example |
|--------|-------------|-----------|---------|
| `auto` | **Smart detection** - automatically determines what to do | All | `"Add a heading: Overview"` |
| `typeText` | Add text to the document | All | `"Hello World"` |
| `replaceAll` | Replace all text in document | Google Docs | `"New document content"` |
| `addHeading` | Add a heading/title | Notion, Slides | `"Chapter 1"` |
| `addList` | Create a bullet list | Notion | `"Item 1\nItem 2\nItem 3"` |
| `format` | Apply formatting to text | All | `"bold"`, `"italic"`, `"underline"` |

## 🔍 Testing & Validation

### **Run Test Suite**

```bash
npm test
```

This will test:
- ✅ Health check and platform detection
- ✅ Input validation and error handling  
- ✅ Authentication status
- ✅ Document automation (if authenticated)

### **Check System Health**

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0", 
  "platforms": ["Google Docs", "Google Slides", "Notion"],
  "authentication": {
    "Google Docs": true,
    "Google Slides": true, 
    "Notion": false
  }
}
```

## 🏗️ Architecture Overview

### **Key Components**

1. **Authentication System** (`setup-auth.js`)
   - One-time manual login
   - Session state persistence
   - Cross-platform authentication

2. **Page Object Models** (`page-objects/`)
   - `GoogleDocsPage.js` - Google Docs automation
   - `GoogleSlidesPage.js` - Google Slides automation  
   - `NotionPage.js` - Notion automation
   - Clean, maintainable code structure

3. **Smart Detection Engine** (`index.js`)
   - Platform detection from URLs
   - Natural language instruction parsing
   - Intelligent action routing

4. **Robust Error Handling**
   - Detailed error messages
   - Recovery suggestions
   - Graceful fallbacks

### **What Makes It Reliable**

✅ **User-Facing Locators**: Uses `getByRole()`, `getByText()` instead of fragile CSS selectors

✅ **Auto-Waiting**: Built-in waits for elements to be ready

✅ **Success Verification**: Confirms changes were actually applied

✅ **Browser State Management**: Proper context cleanup and resource management

✅ **Cross-Platform Consistency**: Same API works across all platforms

## 🔧 Advanced Configuration

### **Custom Browser Options**

Modify the browser launch options in `index.js`:

```javascript
const browser = await chromium.launch({ 
  headless: true,  // Set to false for debugging
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});
```

### **Adding New Platforms**

1. Create a new page object model in `page-objects/`
2. Add platform detection in `SUPPORTED_PLATFORMS`
3. Update authentication setup in `setup-auth.js`

### **Custom Instructions**

Add new instruction patterns in the `executeAutoInstruction` function:

```javascript
if (lowerInstruction.includes('your-custom-pattern')) {
  // Your custom logic here
  return { action: 'Custom action completed' };
}
```

## 🐛 Troubleshooting

### **Common Issues**

**❌ "Authentication file not found"**
```bash
# Solution: Run authentication setup
npm run setup-auth
```

**❌ "Platform not supported"**
- Check that the URL is for Google Docs, Slides, or Notion
- Ensure the URL format is correct

**❌ "Timeout waiting for element"**
- Document may be slow to load
- Check internet connection  
- Try running with `headless: false` for debugging

**❌ "Content verification failed"**
- The action may have succeeded but verification failed
- Check the document manually
- This is often a false negative

### **Debug Mode**

For debugging, set `headless: false` in the browser launch options to see what's happening:

```javascript
const browser = await chromium.launch({ 
  headless: false  // Opens visible browser
});
```

## 📊 Performance & Limitations

### **Performance**
- **Google Docs**: ~3-5 seconds per operation
- **Google Slides**: ~4-6 seconds per operation  
- **Notion**: ~2-4 seconds per operation

### **Current Limitations**
- Requires manual authentication setup (one-time)
- Some complex formatting may not be supported
- Large documents may be slower to process
- Anti-automation measures may occasionally interfere

### **Future Improvements**
- [ ] Support for more document platforms
- [ ] Batch operations
- [ ] Template-based document creation
- [ ] Advanced formatting options
- [ ] Real-time collaboration features

## 📄 API Reference

### **POST /edit-doc**

**Request Body:**
```typescript
{
  docUrl: string;        // Document URL
  instruction: string;   // What to do
  action?: string;       // Specific action type (default: "auto") 
  options?: {           // Additional options
    formatting?: string;
    level?: number;
    position?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  platform: string;
  action: string;
  instruction: string;
  result: object;
  timestamp: string;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🎉 What's New in v2.0

- 🎯 **Smart platform detection** - No more guessing which platform
- 🧠 **AI-like instruction processing** - Understands natural language
- 🔐 **One-time authentication** - Set up once, use forever
- 📦 **Page Object Models** - Clean, maintainable architecture  
- ✅ **Success verification** - Confirms changes were applied
- 🛡️ **Robust error handling** - Detailed error messages
- 🧪 **Comprehensive testing** - Full test suite included

---

**Built with ❤️ using Playwright, Express.js, and modern web automation techniques.** 

# Playwright Agent 2.1.0

A powerful document automation agent for Google Docs, Slides, and Notion using Playwright with OAuth support.

## Features

- 🔐 **OAuth Token Authentication** - Works with access tokens from your main application
- 📄 **Google Docs Automation** - Edit, format, and modify Google Documents  
- 🎨 **Google Slides Automation** - Create and edit presentations
- 📝 **Notion Automation** - Automate Notion pages and blocks
- 🚀 **Cloud-Ready** - Deployed on Render with headless browser support
- 🔄 **Dual Authentication** - Supports both OAuth tokens and legacy authState

## Authentication Methods

### OAuth Token Authentication (Recommended)
Send OAuth credentials from your main application:

```javascript
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id",
  "instruction": "Add title 'Meeting Notes'",
  "credentials": {
    "access_token": "ya29.a0ARrdaM...",
    "refresh_token": "1//04...",
    "token_type": "Bearer"
  }
}
```

### Legacy AuthState Authentication
Send browser storage state (for backward compatibility):

```javascript
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id", 
  "instruction": "Add title 'Meeting Notes'",
  "authState": {
    "cookies": [...],
    "origins": [...]
  }
}
```

## API Endpoints

### POST /edit-doc
Main endpoint for document automation.

**Request Body:**
```javascript
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id",
  "instruction": "Type Hello World",
  "credentials": {
    "access_token": "your-oauth-token",
    "refresh_token": "your-refresh-token"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Successfully executed instruction on Google Docs.",
  "platform": "Google Docs",
  "url": "https://docs.google.com/document/d/your-doc-id",
  "authMethod": "oauth"
}
```

### POST /test-auth
Test OAuth authentication without performing document operations.

**Request Body:**
```javascript
{
  "credentials": {
    "access_token": "your-oauth-token"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "OAuth authentication test completed",
  "authTest": {
    "url": "https://drive.google.com/",
    "hasEmailInput": false,
    "hasGoogleBar": true,
    "hasMainContent": true,
    "title": "Google Drive"
  },
  "authenticated": true
}
```

### GET /health
Health check endpoint.

**Response:**
```javascript
{
  "status": "healthy",
  "version": "2.1.0"
}
```

## Supported Instructions

### Google Docs
- `"Type [text]"` - Add text to document
- `"Write [text]"` - Add text to document  
- `"Title [text]"` - Change document title
- `"Remove texts from it"` - Clear document content

### Google Slides
- `"Type [text]"` - Add text to slide
- `"Title [text]"` - Change slide title

### Notion
- `"Type [text]"` - Add text block
- `"Title [text]"` - Change page title

## Deployment

### Environment Variables
No environment variables required for OAuth mode.

### Render Deployment
1. Connect your GitHub repository
2. Set build command: `npm install && npx playwright install --with-deps chromium`
3. Set start command: `npm start`
4. Deploy

## Integration Example

### From Your Chatbot Application

```javascript
// Example: Edit a Google Doc
const response = await fetch('https://your-playwright-agent.onrender.com/edit-doc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    docUrl: 'https://docs.google.com/document/d/your-doc-id',
    instruction: 'Add title "Project Meeting Notes"',
    credentials: {
      access_token: userOAuthToken.access_token,
      refresh_token: userOAuthToken.refresh_token
    }
  })
});

const result = await response.json();
console.log(result);
```

### Test Authentication

```javascript
// Test if OAuth token works
const testResponse = await fetch('https://your-playwright-agent.onrender.com/test-auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credentials: {
      access_token: userOAuthToken.access_token
    }
  })
});

const testResult = await testResponse.json();
if (testResult.authenticated) {
  console.log('✅ OAuth authentication successful');
} else {
  console.log('❌ OAuth authentication failed');
}
```

## Workflow

```
User Input → Chatbot → Authentication Check → Credential Check → 
Instruction Enhancement → Playwright Agent → Document Modification
```

1. **User Input**: User requests document modification
2. **Chatbot**: Processes natural language request
3. **Authentication Check**: Verifies user is logged in
4. **Credential Check**: Retrieves OAuth tokens
5. **Instruction Enhancement**: Converts to structured instruction
6. **Playwright Agent**: Executes automation (this service)
7. **Document Modification**: Updates the document

## Error Handling

### Common Errors

- `401 Unauthorized`: Missing or invalid credentials
- `400 Bad Request`: Missing docUrl or instruction
- `500 Internal Server Error`: Authentication failed or document access denied

### Troubleshooting

1. **"Not authenticated" error**: Check if OAuth token is valid and not expired
2. **Timeout errors**: Ensure document URL is accessible and user has edit permissions
3. **Browser errors**: Check if Playwright dependencies are properly installed

## Version History

- **2.1.0**: Added OAuth token authentication support
- **2.0.0**: Simplified architecture, removed local auth storage
- **1.x**: Legacy versions with file-based authentication

## License

MIT License - see LICENSE file for details. 