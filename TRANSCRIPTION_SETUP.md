# SALLY Transcription Integration

This document explains how to set up and use the live transcription feature in the SALLY dashboard.

## Overview

The transcription feature integrates the same mechanism from `new_sally_01` into the SALLY app, providing:

- **Live transcription** of both system audio and microphone input
- **Speaker diarization** to identify different speakers
- **Real-time chat interface** showing transcribed messages
- **Screen capture** support for recording system audio
- **WebSocket-based** communication with Deepgram API

## Setup Instructions

### 1. Install Dependencies

The required dependencies have been added to `package.json`. Install them by running:

```bash
npm install
```

### 2. Set Up Deepgram API Key

The transcription server uses Deepgram for speech-to-text conversion. You can either:

**Option A: Use the provided API key (for testing)**
- The server is configured with a test API key
- This may have usage limits

**Option B: Use your own API key**
1. Sign up at [Deepgram](https://deepgram.com)
2. Get your API key
3. Set the environment variable:
   ```bash
   export DEEPGRAM_API_KEY=your_api_key_here
   ```

### 3. Start the Services

**For development with transcription:**

```bash
npm run dev:transcription
```

This will start:
- Next.js development server on port 3000
- Transcription server on port 3001

**For Electron app with transcription:**

```bash
npm run electron-dev
```

### 4. Access the Transcription Page

1. Open the SALLY dashboard
2. Navigate to the "Transcription" page in the sidebar
3. The page will load with screen capture options

## Features

### Screen Capture
- Select from available screens and windows
- Real-time video preview during recording
- Captures both audio and video from selected source

### Live Transcription
- **System Audio**: Transcribes audio from the selected screen/window
- **Microphone**: Transcribes your voice input
- **Speaker Diarization**: Identifies different speakers in system audio
- **Real-time Display**: Shows transcription in a chat-like interface

### Controls
- **Start/Stop Recording**: Begin or end transcription session
- **Speaker Diarization Toggle**: Enable/disable speaker identification
- **Screen Source Selection**: Choose which screen/window to capture
- **Live Status Indicators**: See which audio sources are active

## Usage

### Starting a Transcription Session

1. **Select Screen Source**: Choose the screen or window you want to capture
2. **Configure Settings**: 
   - Toggle speaker diarization on/off
   - Ensure microphone permissions are granted
3. **Start Recording**: Click "Start Transcription"
4. **Monitor Progress**: Watch the live transcription appear in real-time

### During Recording

- **System Audio**: Appears on the left side of the chat
- **Microphone Input**: Appears on the right side of the chat
- **Speaker Identification**: Different speakers get different colors
- **Live Preview**: Current microphone input shows in a preview box

### Stopping Recording

- Click "Stop Transcription" to end the session
- All audio streams and WebSocket connections will be closed
- Transcription history remains visible

## Technical Details

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SALLY App     │    │ Transcription    │    │   Deepgram      │
│   (Next.js)     │◄──►│    Server        │◄──►│     API         │
│                 │    │   (Express)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   Electron      │    │   WebSocket      │
│   Main Process  │    │   Connections    │
└─────────────────┘    └──────────────────┘
```

### Audio Processing

1. **System Audio**: Captured via Electron's `desktopCapturer` API
2. **Microphone**: Captured via `getUserMedia()` API
3. **Audio Processing**: Converted to 16kHz PCM for Deepgram
4. **Real-time Streaming**: Sent via WebSocket to transcription server

### WebSocket Protocol

The transcription server uses WebSocket for real-time communication:

**Client → Server:**
- `start_transcription`: Begin transcription with optional diarization setting
- `audio_data`: Send audio data as base64-encoded PCM
- `stop_transcription`: End transcription session
- `update_diarization`: Change diarization setting mid-session

**Server → Client:**
- `transcription`: Transcribed text with speaker information
- `transcription_started`: Confirmation of session start
- `transcription_stopped`: Confirmation of session end
- `error`: Error messages

## Troubleshooting

### Common Issues

1. **No Screen Sources Available**
   - Ensure you're running in Electron (not web browser)
   - Check that screen capture permissions are granted

2. **Microphone Not Working**
   - Grant microphone permissions in browser/Electron
   - Check system audio settings

3. **Transcription Server Connection Failed**
   - Ensure transcription server is running on port 3001
   - Check firewall settings
   - Verify WebSocket connection in browser dev tools

4. **Poor Transcription Quality**
   - Ensure good audio quality
   - Check microphone positioning
   - Verify Deepgram API key is valid

### Debug Mode

Enable debug logging by opening browser dev tools and checking the console for detailed logs.

## Security Notes

- The transcription server runs locally and doesn't send data to external servers except Deepgram
- Audio data is processed in real-time and not stored
- Screen capture requires explicit user permission
- WebSocket connections are local-only

## Performance Considerations

- **CPU Usage**: Real-time audio processing can be CPU intensive
- **Memory Usage**: Audio buffers and WebSocket connections use memory
- **Network**: WebSocket connections to local server are minimal overhead
- **API Limits**: Deepgram has usage limits based on your plan

## Future Enhancements

Potential improvements for the transcription feature:

1. **Recording Storage**: Save transcription sessions to files
2. **Export Options**: Export transcripts in various formats
3. **Language Support**: Support for multiple languages
4. **Custom Models**: Use custom Deepgram models
5. **Offline Mode**: Local transcription without internet
6. **Integration**: Connect with other SALLY features like call management
