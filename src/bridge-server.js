const express = require('express');
const { chromium, firefox, webkit } = require('playwright');

// --- CONFIGURATION Read from Environment Variables ---
const API_PORT = process.env.PORT || 3000;
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

if (!BRIDGE_API_KEY) {
  console.error("FATAL ERROR: The environment variable BRIDGE_API_KEY is not defined.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- Authentication Middleware ---
const apiKeyMiddleware = (req, res, next) => {
  const providedApiKey = req.header('x-api-key');
  if (!providedApiKey || providedApiKey !== BRIDGE_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized access.' });
  }
  next();
};

// Apply authentication middleware to all routes
app.use(apiKeyMiddleware);


// --- Helper Function for Connection ---
// Abstracts connection logic to avoid code repetition
const connectToBrowser = async (wsEndpoint) => {
  if (!wsEndpoint) {
    throw new Error('The "wsEndpoint" field is required in the request body.');
  }
  // Supports multiple browsers based on wsEndpoint path
  const browserType = wsEndpoint.includes('firefox') ? firefox : (wsEndpoint.includes('webkit') ? webkit : chromium);
  return await browserType.connect({ wsEndpoint });
};


// --- API ENDPOINTS ---

app.post('/function', async (req, res) => {
  const { code, context: userContext, wsEndpoint } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'The "code" field is required.' });
  }

  let browser;
  try {
    browser = await connectToBrowser(wsEndpoint);
    const context = await browser.newContext(userContext?.playwright?.contextOptions);
    const page = await context.newPage();
    
    const userFunction = new Function('return ' + code)();
    const result = await userFunction({ page, context });
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});


app.post('/screenshot', async (req, res) => {
  const { url, options, context: userContext, wsEndpoint } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'The "url" field is required.' });
  }

  let browser;
  try {
    browser = await connectToBrowser(wsEndpoint);
    const context = await browser.newContext(userContext?.playwright?.contextOptions);
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });
    const imageBuffer = await page.screenshot(options || {});
    
    res.set('Content-Type', `image/${options?.type || 'png'}`);
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    if (browser) await browser.close();
  }
});


app.listen(API_PORT, () => {
  console.log(`Professional Bridge API for Playwright running on port ${API_PORT}`);
});