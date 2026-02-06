const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../bundle-stats.html'), 'utf8');
const start = html.indexOf('const data = ');
if (start === -1) {
  console.log('No data found');
  process.exit(1);
}
let data;
let depth = 0;
let jsonStart = -1;
for (let i = start + 'const data = '.length; i < html.length; i++) {
  const ch = html[i];
  if (ch === '{') {
    if (depth === 0) jsonStart = i;
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0) {
      try {
        data = JSON.parse(html.substring(jsonStart, i + 1));
        break;
      } catch (_) {}
    }
  }
}
if (!data) {
  console.log('Parse failed');
  process.exit(1);
}

const tree = data.tree;
const mainChunk = tree.children.find((c) => c.name && c.name.includes('index.C713lJ0C'));
const indexChunk = tree.children.find((c) => c.name && c.name.includes('index.') && c.name.endsWith('.js'));
const targetChunk = mainChunk || indexChunk;

if (!targetChunk) {
  console.log('Chunks:', tree.children.map((c) => c.name).join('\n'));
  process.exit(0);
}

console.log('Analyzing:', targetChunk.name);
console.log('---\nTop modules by size (renderedLength):\n');

const big = [];
function walk(node, pathStr) {
  if (!node) return;
  const p = pathStr + (pathStr ? '/' : '') + (node.name || '');
  if (node.uid && data.nodeParts && data.nodeParts[node.uid]) {
    const parts = data.nodeParts[node.uid];
    const size = parts.renderedLength || 0;
    if (size > 5000) {
      big.push({ path: p, size, name: node.name, gzip: parts.gzipLength || 0 });
    }
  }
  if (node.children) {
    node.children.forEach((c) => walk(c, p));
  }
}
walk(targetChunk, '');

big.sort((a, b) => b.size - a.size);
big.slice(0, 25).forEach((x) => {
  console.log(`${(x.size / 1024).toFixed(1).padStart(8)} kB (gzip: ${(x.gzip / 1024).toFixed(1)} kB) - ${x.name}`);
});
