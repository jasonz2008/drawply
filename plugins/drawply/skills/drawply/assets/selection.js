// Embedded by render-inline.mjs. No network, libraries, or source mutation.
function createSelection({scene,canvas,ctx,bar,change,redraw,status}) {
  const nodes=new Map(), roots=[], images=new Map();
  let selected=null, transforms={}, gesture=null, ready=false, enabled=false;
  const choose=bar.querySelector('[data-elements]'), parentButton=bar.querySelector('[data-parent]');
  const fields=Object.fromEntries(['width','height','angle'].map(k=>[k,bar.querySelector(`[data-${k}]`)]));
  const identity=()=>({dx:0,dy:0,sx:1,sy:1,angle:0});
  const current=n=>n.kind==='selection'?n.transform:transforms[n.id] || identity();
  const multiOption=document.createElement('option');multiOption.value='';multiOption.disabled=true;
  function build(n,parent=null,depth=0) {
    n={...n,parent,depth,children:[]}; nodes.set(n.id,n);
    if(n.kind==='text') {
      ctx.font=`${n.fontWeight} ${n.fontSize}px ${n.fontFamily}`;
      const chars=typeof Intl.Segmenter==='function' ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(n.text)].map(v=>v.segment) : Array.from(n.text);
      let prefix='';
      chars.forEach((char,i)=>{
        // Prefix measurement retains kerning between graphemes in the original text.
        const advance=ctx.measureText(prefix+char).width, w=ctx.measureText(char).width;
        n.children.push(build({id:`${n.id}:char:${i}`,name:`“${char}”`,kind:'glyph',text:char,x:advance-w,y:0,width:Math.max(1,w),height:n.height,color:n.color,fontSize:n.fontSize,fontWeight:n.fontWeight,fontFamily:n.fontFamily,children:[]},n,depth+1));
        prefix+=char;
      });
    } else for(const child of (sceneNode(n.id)?.children || [])) n.children.push(build(child,n,depth+1));
    const option=document.createElement('option');option.value=n.id;option.textContent='\u00a0'.repeat(depth*2)+n.name;
    // Build children first, but show the parent first in the accessible picker.
    if(n.selectable!==false)choose.insertBefore(option,Array.from(choose.options).find(o=>{let p=nodes.get(o.value)?.parent;while(p){if(p===n)return true;p=p.parent;}return false;}) || null);
    return n;
  }
  const sourceNodes=new Map();
  function index(items){for(const n of items){sourceNodes.set(n.id,n);index(n.children || []);}}
  const sceneNode=id=>sourceNodes.get(id);
  if(scene) {index(scene.children);scene.children.forEach(n=>roots.push(build(n)));}
  function matrixFor(n,t) {
    return new DOMMatrix().translate(n.x+n.width/2+t.dx,n.y+n.height/2+t.dy).rotate(t.angle).skewX(t.skew || 0).scale(t.sx,t.sy).translate(-n.width/2,-n.height/2);
  }
  const local=n=>matrixFor(n,current(n));
  function world(n){return n.parent ? world(n.parent).multiply(local(n)) : local(n);}
  const at=(matrix,p)=>{const v=new DOMPoint(...p).matrixTransform(matrix);return [v.x,v.y];};
  const inside=(n,p)=>{const q=at(world(n).inverse(),p);return q[0]>=0&&q[0]<=n.width&&q[1]>=0&&q[1]<=n.height;};
  const contains=(n,p)=>inside(n,p)||n.children.some(child=>contains(child,p));
  const parentOf=n=>{let p=n?.parent;while(p?.selectable===false)p=p.parent;return p||null;};
  function hit(items,p) {for(let i=items.length-1;i>=0;i--){const n=items[i];if(contains(n,p)){const match=n.selectable===false?hit(n.children,p):n;if(match)return match;}}return null;}
  function announce(){status.textContent=selected?.kind==='selection'?`${selected.members.length} elements selected. Drag to move together; handles resize or rotate.`:selected?`${selected.name}. Click inside for a part; outside or Escape goes up.`:'Click an element, or drag a box to select several.';}
  function sync() {
    bar.hidden=!enabled || !ready;
    if(selected?.kind==='selection'){multiOption.textContent=selected.name;choose.append(multiOption);multiOption.selected=true;}
    else {multiOption.remove();choose.value=selected?.id || '';}
    parentButton.disabled=!selected;
    for(const field of Object.values(fields))field.disabled=!selected;
    if(selected) {const t=current(selected);fields.width.value=Math.round(selected.width*t.sx*10)/10;fields.height.value=Math.round(selected.height*t.sy*10)/10;fields.angle.value=Math.round(t.angle*10)/10;}
  }
  function select(n){selected=n;sync();redraw();announce();}
  const corners=n=>[[0,0],[n.width,0],[n.width,n.height],[0,n.height]].map(p=>at(world(n),p));
  function selectMany(items){
    const set=new Set(items),members=items.filter(n=>{let p=n.parent;while(p){if(set.has(p))return false;p=p.parent;}return true;});
    if(members.length<2){select(members[0]||null);return;}
    const points=members.flatMap(corners),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);
    select({kind:'selection',name:`${members.length} elements`,members,children:[],parent:null,x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y,transform:identity()});
  }
  function enclosed(a,b){
    const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),right=Math.max(a[0],b[0]),bottom=Math.max(a[1],b[1]),found=[];
    function visit(items){for(const n of items){
      if(n.selectable!==false&&corners(n).every(p=>p[0]>=x&&p[0]<=right&&p[1]>=y&&p[1]<=bottom))found.push(n);
      else visit(n.children);
    }}visit(roots);return found;
  }
  function groupContext(n){return {node:n,initial:{...current(n)},m:world(n),before:structuredClone(transforms),members:n.members?.map(item=>({node:item,world:world(item),parent:item.parent?world(item.parent):new DOMMatrix()}))};}
  function applyGroup(g,t){
    const delta=matrixFor(g.node,t).multiply(g.m.inverse()),next={...g.before};
    for(const entry of g.members){
      const n=entry.node,m=entry.parent.inverse().multiply(delta).multiply(entry.world),sx=Math.hypot(m.a,m.b),sy=(m.a*m.d-m.b*m.c)/sx;
      const center=at(m,[n.width/2,n.height/2]),skew=Math.atan((m.a*m.c+m.b*m.d)/(sx*sy))*180/Math.PI;
      if(![sx,sy,skew,...center].every(Number.isFinite)||sx<.05||sx>20||sy<.05||sy>20||Math.abs(skew)>89.9)return false;
      next[n.id]={dx:center[0]-n.x-n.width/2,dy:center[1]-n.y-n.height/2,sx,sy,angle:Math.atan2(m.b,m.a)*180/Math.PI,skew};
    }
    transforms=next;g.node.transform=t;return true;
  }
  function drawNode(n) {
    ctx.save();const m=local(n);ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
    if(n.kind==='image')ctx.drawImage(images.get(n.png),0,0,n.width,n.height);
    if(n.kind==='rect'){ctx.fillStyle=n.color;ctx.beginPath();ctx.roundRect(0,0,n.width,n.height,n.radius);ctx.fill();}
    if(n.kind==='glyph'){ctx.font=`${n.fontWeight} ${n.fontSize}px ${n.fontFamily}`;ctx.fillStyle=n.color;ctx.textBaseline='top';ctx.fillText(n.text,0,0);}
    n.children.forEach(drawNode);ctx.restore();
  }
  function draw() {
    if(!ready)return false;
    ctx.fillStyle=scene.background;ctx.fillRect(0,0,canvas.width,canvas.height);
    if(scene.backgroundPng)ctx.drawImage(images.get(scene.backgroundPng),0,0,canvas.width,canvas.height);
    roots.forEach(drawNode);return true;
  }
  function handles() {
    if(!selected)return [];
    const n=selected,m=world(n), coordinates=[[0,0],[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5]];
    const points=coordinates.map(([x,y])=>({kind:'resize',x,y,p:at(m,[n.width*x,n.height*y])}));
    const top=points[1].p, center=at(m,[n.width/2,n.height/2]);
    const dx=top[0]-center[0],dy=top[1]-center[1],len=Math.hypot(dx,dy)||1;
    points.push({kind:'rotate',p:[top[0]+dx/len*28*ratio(),top[1]+dy/len*28*ratio()]});return points;
  }
  const ratio=()=>canvas.width/(canvas.getBoundingClientRect().width || canvas.width);
  function overlay() {
    if(!enabled||!ready)return;
    if(gesture?.kind==='marquee'&&gesture.moved){
      const a=gesture.start,b=gesture.end,r=ratio();ctx.save();ctx.strokeStyle=getComputedStyle(canvas).getPropertyValue('--blue').trim()||'#2563eb';ctx.lineWidth=1.5*r;ctx.setLineDash([5*r,3*r]);ctx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);ctx.restore();
    }
    if(!selected)return;
    const hs=handles(),r=ratio(),theme=getComputedStyle(canvas),blue=theme.getPropertyValue('--blue').trim()||'#2563eb';
    ctx.save();ctx.strokeStyle=blue;ctx.fillStyle=theme.getPropertyValue('--background').trim()||'#ffffff';ctx.lineWidth=1.5*r;
    ctx.beginPath();[0,2,4,6,0].forEach((i,k)=>k?ctx.lineTo(...hs[i].p):ctx.moveTo(...hs[i].p));ctx.stroke();
    ctx.beginPath();ctx.moveTo(...hs[1].p);ctx.lineTo(...hs[8].p);ctx.stroke();
    hs.forEach((h,i)=>{ctx.beginPath();if(i===8)ctx.arc(...h.p,5*r,0,Math.PI*2);else ctx.rect(h.p[0]-4*r,h.p[1]-4*r,8*r,8*r);ctx.fill();ctx.stroke();});ctx.restore();
  }
  function commit(next){change();transforms=next;sync();redraw();}
  function updateSelected(t){
    if(selected.kind!=='selection'){commit({...transforms,[selected.id]:t});return;}
    const g=groupContext(selected);
    if(!applyGroup(g,t)){status.textContent='That size exceeds the supported range.';sync();return;}
    const after=transforms;transforms=g.before;change();transforms=after;sync();redraw();
  }
  function down(p,e) {
    if(!ready){status.textContent='This result has no editable layers. Ask Codex to prepare it for Select.';return;}
    const handle=handles().find(h=>Math.hypot(h.p[0]-p[0],h.p[1]-p[1])<=(e.pointerType==='touch'?20:10)*ratio());
    if(selected&&(handle||contains(selected,p))) {
      gesture={...groupContext(selected),id:e.pointerId,node:selected,start:p,handle:handle||{kind:'move'},parent:selected.parent?world(selected.parent):new DOMMatrix(),moved:false};
      canvas.setPointerCapture(e.pointerId);return;
    }
    // Defer outside clicks until release so the same gesture can become a marquee.
    gesture={kind:'marquee',id:e.pointerId,start:p,end:p,previous:selected,moved:false};canvas.setPointerCapture(e.pointerId);
  }
  function move(p,e) {
    if(!gesture||gesture.id!==e.pointerId)return;
    const g=gesture,n=g.node;
    if(!g.moved&&Math.hypot(p[0]-g.start[0],p[1]-g.start[1])<3*ratio())return;
    if(!g.moved)g.moved=true;
    if(g.kind==='marquee'){g.end=p;redraw();return;}
    const t={...g.initial}, a=at(g.parent.inverse(),g.start), b=at(g.parent.inverse(),p);
    if(g.handle.kind==='move'){t.dx+=b[0]-a[0];t.dy+=b[1]-a[1];}
    else if(g.handle.kind==='rotate') {
      const center=[n.x+n.width/2+t.dx,n.y+n.height/2+t.dy];
      t.angle+=(Math.atan2(b[1]-center[1],b[0]-center[0])-Math.atan2(a[1]-center[1],a[0]-center[0]))*180/Math.PI;
      if(e.shiftKey)t.angle=Math.round(t.angle/15)*15;
      t.angle=((t.angle+180)%360+360)%360-180;
    } else {
      const q=at(g.m.inverse(),p),h=g.handle,ax=1-h.x,ay=1-h.y;
      let sx=h.x===.5?1:(q[0]-n.width*ax)/(n.width*(h.x-ax)),sy=h.y===.5?1:(q[1]-n.height*ay)/(n.height*(h.y-ay));
      // Corner handles preserve aspect ratio; Shift allows independent axes.
      if(h.x!==.5&&h.y!==.5&&!e.shiftKey)sx=sy=Math.max(sx,sy);
      sx=Math.max(.05/t.sx,Math.min(20/t.sx,sx));sy=Math.max(.05/t.sy,Math.min(20/t.sy,sy));
      const anchor=[n.width*ax,n.height*ay],old=at(g.m,anchor);
      t.sx*=sx;t.sy*=sy;
      const next=at(g.parent.multiply(matrixFor(n,t)),anchor),delta=at(g.parent.inverse(),old),end=at(g.parent.inverse(),next);
      t.dx+=delta[0]-end[0];t.dy+=delta[1]-end[1];
    }
    if(n.kind==='selection')applyGroup(g,t);else transforms={...g.before,[n.id]:t};sync();redraw();
  }
  function finish(e,cancel=false) {
    if(!gesture||gesture.id!==e.pointerId)return false;
    const g=gesture;gesture=null;
    if(g.kind==='marquee'){
      if(cancel)select(g.previous);
      else if(g.moved)selectMany(enclosed(g.start,g.end));
      else select(g.previous?parentOf(g.previous):hit(roots,g.start));
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);return false;
    }
    if(cancel){transforms=g.before;if(g.node.kind==='selection')g.node.transform=g.initial;sync();redraw();}
    else if(g.moved){const after=transforms;transforms=g.before;change();transforms=after;sync();redraw();}
    else if(contains(g.node,g.start))select(g.node.kind==='selection'?hit(g.node.members,g.start):hit(g.node.children,g.start)||g.node);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    return g.moved;
  }
  choose.addEventListener('change',()=>select(nodes.get(choose.value)||null));
  parentButton.addEventListener('click',()=>select(parentOf(selected)));
  for(const [key,field] of Object.entries(fields))field.addEventListener('change',()=>{
    if(!selected)return;const value=Number(field.value),t={...current(selected)};
    if(!field.value.trim()||!Number.isFinite(value)||(key!=='angle'&&value<=0)){sync();return;}
    if(key==='angle')t.angle=((value+180)%360+360)%360-180;
    else {const factor=value/selected[key];if(factor<.05||factor>20){status.textContent='Size must be between 5% and 2000% of the original.';sync();return;}t[key==='width'?'sx':'sy']=factor;}
    updateSelected(t);status.textContent=`${selected.name} updated.`;
  });
  function cancel(){if(!gesture)return false;finish({pointerId:gesture.id},true);return true;}
  function key(e){
    if(e.key==='Escape'&&cancel())return true;
    if(!enabled||!selected)return false;
    if(e.key==='Escape'){select(parentOf(selected));return true;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      const t={...current(selected)},d=e.shiftKey?10:1;
      t.dx+=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0;t.dy+=e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0;
      updateSelected(t);return true;
    }return false;
  }
  function restore(value){
    const next={};
    if(value&&typeof value==='object')for(const [id,t] of Object.entries(value)){
      if(nodes.has(id)&&t&&['dx','dy','sx','sy','angle'].every(k=>Number.isFinite(t[k]))&&Math.abs(t.dx)<=canvas.width*20&&Math.abs(t.dy)<=canvas.height*20&&t.sx>=.05&&t.sx<=20&&t.sy>=.05&&t.sy<=20&&Math.abs(t.angle)<=360&&(t.skew===undefined||Number.isFinite(t.skew)&&Math.abs(t.skew)<=89.9))next[id]={dx:t.dx,dy:t.dy,sx:t.sx,sy:t.sy,angle:t.angle,...(t.skew===undefined?{}:{skew:t.skew})};
    }
    transforms=next;if(selected?.kind==='selection')selectMany(selected.members);else sync();
  }
  async function load(){
    if(!scene)return;
    const urls=new Set([...nodes.values()].filter(n=>n.png).map(n=>n.png));if(scene.backgroundPng)urls.add(scene.backgroundPng);
    await Promise.all([...urls].map(url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images.set(url,im);resolve();};im.onerror=()=>reject(Error('Layer image could not load'));im.src=url;})));
    ready=true;sync();
  }
  return {load,draw,overlay,down,move,finish,key,restore,cancel,
    get active(){return !!gesture;},get available(){return ready;},get selected(){return selected?.id||null;},
    get selectedIds(){return selected?.kind==='selection'?selected.members.map(n=>n.id):selected?[selected.id]:[];},
    snapshot:()=>structuredClone(transforms),
    enable:value=>{if(!value)cancel();enabled=value;sync();if(value)ready?announce():status.textContent='This result has no editable layers. Ask Codex to prepare it for Select.';redraw();}
  };
}
