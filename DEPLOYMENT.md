# 🚀 Playwright Worker v4.0 - Deployment Guide

This agent is a "dumb" worker. It performs Playwright tasks based on instructions it receives. It does **not** manage user data or connect to a database.

### 🏗️ **Architecture**

Your main application (the AI Chatbot) is responsible for everything related to users and data.

```
User → AI Chatbot → (Gets authState from Supabase) → Playwright Worker (This Repo) → Document Platforms
```

### **How It Works**

1.  **Your Chatbot** gets a request from a user.
2.  **Your Chatbot** looks up the `userId` in its **own Supabase database** to find the stored `authState` (the credential blob).
3.  **Your Chatbot** sends a `POST` request to this worker's `/edit-doc` endpoint, including the `docUrl`, `instruction`, and the `authState`.
4.  **This Worker** uses the `authState` to log in and perform the automation.
5.  If the `authState` is missing, this worker replies with a `401` error, telling your chatbot that it needs to get the user to log in.

---

## 📋 **Render Deployment**

1.  Push this codebase to your GitHub repository.
2.  In Render, create a new **Web Service**.
3.  Connect the repository.
4.  Use these settings:
    -   **Build Command**: `npm install && npx playwright install --with-deps chromium`
    -   **Start Command**: `npm start`
5.  **No environment variables are needed** for this worker.

---

## 🤖 **API for your Chatbot**

### **Endpoint: `/edit-doc`**

This is the only endpoint you need to call.

**Method**: `POST`
**URL**: `https://your-worker-name.onrender.com/edit-doc`

#### **Request Body**

```json
{
  "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
  "instruction": "Make the first paragraph bold",
  "authState": { ... } // The full storageState object from Playwright
}
```

-   `authState`: This is the crucial part. Your chatbot must fetch this JSON object from your Supabase database and include it in every request.

#### **Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Successfully executed instruction on Google Docs."
}
```

#### **Auth Failure Response (401 Unauthorized)**

This happens if you forget to include the `authState` object. Your chatbot should treat this as a signal to trigger a login flow for the user.

```json
{
  "error": "Authentication credentials are required. Please include the 'authState' object in your request.",
  "login_required": true
}
```

---

## 🔍 **Testing Your Deployment**

### **1. Health Check**

Check if the agent is running and connected to Supabase.

```bash
curl https://your-agent.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0-supabase",
  "supabase": {
    "connected": true
  }
}
```

### **2. Automation Request**

Make a request to the main endpoint. If the user isn't authenticated, you'll get the `401` error.

```bash
curl -X POST https://your-agent.onrender.com/edit-doc \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_01",
    "docUrl": "https://docs.google.com/document/d/your-doc-id/edit",
    "instruction": "Add a heading from the cloud!"
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