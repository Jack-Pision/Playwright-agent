const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.post("/edit-doc", async (req, res) => {
  const { docUrl, instruction } = req.body;

  if (!docUrl || !instruction) {
    return res.status(400).json({ error: "docUrl and instruction are required" });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(docUrl);
    await page.waitForTimeout(5000); // wait for page load; adjust if needed

    // Example simple edit: focus, then type instruction (customize this!)
    await page.keyboard.press("Tab");
    await page.keyboard.type(instruction);

    await browser.close();
    res.json({ success: true, message: "Instruction applied." });
  } catch (err) {
    console.error(err);
    await browser.close();
    res.status(500).json({ error: "Failed to edit document." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Playwright agent running on port ${PORT}`));
