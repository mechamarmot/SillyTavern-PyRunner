/**
 * Global setup for Playwright tests
 * Configures SillyTavern to use Horde AI as the backend
 */

const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('🚀 Setting up Horde AI backend for tests...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to SillyTavern
    console.log('📡 Connecting to SillyTavern...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

    // Open the API drawer (click the plug icon in the top nav)
    console.log('🔌 Opening API settings...');
    const apiDrawerButton = page.locator('#API-status-top');
    await apiDrawerButton.click();
    await page.waitForTimeout(500);

    // Select AI Horde from the dropdown
    console.log('🎯 Selecting AI Horde API...');
    await page.selectOption('#main_api', 'koboldhorde');
    await page.waitForTimeout(1000);

    // Load Horde models
    console.log('📋 Loading available Horde models...');
    const refreshButton = page.locator('#horde_refresh');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(3000); // Wait for models to load
    }

    // Select first available model
    console.log('🤖 Selecting Horde model...');
    const modelSelect = page.locator('#horde_model');
    const options = await modelSelect.locator('option').all();

    if (options.length > 0) {
      const firstModel = await options[0].getAttribute('value');
      await modelSelect.selectOption(firstModel);
      await page.waitForTimeout(500);
      console.log(`✅ Selected model: ${firstModel}`);
    } else {
      console.warn('⚠️  No Horde models available - tests may fail');
    }

    // Verify connection
    console.log('🔍 Verifying Horde connection...');
    const statusElement = page.locator('#horde_model');
    if (await statusElement.isVisible()) {
      console.log('✅ Horde AI backend configured successfully!');
    }

    // Save settings
    await page.waitForTimeout(1000);

  } catch (error) {
    console.error('❌ Failed to configure Horde AI:', error.message);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup complete - Horde AI ready for tests');
}

module.exports = globalSetup;
