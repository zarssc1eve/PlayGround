const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/home/runner/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3002/index.html',{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(1500);
 await page.screenshot({path:'/tmp/opencode/shadow-title.png',fullPage:true});
 await page.click('#startBtn'); await page.waitForTimeout(1500);
 await page.screenshot({path:'/tmp/opencode/shadow-game.png',fullPage:true});
 console.log(JSON.stringify({title:await page.title(),hud:await page.locator('#hud').evaluate(e=>getComputedStyle(e).display),errors,canvas:await page.locator('canvas#world').count()},null,2));
 await browser.close();
})();
