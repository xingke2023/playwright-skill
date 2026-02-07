const { chromium } = require('playwright');
const fs = require('fs');

// 调试辅助函数
let stepCounter = 0;
async function debugStep(page, description) {
  stepCounter++;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`\n[${timestamp}] 步骤 ${stepCounter}: ${description}`);

  // 显示当前 URL
  console.log(`   🌐 当前页面: ${page.url()}`);
}

(async () => {
  console.log('🚀 开始执行脚本...');

  // 检查 cookie 文件
  const cookiePath = './cookies.json';
  if (!fs.existsSync(cookiePath)) {
    console.error(`❌ Cookie 文件不存在: ${cookiePath}`);
    process.exit(1);
  }
  console.log('✅ Cookie 文件已找到');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100  // 放慢操作速度，便于观察
  });

  const context = await browser.newContext();
  const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
  await context.addCookies(cookies);
  console.log(`✅ 已加载 ${cookies.length} 个 cookies`);

  const page = await context.newPage();

  // 监听页面控制台输出
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`   [浏览器 ${type}] ${msg.text()}`);
    }
  });

  // 监听页面错误
  page.on('pageerror', error => {
    console.log(`   ❌ [页面错误] ${error.message}`);
  });

  // 监听请求失败
  page.on('requestfailed', request => {
    console.log(`   ⚠️  [请求失败] ${request.url()}`);
  });

  await debugStep(page, '开始执行');

  console.log('🌐 正在访问客户列表页面...');
  await page.goto('https://api.hkprod.manulife.com.hk/ext/pos-qq-web-hkg-app/#/customerList');
  

  console.log('📝 点击"製作建議書"按钮...');
  await page.getByRole('button', { name: '製作建議書' }).waitFor({ state: 'visible' });
  console.log('看到按钮')
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '製作建議書' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByText('擬受保人').waitFor({ state: 'visible' });

  console.log('📋 填写客户信息...');

  // 填写基本信息
  await page.locator('#mat-input-1').click();
  
  await page.locator('#mat-input-1').fill('toming13');
  
  await page.locator('#mat-input-1').press('Tab');
  
  await page.locator('#mat-input-2').fill('jkjljlj');
  
  await page.locator('#mat-input-2').press('Tab');
  
  await page.locator('#mat-input-5').click();
  
  await page.locator('#mat-input-5').fill('23');
  

  // 选择性别
  await page.getByRole('img', { name: 'female' }).click();
  
  await page.waitForLoadState('networkidle');
  await debugStep(page, '性别选择完成');

  console.log('✅ 客户信息填写完成');

  console.log('📋 填写保险计划信息...');
  await page.getByRole('button', { name: '基本計劃' }).click();

  // 2. 等待"請選擇"元素出现并可见
  try {
    await page.waitForSelector('text=請選擇', { state: 'visible', timeout: 10000 });
    console.log('   ✅ "請選擇" 已出现');
  } catch (e) {
    console.log('   ⚠️  等待"請選擇"超时，继续尝试...');
  }

  // 3. 额外等待确保元素完全可交互
  await debugStep(page, '准备点击"請選擇"');

  // 4. 点击"請選擇"（多种方式尝试）
  try {
    // 方式1: 使用更具体的选择器（第4个"請選擇"）
    const selector = page.locator('div').filter({ hasText: /^請選擇$/ }).nth(3);
    await selector.scrollIntoViewIfNeeded();  // 滚动到可见区域
    await selector.click();
    console.log('   ✅ 已点击"請選擇" (方式1)');
  } catch (e1) {
    console.log('   ⚠️  方式1失败，尝试方式2...');
    try {
      // 方式2: 使用 getByText
      const element = page.getByText('請選擇').first();
      await element.scrollIntoViewIfNeeded();
      await element.click();
      console.log('   ✅ 已点击"請選擇" (方式2)');
    } catch (e2) {
      console.log('   ❌ 点击"請選擇"失败');
      throw e2;  // 抛出错误，让调试截图捕获
    }
  }

  // 3. 等待下拉菜单打开（点击"請選擇"后应该显示计划列表）
  
  try {
    await page.waitForSelector('.mat-select-panel, .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
    console.log('   ✅ 计划下拉列表已打开');
  } catch (e) {
    console.log('   ⚠️  下拉列表未打开');
  }
  await page.waitForLoadState('networkidle');  // 等待列表数据加载
  
  await debugStep(page, '计划下拉列表已打开');

  // 4. 从下拉列表中选择"宏摯傳承保障計劃(GS)"
  console.log('   🎯 正在选择计划...');

  // 等待并选择"宏摯傳承保障計劃(GS)"
  try {
    // 1. 等待选项出现
    await page.waitForSelector('text=宏摯傳承保障計劃', { state: 'visible', timeout: 10000 });
    console.log('   ✅ 找到计划选项');

    // 2. 额外等待确保可点击
    

    // 3. 尝试点击（多种方式）
    try {
      // 方式1: 精确匹配文本
      const option = page.getByText('宏摯傳承保障計劃(GS)');
      await option.scrollIntoViewIfNeeded();
      await option.click();
      console.log('   ✅ 已选择计划 (精确匹配)');
    } catch (e1) {
      console.log('   ⚠️  精确匹配失败，尝试部分匹配...');
      try {
        // 方式2: 部分匹配
        const option = page.getByText(/宏摯傳承/).first();
        await option.scrollIntoViewIfNeeded();
        await option.click();
        console.log('   ✅ 已选择计划 (部分匹配)');
      } catch (e2) {
        console.log('   ⚠️  部分匹配也失败，尝试使用 role...');
        try {
          // 方式3: 使用 role 选择器
          const option = page.getByRole('option').filter({ hasText: /宏摯/ }).first();
          await option.scrollIntoViewIfNeeded();
          await option.click();
          console.log('   ✅ 已选择计划 (role选择器)');
        } catch (e3) {
          console.log('   ❌ 所有方式都失败');
          await debugStep(page, '无法点击计划选项');
          throw e3;
        }
      }
    }
  } catch (e) {
    console.log('   ❌ 无法选择计划选项');
    await debugStep(page, '选择计划失败');
    throw e;
  }

  // 等待下拉菜单关闭
  
  try {
    await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 });
  } catch (e) {
    // 如果没有找到遮罩层，继续执行
  }
  await page.waitForLoadState('networkidle');
  await debugStep(page, '已选择保险计划');

  // 选择年期（带等待和错误处理）
  try {
    await page.waitForSelector('#mat-select-value-3', { state: 'visible', timeout: 10000 });
    await page.locator('#mat-select-value-3').click();
    // 等待下拉列表加载
    
    try {
      await page.waitForSelector('.mat-select-panel, .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
      console.log('   ✅ 年期下拉列表已打开');
    } catch (e) {}
    await page.waitForLoadState('networkidle');
    

    await page.getByRole('option', { name: '5年', exact: true }).click();
    // 等待下拉菜单关闭
    
    try {
      await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 });
    } catch (e) {}
    await page.waitForLoadState('networkidle');
    console.log('✅ 已选择年期：5年');
  } catch (e) {
    console.log('⚠️  年期选择失败，尝试其他方式...');
    // 尝试使用其他选择器
    try {
      await page.locator('[formcontrolname="policyTerm"]').click();
      // 等待下拉列表加载
      
      try {
        await page.waitForSelector('.mat-select-panel, .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
      } catch (e) {}
      await page.waitForLoadState('networkidle');
      
      await page.getByText('5年').first().click();
      // 等待下拉菜单关闭
      
      try {
        await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 });
      } catch (e) {}
      await page.waitForLoadState('networkidle');
      console.log('✅ 使用备用方式选择年期');
    } catch (e2) {
      console.log('⚠️  跳过年期选择，使用默认值');
    }
  }

  await page.locator('#mat-select-value-5').click();
  // 等待下拉列表加载
  await page.waitForTimeout(500);
  try {
    await page.waitForSelector('.mat-select-panel, .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
    console.log('   ✅ 币种下拉列表已打开');
  } catch (e) {}
  await page.waitForLoadState('networkidle');
  

  await page.getByRole('option', { name: '美元' }).click();
  // 等待下拉菜单关闭
  try {
    await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 });
  } catch (e) {}
  await page.waitForLoadState('networkidle');

  await page.locator('#mat-input-6').click();
  
  await page.locator('#mat-input-6').fill('300,0000');
  
  await page.waitForLoadState('networkidle');

  await page.locator('#mat-select-value-4').click();
  // 等待下拉列表加载
  await page.waitForTimeout(500);
  try {
    await page.waitForSelector('.mat-select-panel, .cdk-overlay-pane', { state: 'visible', timeout: 5000 });
    console.log('   ✅ 选项下拉列表已打开');
  } catch (e) {}
  await page.waitForLoadState('networkidle');
  

  await page.getByRole('option', { name: '否' }).click();
  // 等待下拉菜单关闭
  
  try {
    await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 });
  } catch (e) {}
  await page.waitForLoadState('networkidle');

  console.log('✅ 计划信息填写完成');

  console.log('📊 查看保费摘要...');
  await page.getByRole('button', { name: '保費摘要' }).click();
  await page.waitForLoadState('networkidle');
  

  await page.getByRole('button', { name: '檢視建議書' }).waitFor({ state: 'visible' });

  await page.getByRole('button', { name: '儲存' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByText('資料已儲存').waitFor({ state: 'visible' });
  await page.waitForTimeout(13000);

  const saveButtons = page.getByRole('button', { name: '儲存' });
  const count = await saveButtons.count();
  console.log(`\n📊 找到 ${count} 个 "儲存" 按钮\n`);

  if (count>1){
    await page.waitForTimeout(13000);
    await page.getByRole('button', { name: '儲存' }).click();
    await page.getByRole('button', { name: '儲存' }).first().click();  // 点击第1个
    await page.getByRole('button', { name: '儲存' }).last().click();   // 点击第2个
    await page.waitForTimeout(3000);
  }

  await page.getByRole('button', { name: '檢視建議書' }).click();
  await page.waitForLoadState('networkidle');

  const saveButtons1 = page.getByRole('button', { name: '儲存' });
  const count1 = await saveButtons.count();
  console.log(`\n📊 找到 ${count} 个 "儲存" 按钮\n`);

  if (count1>1){
    await page.waitForTimeout(13000);
    await page.getByRole('button', { name: '儲存' }).click();
    await page.getByRole('button', { name: '儲存' }).first().click();  // 点击第1个
    console.log(`\n📊 点击 "儲存" 按钮\n`);
    await page.getByRole('button', { name: '儲存' }).last().click();   // 点击第2个
  }
  await page.waitForTimeout(13000);


  await page.getByRole('radio', { name: '簡體中文' }).waitFor({ state: 'visible' });
  await page.getByRole('radio', { name: '簡體中文' }).check();
  await page.getByRole('checkbox', { name: '所有年期' }).check();
  const page1Promise = page.waitForEvent('popup');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '列印建議書' }).click();
  const page1 = await page1Promise;
  const download = await downloadPromise;
  
  await context.close();
  await browser.close();

  console.log('✅ 脚本执行完成！');
})().catch(error => {
  console.error('❌ 脚本执行出错:');
  console.error(error);
  process.exit(1);
});