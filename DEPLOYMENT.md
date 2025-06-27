# 🚀 Cloud Deployment Guide - Playwright Agent v2.0

## For AI Chatbot Integration on Render

### 🏗️ Architecture Overview

```
User → AI Chatbot → Enhanced Query → Playwright Agent (Render) → Document Platforms
```

### ✨ New Cloud Features

- **🧠 Smart File Detection**: Automatically detects Google Docs, Slides, Notion from URLs or content
- **🔐 Environment-Based Auth**: No manual browser setup - uses environment variables
- **🤖 AI Chatbot Ready**: Enhanced endpoints for AI integration
- **☁️ Cloud Optimized**: Headless operation with auto-authentication

---

## 📋 Render Deployment Steps

### 1. **Fork/Clone Repository**
```bash
git clone https://github.com/Jack-Pision/Playwright-agent.git
cd Playwright-agent
```

### 2. **Deploy to Render**

#### Option A: Using Render Dashboard
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Choose "Web Service"
4. Set build command: `npm install && npx playwright install chromium`
5. Set start command: `npm start`

#### Option B: Using render.yaml (Recommended)
The `render.yaml` file is already configured - just connect your repo!

### 3. **Configure Environment Variables**

In your Render dashboard, add these environment variables:

```env
# Google Account (for Docs, Slides, Sheets)
GOOGLE_EMAIL=your-google-email@gmail.com
GOOGLE_PASSWORD=your-app-password

# Notion Account
NOTION_EMAIL=your-notion-email@gmail.com
NOTION_PASSWORD=your-notion-password

# Microsoft Account (for Office 365)
MICROSOFT_EMAIL=your-microsoft-email@outlook.com
MICROSOFT_PASSWORD=your-microsoft-password

# System
NODE_ENV=production
PORT=3000
```

⚠️ **Security Note**: Use app-specific passwords, not your main account passwords!

---

## 🔑 Setting Up App Passwords

### Google (Recommended)
1. Enable 2FA on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate an app password for "Playwright Agent"
4. Use this password in `GOOGLE_PASSWORD`

### Notion
- Use your regular Notion password
- Ensure the account has access to the documents you want to automate

### Microsoft
1. Go to Microsoft Account security settings
2. Generate an app password for "Playwright Agent" 
3. Use this in `MICROSOFT_PASSWORD`

---

## 🤖 AI Chatbot Integration

### New API Endpoints

#### 1. **Smart File Detection**
```bash
POST /detect-file
```

**Request:**
```json
{
  "url": "https://docs.google.com/document/d/abc123/edit",
  "content": "file content here",
  "filename": "document.docx",
  "context": "additional AI context"
}
```

**Response:**
```json
{
  "success": true,
  "detected": {
    "type": "google-docs",
    "platform": "google",
    "platformName": "Google Docs",
    "isAuthenticated": true,
    "canAutomate": true
  },
  "suggestions": ["typeText", "replaceAll", "addHeading"],
  "examples": ["Add a heading: Project Overview"]
}
```

#### 2. **Enhanced Document Editing**
```bash
POST /edit-doc
```

**New Request Format:**
```json
{
  "docUrl": "https://docs.google.com/document/d/abc123/edit",
  "instruction": "Add a heading: AI-Generated Content",
  "action": "auto",
  "fileContent": "Optional: for smart detection",
  "fileName": "Optional: document.docx", 
  "chatContext": "Optional: Additional AI context"
}
```

#### 3. **Health Check with Cloud Info**
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0-cloud",
  "environment": {
    "isRender": true,
    "deployment": "render"
  },
  "authentication": {
    "Google Docs": true,
    "Notion": false
  },
  "features": {
    "smartFileDetection": true,
    "aiChatbotIntegration": true,
    "cloudDeployment": true
  }
}
```

---

## 📱 AI Chatbot Implementation

### Example Integration Code

```javascript
// In your AI chatbot
async function processDocumentRequest(userMessage, fileUrl) {
  // 1. Detect file type
  const detection = await fetch(`${PLAYWRIGHT_AGENT_URL}/detect-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: fileUrl,
      context: userMessage
    })
  }).then(r => r.json());

  if (!detection.success) {
    return "I couldn't detect the file type. Please share a Google Docs, Slides, or Notion link.";
  }

  // 2. Enhance user query with AI
  const enhancedInstruction = await enhanceUserQuery(userMessage, detection.detected.type);

  // 3. Execute automation
  const result = await fetch(`${PLAYWRIGHT_AGENT_URL}/edit-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docUrl: fileUrl,
      instruction: enhancedInstruction,
      action: 'auto',
      chatContext: userMessage
    })
  }).then(r => r.json());

  return result.success 
    ? `✅ Successfully updated your ${detection.detected.platformName} document!`
    : `❌ Error: ${result.error}`;
}
```

---

## 🔍 Testing Your Deployment

### 1. **Health Check**
```bash
curl https://your-app.onrender.com/health
```

### 2. **File Detection**
```bash
curl -X POST https://your-app.onrender.com/detect-file \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.google.com/document/d/test/edit"}'
```

### 3. **Document Automation**
```bash
curl -X POST https://your-app.onrender.com/edit-doc \
  -H "Content-Type: application/json" \
  -d '{
    "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
    "instruction": "Add a heading: Hello from the cloud!"
  }'
```

---

## 🐛 Troubleshooting

### Common Issues

**❌ "Authentication not configured"**
- Solution: Add environment variables (GOOGLE_EMAIL, GOOGLE_PASSWORD, etc.)

**❌ "Could not detect document platform"**
- Solution: Ensure URL format is correct or provide more context

**❌ "Browser crashed" / "Timeout"**
- Solution: This is normal for cloud - the system will retry automatically

### Debug Mode

Set environment variable `DEBUG=true` for verbose logging:
```env
DEBUG=true
```

---

## 📊 Performance & Limits

### Render Free Tier
- ✅ **Sleeps after 15 minutes** of inactivity (normal)
- ✅ **750 hours/month** usage limit
- ✅ **Perfect for AI chatbot** integration

### Response Times
- **First request** (cold start): ~10-15 seconds
- **Subsequent requests**: ~3-5 seconds
- **File detection**: ~500ms

### Scaling
For high-volume usage, upgrade to Render's paid plans for:
- No sleep mode
- Faster performance
- More concurrent users

---

## 🔐 Security Best Practices

1. **Use app passwords**, not main account passwords
2. **Rotate credentials** regularly
3. **Monitor usage** through Render dashboard
4. **Limit document access** to specific accounts
5. **Use HTTPS** for all API calls

---

## 🎯 What Your AI Chatbot Can Now Do

### Smart Capabilities

- **📄 Google Docs**: Add text, headings, format content, find & replace
- **📊 Google Slides**: Create slides, add content, change themes
- **📑 Google Sheets**: Edit cells, add formulas (coming soon)
- **📝 Notion**: Create blocks, lists, headings, databases
- **📁 Microsoft Office**: Basic editing (via cloud interfaces)

### Example User Interactions

```
User: "Add a summary to my project doc"
AI: *detects Google Docs, enhances query*
Agent: *adds professional summary section*

User: "Make my presentation more engaging"  
AI: *detects Google Slides, suggests improvements*
Agent: *adds animations, updates theme*

User: "Create meeting notes in Notion"
AI: *detects Notion, structures content*
Agent: *creates formatted meeting notes template*
```

---

## 🚀 Your API Key Setup

Once deployed on Render, your API key for the AI chatbot is:
```
PLAYWRIGHT_AGENT_URL=https://your-app-name.onrender.com
```

**Perfect! Your cloud-powered document automation agent is ready!** 🎉 