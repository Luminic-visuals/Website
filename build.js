// Scant media/ en maakt media.js. Alles in media/Foto = foto, alles in media/Video = video.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'media');
const IMG = /\.(jpe?g|png|webp|avif|gif)$/i, VID = /\.(mp4|webm|mov)$/i;
const base = f => f.replace(/\.[^.]+$/, '');
const nat = (a, b) => a.localeCompare(b, 'nl', { numeric: true });
const url = p => 'media/' + p.map(encodeURIComponent).join('/');
const title = s => s.replace(/^\d+[_\-\s]+/, '').replace(/[_-]+/g, ' ').trim();
const foto = [], video = [];
function walk(rel) {
  const dir = path.join(root, ...rel);
  if (!fs.existsSync(dir)) return;
  const ents = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => nat(a.name, b.name));
  const files = ents.filter(e => e.isFile()).map(e => e.name);
  const vb = new Set(files.filter(f => VID.test(f)).map(base));
  for (const f of files) {
    if (VID.test(f)) {
      const p = files.find(x => IMG.test(x) && base(x) === base(f));
      video.push({ type: 'video', src: url([...rel, f]), poster: p ? url([...rel, p]) : '', title: title(base(f)), v: /(staand|portrait|vertical|verticaal|9x16)/i.test(f) });
    } else if (IMG.test(f) && !vb.has(base(f))) {
      foto.push({ src: url([...rel, f]) });
    } else if (['links.txt', 'youtube.txt'].includes(f.toLowerCase())) {
      for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const parts = line.split('|').map(s => s.trim()), link = parts[0], t = parts[1] || '', ex = parts.slice(2).filter(Boolean); const FLAG = /^(staand|portrait|vertical|verticaal)$/i, vert = ex.some(x => FLAG.test(x)), pp = ex.find(x => !FLAG.test(x)); const poster = pp ? url([...rel, pp]) : ''; const ig = link.match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/i);
        const m = link.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || link.match(/^([\w-]{11})$/);
        if (ig) { const kind = ig[1].toLowerCase().startsWith('reel') ? 'reel' : ig[1].toLowerCase(); video.push({ type: 'ig', src: kind + '/' + ig[2], title: t, poster, v: vert || kind === 'reel' }); } else if (m) video.push({ type: 'yt', src: m[1], title: t, poster, v: vert || /shorts\//i.test(link) });
      }
    }
  }
  for (const e of ents.filter(e => e.isDirectory())) walk([...rel, e.name]);
}
walk(['Foto']); walk(['Video']);
const site = {};
const sf = path.join(root, 'site.txt');
if (fs.existsSync(sf)) for (const l of fs.readFileSync(sf, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^(\w+):\s*(.*)$/); if (m && !l.trim().startsWith('#')) site[m[1]] = m[2].trim();
}
const hd = path.join(root, 'Home');
if (fs.existsSync(hd)) {
  const fl = fs.readdirSync(hd).sort(nat), vids = fl.filter(f => VID.test(f)); const isP = f => /(mobiel|mobile|staand|portrait|vertical|verticaal|9x16)/i.test(f); const pick = (f, k) => { if (!f) return; site[k] = url(['Home', f]); const p = fl.find(x => IMG.test(x) && base(x) === base(f)); if (p) site[k + 'Poster'] = url(['Home', p]); }; pick(vids.find(f => !isP(f)), 'hero'); pick(vids.find(isP), 'heroMobile');
  
}
fs.writeFileSync(path.join(__dirname, 'media.js'), 'const SITE=' + JSON.stringify(site) + ';\nconst MEDIA=' + JSON.stringify({ foto, video }) + ';\n');
console.log(foto.length + ' foto\'s, ' + video.length + ' video\'s');

// Publiceerbare site in dist/ (alleen wat bezoekers nodig hebben)
const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
for (const f of ['index.html', 'media.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dist, f));
fs.cpSync(path.join(__dirname, 'assets'), path.join(dist, 'assets'), { recursive: true });
if (fs.existsSync(root)) fs.cpSync(root, path.join(dist, 'media'), { recursive: true, filter: s => fs.statSync(s).isDirectory() || IMG.test(s) || VID.test(s) });
