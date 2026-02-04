const fs = require('fs');

// Fix encoding issues in earnings.tsx
const earningsPath = 'c:/Users/USER/Snipshift/src/pages/earnings.tsx';
let content = fs.readFileSync(earningsPath, 'utf8');

// Replace corrupted em-dash with proper em-dash
// The corrupted version is: â€" (which is the UTF-8 bytes for — interpreted as latin-1)
const corrupted = Buffer.from([0xc3, 0xa2, 0xe2, 0x82, 0xac, 0xe2, 0x80, 0x9c]).toString('utf8');
content = content.replace(new RegExp(corrupted, 'g'), '—');

// Also try direct string replacement for common corrupted patterns
content = content.replace(/â€"/g, '—');

fs.writeFileSync(earningsPath, content, 'utf8');
console.log('Fixed earnings.tsx');
