const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath;
  
  if (req.url === '/') {
    filePath = path.join(__dirname, 'client', 'index.html');
  } else if (req.url.startsWith('/src/')) {
    filePath = path.join(__dirname, 'client', req.url);
  } else {
    filePath = path.join(__dirname, 'client', req.url);
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.tsx')) contentType = 'application/javascript';
    if (filePath.endsWith('.ts')) contentType = 'application/javascript';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:5000');
});