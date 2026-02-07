#!/usr/bin/env node
/**
 * Creates minimal valid MP3 placeholder files for notification sounds.
 * Replace with proper audio assets when available.
 */
const fs = require('fs');
const path = require('path');

// Minimal valid MP3 frame (silent, ~24 bytes) - LAME 3.96.1 minimal frame
const MINIMAL_MP3 = Buffer.from(
  'FFF314C40000000348000000004C414D45332E39362E3155',
  'hex'
);

const SOUNDS_DIR = path.join(__dirname, '..', 'public', 'sounds');
const FILES = ['shift-ping.mp3', 'roster-ding.mp3', 'notification.mp3'];

if (!fs.existsSync(SOUNDS_DIR)) {
  fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

FILES.forEach((name) => {
  const filePath = path.join(SOUNDS_DIR, name);
  fs.writeFileSync(filePath, MINIMAL_MP3);
  console.log('Created:', filePath);
});
