import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {renderInline} from '../plugins/drawply/skills/drawply/scripts/render-inline.mjs';
import {readScene} from '../plugins/drawply/skills/drawply/scripts/scene.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const output=process.env.DRAWPLY_TEST_OUTPUT || await fs.mkdtemp(path.join(os.tmpdir(),'drawply-select-'));
await fs.mkdir(output,{recursive:true});
const png=path.join(output,'select-example.png'), manifest=path.join(output,'select-example.json'), htmlPath=path.join(output,'select-example.html');
const scene={version:1,width:800,height:380,background:'#edf0f5',children:[
  {id:'panel',name:'Panel',selectable:false,kind:'rect',x:40,y:36,width:720,height:308,color:'#ffffff',radius:18,children:[
    {id:'heading',name:'Heading',kind:'text',x:44,y:34,width:570,height:36,text:'Your next adventure',fontSize:28,fontWeight:700,color:'#1e293b'},
    {id:'caption',name:'Caption',kind:'text',x:44,y:86,width:610,height:24,text:'Select the button, then click its label or filling.',fontSize:18,color:'#475569'},
    {id:'button',name:'Continue button',kind:'group',x:150,y:158,width:340,height:78,children:[
      {id:'button-rim',name:'Button rim',kind:'rect',x:0,y:0,width:340,height:78,color:'#163a80',radius:14},
      {id:'button-fill',name:'Button filling',kind:'rect',x:3,y:3,width:334,height:70,color:'#2563eb',radius:11},
      {id:'button-text',name:'Button text',kind:'text',x:116,y:22,width:126,height:32,text:'Continue',fontSize:26,fontWeight:700,color:'#ffffff'}
    ]}
  ]}
]};
await fs.writeFile(manifest,JSON.stringify(scene,null,2));
const browser=await chromium.launch({executablePath:process.env.EDGE_PATH,headless:true});
const shell=fragment=>`<html><head><style>:root{--background:#fff;--foreground:#20242a;--border:#d5d9e0;--blue:#2563eb}*{box-sizing:border-box}body{margin:16px;font:14px system-ui;color:var(--foreground);background:var(--background)}button,input,select,textarea{font:inherit}button{border:1px solid #d5d9e0;background:#fff;border-radius:8px;padding:8px;display:inline-flex;gap:5px;align-items:center}button[aria-pressed=true]{background:#2563eb;color:white}button:disabled{opacity:.4}input,select,textarea{padding:8px;border:1px solid #d5d9e0;border-radius:6px;max-width:100%}.viz-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.form-control-color{width:44px;height:34px}.form-label{display:grid;gap:4px}.text-small{font-size:12px}i{display:none}</style></head><body>${fragment}</body></html>`;
try {
  const page=await browser.newPage({viewport:{width:1000,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seed=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=380;return c.toDataURL().split(',')[1];});
  await fs.writeFile(png,Buffer.from(seed,'base64'));
  await renderInline(png,htmlPath,manifest);
  let fragment=await fs.readFile(htmlPath,'utf8');
  const instrument=f=>f.replace('  image.src=',`  window.testDrawing={selection,read:()=>strokes,snapshot,restore,render,replace:s=>{strokes=s;render();persist();}};\n  image.src=`);
  const open=async(f=fragment)=>{await page.setContent(shell(instrument(f)));await page.waitForFunction(()=>document.querySelector('#review-status')?.textContent==='Ready to mark up');};
  await open();
  // Capture the exact original composition, then verify the editable layers reproduce it.
  const original=await page.locator('canvas').evaluate(c=>c.toDataURL().split(',')[1]);
  await fs.writeFile(png,Buffer.from(original,'base64'));await renderInline(png,htmlPath,manifest);fragment=await fs.readFile(htmlPath,'utf8');await open();
  assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL().split(',')[1]),original);
  await page.evaluate(()=>{window.saved=[];window.openai={setWidgetState:async s=>{saved.push(structuredClone(s));window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:s}}}));}};});
  const click=async(x,y)=>{const b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+x*b.width/800,b.y+y*b.height/380);};
  const selected=()=>page.evaluate(()=>testDrawing.selection.selected);
  await page.locator('[data-tool=select]').click();
  await click(355,232);assert.equal(await selected(),'button');
  await click(355,232);assert.equal(await selected(),'button-text');
  await click(355,232);assert.match(await selected(),/^button-text:char:/);
  await click(730,300);assert.equal(await selected(),'button-text');
  await page.keyboard.press('Escape');assert.equal(await selected(),'button');
  await click(220,232);assert.equal(await selected(),'button-fill');
  await page.locator('[data-parent]').click();assert.equal(await selected(),'button');
  await page.locator('.review-dimensions summary').click();
  const field=page.locator('[data-width]');await field.fill('420');await field.press('Tab');
  await page.locator('[data-angle]').fill('15');await page.locator('[data-angle]').press('Tab');
  let t=await page.evaluate(()=>testDrawing.selection.snapshot().button);assert.equal(t.angle,15);assert.equal(t.sx,420/340);
  await page.locator('#review-undo').click();t=await page.evaluate(()=>testDrawing.selection.snapshot().button);assert.equal(t.angle,0);
  await page.locator('#review-redo').click();assert.equal((await page.evaluate(()=>testDrawing.selection.snapshot().button)).angle,15);
  await page.locator('[data-tool=select]').focus();await page.keyboard.press('ArrowRight');assert.equal((await page.evaluate(()=>testDrawing.selection.snapshot().button)).dx,1);
  await page.waitForTimeout(200);assert.equal((await page.evaluate(()=>saved.at(-1).modelContent.transforms.button)).angle,15);
  // Save/download excludes the selection outline and preserves transformed content.
  const expected=await page.evaluate(()=>{testDrawing.render(false);const p=document.querySelector('canvas').toDataURL().split(',')[1];testDrawing.render();return p;});
  const downloadPromise=page.waitForEvent('download');await page.locator('#review-export').click();const download=await downloadPromise;
  assert.equal((await fs.readFile(await download.path())).toString('base64'),expected);
  // Pointer transforms at a nested scale, including opposite-corner anchoring.
  await page.evaluate(()=>testDrawing.selection.restore({}));await page.locator('[data-elements]').selectOption('button');
  let b=await page.locator('canvas').boundingBox();const mouse=async(x,y)=>page.mouse.move(b.x+x*b.width/800,b.y+y*b.height/380);
  await mouse(530,272);await page.mouse.down();await mouse(598,288);await page.mouse.up();
  t=await page.evaluate(()=>testDrawing.selection.snapshot().button);assert(Math.abs(t.sx-1.2)<.02);assert(Math.abs(t.sy-1.2)<.02);
  await page.locator('#review-undo').click();assert.deepEqual(await page.evaluate(()=>testDrawing.selection.snapshot()),{});
  // Rotation handle and hit-testing after a parent transform.
  await mouse(360,194-28*800/b.width);await page.mouse.down();await mouse(440,233);await page.mouse.up();
  t=await page.evaluate(()=>testDrawing.selection.snapshot().button);assert(t.angle>70&&t.angle<110,'rotation handle rotates around the center');
  await page.locator('#review-undo').click();
  await page.evaluate(()=>{testDrawing.selection.restore({button:{dx:0,dy:0,sx:1.4,sy:1.4,angle:0}});testDrawing.render();});
  await click(355,232);assert.equal(await selected(),'button-text','children remain hittable inside scaled parents');
  await page.locator('[data-elements]').selectOption('button');await page.evaluate(()=>{testDrawing.selection.restore({});testDrawing.render();});
  // A cancelled drag leaves no partial transformation.
  await mouse(355,232);await page.mouse.down();await mouse(385,247);await page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>testDrawing.selection.snapshot()),{});
  // Cancelling a new drag after Undo must retain the redo branch.
  await page.locator('[data-tool=select]').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Control+z');
  assert.equal(await page.locator('#review-redo').isEnabled(),true);
  await mouse(355,232);await page.mouse.down();await mouse(385,247);await page.keyboard.press('Escape');await page.mouse.up();
  assert.equal(await page.locator('#review-redo').isEnabled(),true);await page.locator('#review-redo').click();
  assert.equal((await page.evaluate(()=>testDrawing.selection.snapshot().button)).dx,1);
  // Undo while held cancels the transaction; following pointer movement cannot revive it.
  await mouse(355,232);await page.mouse.down();await mouse(385,247);await page.keyboard.press('Control+z');await mouse(420,260);await page.mouse.up();
  assert.equal((await page.evaluate(()=>testDrawing.selection.snapshot().button)).dx,1);assert.equal(await page.evaluate(()=>testDrawing.selection.active),false);
  // Drawing still works; undo restores full marks and transformed state together.
  await page.locator('[data-tool=pen]').click();b=await page.locator('canvas').boundingBox();await mouse(50,320);await page.mouse.down();await mouse(200,320);await page.mouse.up();assert.equal(await page.evaluate(()=>testDrawing.read().length),1);
  await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>testDrawing.read().length),0);await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(()=>testDrawing.read().length),1);
  await page.locator('#review-clear').click();assert.equal(await page.evaluate(()=>testDrawing.read().length),0);
  await page.locator('[data-tool=select]').click();await page.locator('.review-dimensions summary').click();
  // Desktop/mobile evidence for the compact selected state.
  await page.locator('[data-tool=select]').click();await page.locator('[data-elements]').selectOption('button');
  await page.screenshot({path:path.join(output,'select-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(output,'select-mobile.png'),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile horizontal overflow');
  await page.evaluate(()=>testDrawing.selection.restore({}));
  const touch=await page.context().newCDPSession(page);
  for(const expected of ['button-text','button-text:char:3']){
    const r=await page.locator('canvas').boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+355*r.width/800,y:r.y+232*r.height/380}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const id=await selected();if(expected==='button-text')assert.equal(id,expected);else assert.match(id,/^button-text:char:/);
  }
  // Marquee selection in both drag directions; whole parents exclude their children.
  await page.setViewportSize({width:1000,height:900});await open();await page.locator('[data-tool=select]').click();b=await page.locator('canvas').boundingBox();
  const ids=()=>page.evaluate(()=>testDrawing.selection.selectedIds);
  await mouse(70,55);await page.mouse.down();await mouse(730,180);await page.mouse.up();assert.deepEqual(await ids(),['heading','caption']);
  await page.screenshot({path:path.join(output,'marquee-desktop.png'),fullPage:true});
  const beforeMulti=await page.evaluate(()=>testDrawing.selection.snapshot());
  await mouse(100,85);await page.mouse.down();await mouse(120,100);await page.mouse.up();
  let group=await page.evaluate(()=>testDrawing.selection.snapshot());assert(Math.abs(group.heading.dx-20)<1);assert(Math.abs(group.caption.dy-15)<1);
  await page.locator('#review-undo').click();assert.deepEqual(await page.evaluate(()=>testDrawing.selection.snapshot()),beforeMulti);
  await page.locator('#review-redo').click();assert.deepEqual(await page.evaluate(()=>testDrawing.selection.snapshot()),group);
  await page.locator('.review-dimensions summary').click();
  await page.locator('[data-angle]').fill('20');await page.locator('[data-angle]').press('Tab');
  group=await page.evaluate(()=>testDrawing.selection.snapshot());assert(Math.abs(group.heading.angle-20)<.01);assert(Math.abs(group.caption.angle-20)<.01);
  const width=Number(await page.locator('[data-width]').inputValue());await page.locator('[data-width]').fill(String(width*1.2));await page.locator('[data-width]').press('Tab');
  group=await page.evaluate(()=>testDrawing.selection.snapshot());assert(group.heading.sx>1&&group.caption.sx>1);
  const exactGroup=await page.evaluate(()=>{testDrawing.render(false);const result=document.querySelector('canvas').toDataURL();testDrawing.selection.restore(testDrawing.selection.snapshot());testDrawing.render(false);return result===document.querySelector('canvas').toDataURL();});assert(exactGroup,'group transform survives state restore');
  await page.locator('.review-dimensions summary').click();
  await page.locator('[data-elements]').selectOption('');await page.evaluate(()=>{testDrawing.selection.restore({});testDrawing.render();});b=await page.locator('canvas').boundingBox();
  await mouse(550,290);await page.mouse.down();await mouse(180,185);await page.mouse.up();assert.deepEqual(await ids(),['button'],'reverse box chooses whole button once');
  await mouse(10,10);await page.mouse.down();await mouse(30,30);await page.mouse.up();assert.deepEqual(await ids(),[],'empty box deselects');
  await mouse(70,55);await page.mouse.down();await mouse(730,180);await page.mouse.up();assert.deepEqual(await ids(),['heading','caption']);
  await mouse(10,10);await page.mouse.down();await mouse(750,320);await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await ids(),['heading','caption'],'cancelled marquee preserves prior selection');
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(output,'marquee-mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Flat PNGs keep drawing and explicitly explain why source elements cannot be selected.
  const flatPath=path.join(output,'flat.html');await renderInline(png,flatPath);await open(await fs.readFile(flatPath,'utf8'));
  await page.locator('[data-tool=select]').click();assert.match(await page.locator('#review-status').textContent(),/no editable layers/);
  assert.equal(await page.locator('#review-selection').isVisible(),false);
  const bad=structuredClone(scene);bad.children[0].id='__proto__';const badFile=path.join(output,'invalid.json');await fs.writeFile(badFile,JSON.stringify(bad));await assert.rejects(readScene(badFile,800,380));
  bad.children[0].id='ok';bad.children[0].kind='image';bad.children[0].png='../private.png';await fs.writeFile(badFile,JSON.stringify(bad));await assert.rejects(readScene(badFile,800,380));
  assert.deepEqual(errors,[]);
  console.log('PASS: exact layered composition, nested selection, text and characters, parent navigation, resizing, rotation, keyboard movement, history, cancelled drag, host echo, clean PNG export, flat-image fallback, validation and mobile layout.');
  console.log(output);
} finally {await browser.close();}
