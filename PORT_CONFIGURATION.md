# Port Configuration

This document outlines the port configuration for the SALLY application.

## Port Assignments

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Sally Dashboard** | 3000 | http://localhost:3000 | Next.js frontend application |
| **Transcription Server** | 3001 | ws://localhost:3001 | WebSocket server for real-time transcription |
| **DISCO Analysis Server** | 8000 | https://sallydisco-1027340211739.asia-southeast1.run.app | Node.js API for DISCO analysis |

## Quick Start

### Start All Services
```bash
# Terminal 1: Start Sally Dashboard
npm run dev

# Terminal 2: Start Transcription Server  
npm run transcription-server

# Terminal 3: Start your DISCO Analysis Server on port 8000
# (Your existing Node.js server)
```

### With Electron
```bash
npm run electron-dev-with-transcription
```

## Service Dependencies

- **Sally Dashboard** (3000) connects to:
  - Transcription Server (3001) for real-time audio transcription
  - DISCO Analysis Server (8000) for conversation analysis

- **Transcription Server** (3001) provides:
  - WebSocket connection for audio streaming
  - Real-time transcription via Deepgram

- **DISCO Analysis Server** (8000) provides:
  - REST API for DISCO framework analysis
  - Conversation processing and insights extraction

## Verification

### Check Sally Dashboard
```bash
curl http://localhost:3000
```

### Check Transcription Server
```bash
curl http://localhost:3001/health
```

### Test DISCO API
```bash
node test-disco-integration.js
```

## Configuration Files

### Frontend (Sally Dashboard)
- **File**: `hooks/use-transcription.ts`
- **WebSocket**: `ws://localhost:3001`
- **DISCO API**: `https://sallydisco-1027340211739.asia-southeast1.run.app/api/analyze-disco`

### Transcription Server
- **File**: `server/transcription-server.js`
- **Port**: 3001 (default)
- **Health Check**: `http://localhost:3001/health`

### Test Script
- **File**: `test-disco-integration.js`
- **DISCO API**: `https://sallydisco-1027340211739.asia-southeast1.run.app/api/analyze-disco`

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
npx kill-port 3000
npx kill-port 3001
npx kill-port 8000
```

### Service Dependencies
1. **Transcription Server** must be running before starting Sally Dashboard
2. **DISCO Analysis Server** must be running for DISCO panel updates
3. **Sally Dashboard** coordinates between transcription and analysis

### Common Issues
- **No transcription**: Check if transcription server is running on port 3001
- **No DISCO data**: Check if DISCO analysis server is running on port 8000
- **WebSocket errors**: Verify transcription server is accessible
- **API errors**: Verify DISCO analysis server is accessible

## Development Workflow

1. **Start DISCO Analysis Server** (port 8000) - Your existing Node.js server
2. **Start Transcription Server**: `npm run transcription-server`
3. **Start Sally Dashboard**: `npm run dev`
4. **Open browser**: Navigate to http://localhost:3000
5. **Test transcription**: Start recording and speak
6. **Test DISCO analysis**: Watch panels update automatically
