const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  // 检查页面中的音频元素，获取歌曲时长
  const duration = await page.evaluate(() => {
    return new Promise((resolve) => {
      const audio = new Audio('http://localhost:8000/audio/songs/人间原版.mp3');
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(-1);
      });
    });
  });
  
  console.log('=== 歌曲信息 ===');
  console.log('歌曲文件: 人间原版.mp3');
  console.log('总时长: ' + duration.toFixed(2) + ' 秒 (' + Math.floor(duration/60) + '分' + (duration%60).toFixed(0) + '秒)');
  console.log('');
  console.log('最后一句歌词"但愿你会懂该何去何从"的时间戳应该设为:');
  console.log('  - 开始时间: ' + (duration - 10).toFixed(2) + ' 秒 (歌曲结束前10秒)');
  console.log('  - 或直接用歌曲结束时间: ' + duration.toFixed(2) + ' 秒');
  
  await browser.close();
})();
