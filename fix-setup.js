const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing SALLY setup...');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  const { spawn } = require('child_process');
  const install = spawn('npm', ['install'], { stdio: 'inherit', shell: true });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully');
      console.log('\n🚀 You can now run:');
      console.log('  npm run start-dev          # Start everything (recommended)');
      console.log('  npm run electron-dev       # Start just Electron with Next.js');
      console.log('  npm run dev:transcription  # Start Next.js with transcription server');
    } else {
      console.log('❌ Failed to install dependencies');
    }
  });
} else {
  console.log('✅ Dependencies already installed');
  console.log('\n🚀 You can now run:');
  console.log('  npm run start-dev          # Start everything (recommended)');
  console.log('  npm run electron-dev       # Start just Electron with Next.js');
  console.log('  npm run dev:transcription  # Start Next.js with transcription server');
}

console.log('\n📋 Available commands:');
console.log('  npm run start-dev                    # Start all services');
console.log('  npm run electron-dev                 # Start Electron + Next.js');
console.log('  npm run dev:transcription            # Start Next.js + transcription server');
console.log('  npm run electron-dev-with-transcription # Start everything');
console.log('  npm run dev                          # Just Next.js dev server');
console.log('  npm run transcription-server         # Just transcription server');
