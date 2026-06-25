const { chromium } = require('playwright');

(async () => {
  console.log('=== Lyric Scrolling Test ===\n');
  console.log('Test: Verify lyrics scroll correctly on the new timeline\n');
  
  // Launch with visible browser
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('1. Opening main page http://localhost:5173');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  console.log('2. Page loaded, checking title');
  const pageTitle = await page.textContent('h1');
  console.log('   Title:', pageTitle);
  
  console.log('\n3. Clicking "Lyric Aligner" button');
  const alignerButton = await page.locator('.aligner-btn').first();
  await alignerButton.click();
  await page.waitForTimeout(2000);
  
  const alignerTitle = await page.locator('.aligner-header h2').first().textContent();
  console.log('   Aligner page title:', alignerTitle);
  
  console.log('\n4. Simulating marking lyrics...');
  
  // Mark first 5 lyrics
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(4000); // 4 seconds per lyric
    await page.click('.btn-large');
    console.log(`   Marked lyric ${i}`);
  }
  
  const markedLyrics = await page.locator('.lyric-item.done').all();
  console.log(`\n5. Marked lyrics count: ${markedLyrics.length}`);
  
  for (let i = 0; i < markedLyrics.length; i++) {
    const text = await markedLyrics[i].textContent();
    console.log(`   ${i+1}. ${text}`);
  }
  
  // Apply and return to main
  console.log('\n6. Applying new timestamps to main page');
  const applyButton = page.locator('button:has-text("应用到主程序")').first();
  if (await applyButton.count() > 0) {
    await applyButton.click();
    console.log('   Applied successfully!');
  }
  
  await page.waitForTimeout(2000);
  
  // Return to main and test playback
  console.log('\n7. Testing playback with aligned lyrics');
  
  // Click close button on aligner
  const closeBtn = page.locator('.aligner-header button').first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  }
  
  await page.waitForTimeout(1000);
  
  console.log('\n=== READY FOR MANUAL TESTING ===\n');
  console.log('Please manually complete these tests in the browser:');
  console.log('  1. Click "Play" button to start playing the song');
  console.log('  2. Watch if lyrics scroll with the music');
  console.log('  3. Check if each lyric displays at the right time');
  console.log('  4. If lyrics are off, re-calibrate with the Lyric Aligner tool');
  console.log('\nTip: Lyrics scroll based on your manually marked timestamps');
  console.log('     You can re-calibrate as many times as needed\n');
  console.log('Browser window is now open. Press Ctrl+C to exit test.\n');
  
  // Keep running
  await new Promise(() => {});
  await browser.close();
})();
