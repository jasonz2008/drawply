import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH);
const root=new URL('.',import.meta.url);
// Inspect closure state only in the test copy; exercise production pointer handlers.
let html=await fs.readFile(process.argv[2] || (()=>{throw Error('Pass the flat.html produced by tests/select.mjs')})(),'utf8');
html=html.replace("  image.src=",`  window.testDrawing={read:()=>strokes,snapshot,restore,render,
  replace:items=>{strokes=items;render();persist();}};
  image.src=`);
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1000,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/capacity-test',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));
  await page.addInitScript(()=>{
    window.saved=[];
    window.openai={setWidgetState:async state=>{
      window.saved.push(structuredClone(state));
      window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:state}}}));
    }};
  });
  await page.goto('http://127.0.0.1:4178/drawply/capacity-test');
  await page.locator('#review-status').filter({hasText:'Ready to mark up'}).waitFor().catch(async e=>{console.log(errors,await page.locator('#review-status').textContent());throw e;});
  const canvas=page.locator('canvas'),b=await canvas.boundingBox();
  await page.mouse.move(b.x+50,b.y+50);await page.mouse.down();
  await page.evaluate(()=>{
    const c=document.querySelector('canvas'),r=c.getBoundingClientRect();
    for(let i=0;i<2000;i++)c.dispatchEvent(new PointerEvent('pointermove',{
      pointerId:1,clientX:r.x+30+(i%850),clientY:r.y+100+Math.sin(i/9)*60,bubbles:true
    }));
  });
  await page.mouse.up();
  await page.waitForFunction(()=>window.saved.length>0);
  const first=await page.evaluate(()=>({count:testDrawing.read()[0].points.length,state:saved.at(-1),png:document.querySelector('canvas').toDataURL()}));
  assert(first.count>=1900,'pen retains all distinct sampled positions beyond 600 points');
  assert(first.state.modelContent.simplified);
  assert(Buffer.byteLength(JSON.stringify(first.state))<=12500);
  assert(first.state.modelContent.strokes[0].points.length<first.count);
  assert.equal(await canvas.evaluate(c=>c.toDataURL()),first.png,'host echo leaves exact drawing intact');
  await page.locator('#review-undo').click();
  assert.equal(await page.evaluate(()=>testDrawing.read().length),0);
  await page.locator('#review-redo').click();
  assert.equal(await canvas.evaluate(c=>c.toDataURL()),first.png,'redo preserves full drawing');
  for(let i=0;i<60;i++)await canvas.click({position:{x:20+i*3,y:200}});
  assert.equal(await page.evaluate(()=>testDrawing.read().length),61,'more than 48 marks allowed');
  await page.locator('[data-tool="text"]').click();
  await canvas.click({position:{x:120,y:260}});
  await page.locator('textarea').fill('Editable after a long drawing');
  await page.locator('#review-text-add').click();
  await canvas.click({position:{x:120,y:260}});
  assert.equal(await page.locator('textarea').inputValue(),'Editable after a long drawing');
  await page.locator('textarea').fill('Still editable');
  await page.locator('#review-text-add').click();
  const expected=await canvas.evaluate(c=>c.toDataURL());
  const downloadPromise=page.waitForEvent('download');await page.locator('#review-export').click();
  const download=await downloadPromise;
  assert.equal((await fs.readFile(await download.path())).toString('base64'),expected.split(',')[1],'PNG export retains full canvas');
  await page.evaluate(()=>{
    testDrawing.replace(Array.from({length:1200},(_,i)=>({tool:'text',points:[[i%900,i%400]],ink:'#ff453a',text:'Reference '+i+' x'.repeat(80)})));
  });
  await page.waitForFunction(()=>saved.at(-1)?.modelContent?.totalMarks===1200);
  const many=await page.evaluate(()=>({live:testDrawing.read().length,state:saved.at(-1)}));
  assert.equal(many.live,1200);
  assert(many.state.modelContent.omittedMarks>0);
  assert(Buffer.byteLength(JSON.stringify(many.state))<=12500);
  await page.locator('[data-tool="box"]').click();
  await canvas.click({position:{x:100,y:100}});
  assert.equal(await page.evaluate(()=>testDrawing.read().length),1201,'compact snapshot never blocks new marks');
  await page.locator('#review-clear').click();
  await page.locator('#review-undo').click();
  assert.equal(await page.evaluate(()=>testDrawing.read().length),1201,'clear is reversible at high mark counts');
  await page.evaluate(()=>{window.openai.setWidgetState=()=>{throw Error('Host save failed')};});
  await canvas.click({position:{x:140,y:140}});
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>testDrawing.read().length),1202,'host failure cannot reject drawing');
  const restored=await browser.newPage();
  await restored.route('**/capacity-test',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));
  await restored.addInitScript(state=>{window.openai={widgetState:state}},first.state);
  await restored.goto('http://127.0.0.1:4178/drawply/capacity-test');
  await restored.locator('#review-status').filter({hasText:'Restored a compact preview'}).waitFor();
  assert.equal(await restored.evaluate(()=>testDrawing.read()[0].points.length),first.state.modelContent.strokes[0].points.length);
  await restored.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: over 1,900 points, 1,202 marks, editable text, undo/redo, exact PNG, bounded snapshots, echo protection, and save failure.');
} finally {await browser.close();}
