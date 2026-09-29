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
      video.push({ type: 'video', src: url([...rel, f]), poster: p ? url([...rel, p]) : '', title: title(base(f)) });
    } else if (IMG.test(f) && !vb.has(base(f))) {
      foto.push({ src: url([...rel, f]) });
    } else if (f.toLowerCase() === 'youtube.txt') {
      for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const [link, t = ''] = line.split('|').map(s => s.trim());
        const m = link.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || link.match(/^([\w-]{11})$/);
        if (m) video.push({ type: 'yt', src: m[1], title: t });
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
  const fl = fs.readdirSync(hd).sort(nat), v = fl.find(f => VID.test(f));
  if (v) { site.hero = url(['Home', v]); const p = fl.find(f => IMG.test(f) && base(f) === base(v)); if (p) site.heroPoster = url(['Home', p]); }
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
