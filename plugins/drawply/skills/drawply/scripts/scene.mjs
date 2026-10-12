import fs from 'node:fs/promises';
import path from 'node:path';

// A scene comes from source layers, never an inferred rectangle in a screenshot.
export async function readScene(filename, width, height) {
  const raw = await fs.readFile(filename, 'utf8');
  if (Buffer.byteLength(raw) > 500_000) throw Error('Element map is too large.');
  const scene = JSON.parse(raw), ids = new Set();
  if (scene.version !== 1 || scene.width !== width || scene.height !== height || !Array.isArray(scene.children)) {
    throw Error('Element map dimensions must match the review PNG.');
  }
  let bytes = 0, count = 0;
  const color = value => typeof value === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value);
  async function png(relative) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw Error('Layer PNGs must use relative paths.');
    const directory = path.dirname(path.resolve(filename)), target = path.resolve(directory, relative);
    const realRoot = await fs.realpath(directory), realTarget = await fs.realpath(target);
    const rel = path.relative(realRoot, realTarget);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Layer PNG must stay beside the element map.');
    const stat = await fs.stat(realTarget);
    if (!stat.isFile() || stat.size > 700_000 || bytes + stat.size > 700_000) throw Error('Combined layer PNGs must be under 700 KB.');
    const data = await fs.readFile(realTarget);
    if (data.length < 33 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString('ascii',12,16) !== 'IHDR') throw Error('Layer assets must be PNGs.');
    const w = data.readUInt32BE(16), h = data.readUInt32BE(20);
    if (!w || !h || w*h > 32_000_000) throw Error('Layer PNG dimensions are too large.');
    bytes += data.length;
    return 'data:image/png;base64,' + data.toString('base64');
  }
  async function node(n, depth = 0) {
    if (!n || depth > 12 || ++count > 2000) throw Error('Element map is too deeply nested or has too many nodes.');
    if (typeof n.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) || n.id in Object.prototype || ids.has(n.id)) throw Error('Each element needs a unique simple id.');
    ids.add(n.id);
    if (typeof n.name !== 'string' || !n.name.trim() || n.name.length > 120) throw Error('Each element needs a short name.');
    if (!['group','image','rect','text'].includes(n.kind)) throw Error('Unsupported element kind.');
    if (![n.x,n.y,n.width,n.height].every(Number.isFinite) || Math.abs(n.x)>width*2 || Math.abs(n.y)>height*2 || n.width<=0 || n.height<=0 || n.width>width*2 || n.height>height*2) throw Error('Invalid element bounds.');
    const result = {id:n.id,name:n.name,kind:n.kind,x:n.x,y:n.y,width:n.width,height:n.height,selectable:n.selectable!==false,children:[]};
    if (n.kind === 'image') result.png = await png(n.png);
    if (n.kind === 'rect' || n.kind === 'text') {
      if (!color(n.color)) throw Error('Element color must be a hex color.');
      result.color = n.color;
    }
    if (n.kind === 'rect') {
      if (n.radius !== undefined && (!Number.isFinite(n.radius) || n.radius<0)) throw Error('Invalid corner radius.');
      result.radius = Math.min(n.radius || 0,n.width/2,n.height/2);
    }
    if (n.kind === 'text') {
      if (typeof n.text !== 'string' || !n.text || n.text.length>500 || /[\r\n]/.test(n.text)) throw Error('Text elements must be one line, up to 500 characters.');
      if (!Number.isFinite(n.fontSize) || n.fontSize<1 || n.fontSize>500) throw Error('Invalid font size.');
      if (!['sans-serif','serif','monospace'].includes(n.fontFamily || 'sans-serif')) throw Error('Use a supported font family or PNG glyph layers to preserve custom fonts.');
      result.text=n.text; result.fontSize=n.fontSize; result.fontFamily=n.fontFamily || 'sans-serif';
      result.fontWeight=n.fontWeight === 700 ? 700 : n.fontWeight === 500 ? 500 : 400;
    }
    if (n.children !== undefined && !Array.isArray(n.children)) throw Error('Element children must be an array.');
    if (n.kind === 'text' && n.children?.length) throw Error('Text creates its own character children.');
    for (const child of n.children || []) result.children.push(await node(child,depth+1));
    return result;
  }
  if (!color(scene.background) && typeof scene.backgroundPng !== 'string') throw Error('A clean background color or PNG is required beneath movable elements.');
  const result = {version:1,width,height,background:color(scene.background)?scene.background:'#00000000',children:[]};
  if (scene.backgroundPng) result.backgroundPng=await png(scene.backgroundPng);
  for (const child of scene.children) result.children.push(await node(child));
  return result;
}
