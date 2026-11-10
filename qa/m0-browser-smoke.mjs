import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { TOWN_HOTSPOTS } from '../src/constants/Layout.js';

await mkdir('qa-artifacts', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', d => { output += d.toString(); });

async function waitForServer() {
    for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error('Preview terminated: ' + output);
        try {
            const r = await fetch('http://127.0.0.1:4173/');
            if (r.ok) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Vite preview did not start: ' + output);
}

let browser;
const checks = [];
async function inspect(page, name) {
    await page.screenshot({ path: 'qa-artifacts/' + name + '.png', fullPage: true });
    const canvas = page.locator('canvas');
    assert.equal(await canvas.count(), 1, 'Phaser canvas missing in ' + name);
    const b = await canvas.boundingBox();
    assert.ok(b && b.width > 0 && b.height > 0, 'Canvas not visible in ' + name);
    checks.push({name, canvas: {width:b.width,height:b.height}});
}
async function clickGame(page, x, y) {
    const b = await page.locator('canvas').boundingBox();
    assert.ok(b, 'Canvas is missing');
    await page.mouse.click(b.x + x * b.width / 1280, b.y + y * b.height / 720);
}
async function createContext(viewport) {
    return browser.newContext({viewport, deviceScaleFactor:1});
}
async function loadPage(context, errors) {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push('pageerror: ' + error.message));
    page.on('console', message => { if(message.type() === 'error') errors.push('console: ' + message.text()); });
    page.on('requestfailed', request => errors.push('request: ' + request.url() + ': ' + request.failure()?.errorText));
    await page.goto('http://127.0.0.1:4173', {waitUntil:'domcontentloaded'});
    await page.locator('canvas').waitFor({state:'visible',timeout:30000});
    await page.waitForTimeout(1500);
    return page;
}
async function createPlayer(page,role,name) {
    await clickGame(page, 640, 450); // title -> creation
    await page.locator('#creation-ui').waitFor({timeout:10000});
    await page.locator('#playerRole').selectOption(role);
    await page.locator('#playerName').fill(name);
    if(role==='pitcher') await page.locator('.pitch-label').first().click();
    await page.locator('.start-btn').click();
    await page.locator('#creation-ui').waitFor({state:'detached',timeout:10000});
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('baseball_rpg_save')));
    assert.equal(save.role,role);
    assert.equal(save.name,name);
}
try {
    await waitForServer();
    browser = await chromium.launch({headless:true, args:['--use-angle=swiftshader', '--enable-webgl']});
    {
        const errors = [];
        const context = await createContext({width:1280,height:720});
        const page = await loadPage(context,errors);
        await inspect(page,'desktop-title');
        await createPlayer(page,'pitcher','M0 투수');
        await inspect(page,'desktop-town');
        await clickGame(page,TOWN_HOTSPOTS.STADIUM.x,TOWN_HOTSPOTS.STADIUM.y); // town -> match
        await page.waitForTimeout(1000);
        await inspect(page,'desktop-pitcher-match');
        await clickGame(page,1230,20); // exit
        await page.waitForTimeout(300);
        await clickGame(page,540,410); // confirm forfeit
        await page.waitForTimeout(500);
        const player = await page.evaluate(() => JSON.parse(localStorage.getItem('baseball_rpg_save')));
        assert.equal(player.currentMatchIndex,1,'Forfeit must advance exactly one match');
        assert.equal(player.gold,0,'Forfeit must not grant rewards');
        await inspect(page,'desktop-forfeit');
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForTimeout(1000);
        await clickGame(page,640,550); // continue
        await page.waitForTimeout(700);
        assert.equal(await page.locator('#creation-ui').count(),0);
        await inspect(page,'desktop-continued-town');
        assert.deepEqual(errors,[],'Console and network errors on desktop');
        await context.close();
    }
    {
        const errors = [];
        const context = await createContext({width:1280,height:720});
        const page = await loadPage(context,errors);
        await clickGame(page,640,450);
        await page.locator('#creation-ui').waitFor();
        const sample = 'M0 "><img src=x onerror=alert(1)> 타자';
        await page.locator('#playerRole').selectOption('batter');
        await page.locator('#playerName').fill(sample);
        await page.locator('#playerPosition').selectOption('중견수'); // forces a DOM re-render
        assert.equal(await page.locator('#creation-ui img').count(),0,'Name must not insert HTML');
        assert.equal(await page.locator('#playerName').inputValue(),sample,'Name must persist across re-render');
        await page.locator('.start-btn').click();
        await page.locator('#creation-ui').waitFor({state:'detached'});
        await inspect(page,'desktop-batter-town');
        await clickGame(page,TOWN_HOTSPOTS.STADIUM.x,TOWN_HOTSPOTS.STADIUM.y);
        await page.waitForTimeout(1000);
        await inspect(page,'desktop-batter-match');
        assert.deepEqual(errors,[],'Console and network errors on batter route');
        await context.close();
    }
    {
        const errors = [];
        const context = await createContext({width:1280,height:720});
        const page = await loadPage(context,errors);
        await page.evaluate(() => localStorage.setItem('baseball_rpg_save', '{invalid-json'));
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForTimeout(500);
        await inspect(page,'corrupt-save-title');
        await clickGame(page,640,550); // disabled continue must not enter a broken scene
        assert.equal(await page.locator('#creation-ui').count(),0);
        page.on('dialog', dialog => dialog.accept()); // new game confirmation
        await clickGame(page,640,450);
        await page.locator('#creation-ui').waitFor({timeout:10000});
        assert.deepEqual(errors,[],'Corrupted save must not cause a browser error');
        await context.close();
    }
    {
        const errors = [];
        const context = await createContext({width:390,height:844});
        const page = await loadPage(context,errors);
        await clickGame(page,640,450);
        await page.locator('#creation-ui').waitFor();
        await inspect(page,'mobile-creation');
        const rect = await page.locator('#creation-ui').evaluate(el => {
            const r=el.getBoundingClientRect();
            return {left:r.left,right:r.right,width:innerWidth};
        });
        assert.ok(rect.left >= -1 && rect.right <= rect.width+1, 'Mobile creation UI overflows viewport: '+JSON.stringify(rect));
        await page.locator('#playerName').fill('M0 모바일');
        await page.locator('.pitch-label').first().click();
        await page.locator('.start-btn').scrollIntoViewIfNeeded();
        await page.locator('.start-btn').click();
        await page.locator('#creation-ui').waitFor({state:'detached',timeout:10000});
        await inspect(page,'mobile-town');
        assert.deepEqual(errors,[],'Console and network errors on mobile');
        await context.close();
    }
    await writeFile('qa-artifacts/smoke-results.json', JSON.stringify({passed:true,checks},null,2));
    console.log('M0 Chromium smoke tests passed:',checks.map(x=>x.name));
} catch (error) {
    await writeFile('qa-artifacts/smoke-results.json',JSON.stringify({passed:false,error:String(error),checks},null,2));
    console.error('M0 Chromium smoke tests failed:',error);
    process.exitCode=1;
} finally {
    if(browser) await browser.close();
    server.kill('SIGTERM');
}
