import * as fs from 'fs';

console.log('Test script running!');
fs.writeFileSync('test-output-file.txt', 'Script executed successfully!');
console.log('File written!');
process.exit(0);

