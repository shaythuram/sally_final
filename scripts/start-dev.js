const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SALLY development environment...');

// Start Next.js dev server
console.log('📦 Starting Next.js development server...');
const nextDev = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

// Start transcription server
console.log('🎤 Starting transcription server...');
const transcriptionServer = spawn('npm', ['run', 'transcription-server'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

// Start Electron after a delay
setTimeout(() => {
  console.log('⚡ Starting Electron app...');
  const electron = spawn('npm', ['run', 'electron'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_DEV: 'true' }
  });

  electron.on('close', (code) => {
    console.log('🛑 Electron app closed');
    nextDev.kill();
    transcriptionServer.kill();
    process.exit(code);
  });
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development environment...');
  nextDev.kill();
  transcriptionServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development environment...');
  nextDev.kill();
  transcriptionServer.kill();
  process.exit(0);
});
