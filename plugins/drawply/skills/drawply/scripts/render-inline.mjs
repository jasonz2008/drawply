import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readScene} from './scene.mjs';

const templatePath = new URL('../assets/inline-review.html', import.meta.url);
const scriptJSON = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

export async function renderInline(imagePath, outputPath, scenePath) {
  const source = path.resolve(imagePath);
  const output = path.resolve(outputPath);
  if (source === output) throw Error('Output must differ from the source image.');
  const info = await fs.stat(source);
  if (!info.isFile() || info.size > 700_000) throw Error('Use a PNG smaller than 700 KB for the inline review.');
  const png = await fs.readFile(source);
  if (png.length < 33 || !png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || png.toString('ascii',12,16) !== 'IHDR') {
    throw Error('Inline review requires a PNG. Convert the result to PNG first.');
  }
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  if (width < 32 || height < 32 || width*height > 32_000_000) throw Error('Unsupported PNG dimensions.');
  const scene = scenePath ? await readScene(scenePath,width,height) : null;
  if(scene)scene.id=createHash('sha256').update(JSON.stringify(scene)).digest('hex').slice(0,16);
  const id = 'drawply-' + createHash('sha256').update(source).update(png).update(scene?.id || '').digest('hex').slice(0,16);
  const replacements = {
    __REVIEW_ID__: id, __SOURCE_JSON__: scriptJSON(source.replaceAll('\\','/')),
    __WIDTH__: String(width), __HEIGHT__: String(height),
    __IMAGE_DATA_URL__: 'data:image/png;base64,' + png.toString('base64'),
    __SCENE_JSON__: scriptJSON(scene),
    __SELECT_RUNTIME__: await fs.readFile(new URL('../assets/selection.js',import.meta.url),'utf8')
  };
  const html = (await fs.readFile(templatePath,'utf8')).replace(/__REVIEW_ID__|__SOURCE_JSON__|__WIDTH__|__HEIGHT__|__IMAGE_DATA_URL__|__SCENE_JSON__|__SELECT_RUNTIME__/g, key => replacements[key]);
  if (Buffer.byteLength(html) >= 1_000_000) throw Error('Inline review exceeds the host size limit. Use a smaller PNG.');
  await fs.mkdir(path.dirname(output), {recursive:true});
  await fs.writeFile(output, html);
  return {path:output, source, width, height};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [imagePath,outputPath,scenePath] = process.argv.slice(2);
    if (!imagePath || !outputPath) throw Error('Usage: node render-inline.mjs result.png review.html');
    console.log(JSON.stringify(await renderInline(imagePath,outputPath,scenePath)));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
