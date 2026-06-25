const { chromium } = require('playwright');

(async () => {
  console.log('=== 检查歌词对齐时间戳 ===\n');
  console.log('页面: http://localhost:5173\n');

  const browser = await chromium.launch({ head: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  // 捕获控制台日志
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[TIMESTAMP]') || text.includes('歌词') || text.includes('时间戳')) {
      console.log('  [浏览器日志]', text);
    }
  });
  
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ 页面已打开');
  console.log('\n请在浏览器中重新进行歌词对齐：');
  console.log('  1. 点击"🎯 歌词对齐校准"');
  console.log('  2. 点击"▶️ 播放"');
  console.log('  3. 每句歌词结束后点击"🎵 标记这句"');
  console.log('  4. 最后一句歌词请标记到歌曲结尾\n');

  // 每 5 秒检查一下页面状态
  const checkInterval = setInterval(async () => {
    try {
      const data = await page.evaluate(() => {
        const lyricItems = document.querySelectorAll('.lyric-item.done');
        const result = [];
        lyricItems.forEach(item => {
          const timeEl = item.querySelector('.lyric-time');
          const textEl = item.querySelector('.lyric-text');
          if (timeEl && textEl) {
            result.push({
              time: timeEl.textContent,
              text: textEl.textContent
            });
          }
        });
        return result;
      });
      
      if (data.length > 0) {
        console.log('\n=== 已标记歌词 ===' + ' (共 ' + data.length + ' 句)');
        data.forEach((item, i) => {
          console.log('  ' + (i+1) + '. ' + item.time + '  ' + item.text);
        });
      }
    } catch (e) {}
  }, 5000);

  await new Promise(() => {});
  clearInterval(checkInterval);
  await browser.close();
})();
