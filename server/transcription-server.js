const express = require('express');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.TRANSCRIPTION_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Deepgram configuration
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || 'ae2854b203e26ead1ddb518d5f29a209b9eceedc';
const deepgram = createClient(DEEPGRAM_API_KEY);

// Store active connections
const connections = new Map();
let connectionCounter = 0;

// Track transcription state for each connection
const transcriptionState = new Map();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  let deepgramConnection = null;
  let connectionId = `conn_${++connectionCounter}_${Date.now()}`;
  
  // Store connection
  connections.set(connectionId, {
    ws,
    deepgramConnection,
    isTranscribing: false
  });

  // Initialize transcription state
  transcriptionState.set(connectionId, {
    lastFinalTranscript: '',
    lastInterimTranscript: '',
    isProcessing: false
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'start_transcription':
          await handleStartTranscription(connectionId, message);
          break;
          
        case 'audio_data':
          handleAudioData(connectionId, message.data);
          break;
          
        case 'stop_transcription':
          handleStopTranscription(connectionId);
          break;
          
        case 'update_diarization':
          handleUpdateDiarization(connectionId, message);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket connection ${connectionId} closed`);
    handleStopTranscription(connectionId);
    connections.delete(connectionId);
    transcriptionState.delete(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    handleStopTranscription(connectionId);
    connections.delete(connectionId);
    transcriptionState.delete(connectionId);
  });

  // Add ping/pong to keep connection alive
  ws.on('pong', () => {
    console.log(`Received pong from ${connectionId}`);
  });

  // Send ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  // Clean up ping interval when connection closes
  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

async function handleStartTranscription(connectionId, message) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  try {
    console.log(`Starting transcription for connection ${connectionId}`);
    
    // Get diarization setting from message (default to true for backward compatibility)
    const enableDiarization = message.diarization !== undefined ? message.diarization : true;
    
    // Create Deepgram connection
    const deepgramConnection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      diarize: enableDiarization, // Enable/disable speaker diarization based on toggle
      encoding: 'linear16',
      sample_rate: 16000,
    });

    // Handle Deepgram responses
    deepgramConnection.on('Results', (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && transcript.trim()) {
        const state = transcriptionState.get(connectionId);
        if (!state) return;

        const isFinal = data.is_final || false;
        const cleanTranscript = transcript.trim();
        
        // Prevent duplicate final results
        if (isFinal) {
          if (state.lastFinalTranscript === cleanTranscript) {
            console.log(`Skipping duplicate final transcript for ${connectionId}`);
            return;
          }
          state.lastFinalTranscript = cleanTranscript;
          state.lastInterimTranscript = ''; // Clear interim when we get final
        } else {
          // For interim results, check if it's different from last interim
          if (state.lastInterimTranscript === cleanTranscript) {
            console.log(`Skipping duplicate interim transcript for ${connectionId}`);
            return;
          }
          state.lastInterimTranscript = cleanTranscript;
        }

        // Extract speaker information
        const speaker = data.channel?.alternatives?.[0]?.words?.[0]?.speaker || null;
        const speakerLabel = speaker !== null ? `Speaker ${speaker + 1}` : null;
        
        console.log(`Transcription for ${connectionId}: ${cleanTranscript} (final: ${isFinal})${speakerLabel ? ` [${speakerLabel}]` : ''}`);
        connection.ws.send(JSON.stringify({
          type: 'transcription',
          transcript: cleanTranscript,
          is_final: isFinal,
          confidence: data.channel?.alternatives?.[0]?.confidence || 0,
          speaker: speaker,
          speaker_label: speakerLabel
        }));
      }
    });

    deepgramConnection.on('Error', (error) => {
      console.error('Deepgram error:', error);
      if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'error',
          message: 'Transcription error occurred'
        }));
      }
    });

    deepgramConnection.on('Close', () => {
      console.log(`Deepgram connection closed for ${connectionId}`);
      if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'transcription_stopped'
        }));
      }
    });

    // Add timeout handling
    deepgramConnection.on('Metadata', (data) => {
      console.log(`Deepgram metadata for ${connectionId}:`, data);
    });

    // Update connection
    connection.deepgramConnection = deepgramConnection;
    connection.isTranscribing = true;

    // Send confirmation
    connection.ws.send(JSON.stringify({
      type: 'transcription_started',
      message: `Transcription started successfully for ${connectionId}`
    }));

  } catch (error) {
    console.error('Error starting transcription:', error);
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to start transcription'
    }));
  }
}

function handleAudioData(connectionId, audioData) {
  const connection = connections.get(connectionId);
  if (!connection || !connection.deepgramConnection || !connection.isTranscribing) {
    return;
  }

  try {
    // Convert base64 audio data to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Send audio data to Deepgram
    connection.deepgramConnection.send(audioBuffer);
  } catch (error) {
    console.error('Error sending audio data:', error);
  }
}

function handleUpdateDiarization(connectionId, message) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  console.log(`Updating diarization for connection ${connectionId}: ${message.diarization}`);
  
  // Store the diarization setting for this connection
  if (connection.deepgramConnection) {
    // Note: Deepgram doesn't support changing diarization mid-stream
    // We'll need to restart the connection with new settings
    console.log('Diarization setting updated, will apply on next restart');
  }
  
  connection.ws.send(JSON.stringify({
    type: 'diarization_updated',
    diarization: message.diarization
  }));
}

function handleStopTranscription(connectionId) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  console.log(`Stopping transcription for connection ${connectionId}`);

  if (connection.deepgramConnection) {
    connection.deepgramConnection.finish();
    connection.deepgramConnection = null;
  }
  
  connection.isTranscribing = false;
  
  // Reset transcription state
  const state = transcriptionState.get(connectionId);
  if (state) {
    state.lastFinalTranscript = '';
    state.lastInterimTranscript = '';
    state.isProcessing = false;
  }
  
  connection.ws.send(JSON.stringify({
    type: 'transcription_stopped',
    message: `Transcription stopped for ${connectionId}`
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: connections.size,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`Transcription server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down transcription server...');
  
  // Close all WebSocket connections
  connections.forEach((connection) => {
    if (connection.deepgramConnection) {
      connection.deepgramConnection.finish();
    }
    connection.ws.close();
  });
  
  server.close(() => {
    console.log('Transcription server closed');
    process.exit(0);
  });
});
