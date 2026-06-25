const { chromium } = require('playwright');

(async () => {
  console.log('=== 打开浏览器 - 手动歌词对齐 ===\n');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend:  http://localhost:8000\n');
  console.log('操作步骤：');
  console.log('  1. 点击"🎯 歌词对齐校准"按钮');
  console.log('  2. 点击"▶️ 播放"开始播放歌曲');
  console.log('  3. 每唱完一句歌词，点击"🎵 标记这句歌词唱完了"');
  console.log('  4. 完成后点击"✅ 应用到主程序"');
  console.log('\n浏览器已打开，请手动操作...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 页面已打开');
  console.log('⌨️  请在浏览器中进行操作...\n');
  console.log('完成对齐后，请返回命令行通知我！');

  // Keep browser open
  await new Promise(() => {});
  await browser.close();
})();
