# DISCO Analysis Integration

This document explains how the live transcription data is integrated with your Node.js DISCO analysis API to populate the DISCO panels in real-time.

## Overview

The integration automatically sends live transcription data to your Node.js DISCO analysis server at `localhost:8000` and updates the DISCO panels with real-time insights extracted from the conversation.

## How It Works

### 1. Live Transcription Capture
- The `useTranscription` hook captures both microphone and system audio
- Messages are stored in `allMessages` array with speaker identification
- Each message includes text, timestamp, speaker info, and final status

### 2. Automatic DISCO Analysis
- When final messages are added, a debounced analysis is triggered
- Waits 5 seconds after the last message before analyzing
- Only analyzes if conversation has substantial content (>100 characters)
- Sends conversation to `http://localhost:8000/api/analyze-disco`

### 3. Real-time Panel Updates
- DISCO data is stored in `discoData` state
- Panels automatically update with extracted insights
- Shows placeholder text when no data is available
- Displays loading indicators during analysis

## API Integration

### Endpoint Used
```
POST http://localhost:8000/api/analyze-disco
```

### Request Format
```json
{
  "conversation": "You: Hello...\nSpeaker 1: Hi there...",
  "context": {
    "type": "live_transcription",
    "currentDISCO": {
      "Decision_Criteria": "existing data...",
      "Impact": "existing data...",
      // ... other existing DISCO data
    }
  }
}
```

### Response Handling
- Merges new DISCO data with existing data
- Handles both string and array formats for each DISCO category
- Shows error messages if analysis fails
- Displays loading state during analysis

## Features

### Automatic Analysis
- Triggers automatically after each final message
- Debounced to avoid excessive API calls
- Only analyzes substantial conversations

### Manual Analysis
- "Analyze DISCO" button in header for manual triggering
- Useful for testing or forcing re-analysis
- Shows loading state during analysis

### Error Handling
- Network errors are displayed to user
- API errors are shown in error panel
- Graceful fallback to placeholder text

### Real-time Updates
- Panels update immediately when new data arrives
- Preserves existing data while adding new insights
- Visual indicators for analysis status

## Testing

### Test Script
Run the included test script to verify your API is working:

```bash
node test-disco-integration.js
```

### Manual Testing
1. Start your Node.js DISCO analysis server on `localhost:8000`
2. Start the transcription server on `localhost:3001`
3. Start the Sally dashboard on `localhost:3000`
4. Start recording in the dashboard
5. Have a conversation
6. Watch DISCO panels update automatically
7. Use "Analyze DISCO" button for manual testing

## Configuration

### Analysis Timing
- Debounce delay: 5 seconds (configurable in `scheduleDiscoAnalysis`)
- Minimum content length: 100 characters
- Only analyzes final messages (not interim)

### API Settings
- DISCO Analysis Server: `http://localhost:8000`
- Sally Dashboard: `http://localhost:3000`
- Transcription Server: `ws://localhost:3001`
- Endpoint: `/api/analyze-disco`
- Content-Type: `application/json`

## Troubleshooting

### Common Issues

1. **No DISCO data appearing**
   - Check if DISCO analysis server is running on port 8000
   - Check if transcription server is running on port 3001
   - Check if Sally dashboard is running on port 3000
   - Verify API endpoint is accessible
   - Check browser console for errors

2. **Analysis not triggering**
   - Ensure messages are marked as `isFinal: true`
   - Check if conversation length exceeds minimum threshold
   - Verify debounce timer is working

3. **API errors**
   - Check server logs for detailed error messages
   - Verify request format matches API expectations
   - Ensure CORS is properly configured

### Debug Information
- Check browser console for detailed logs
- DISCO analysis status is shown in the UI
- Error messages are displayed in the error panel

## Future Enhancements

### Potential Improvements
- Configurable analysis timing
- Batch analysis for multiple conversations
- Historical DISCO data storage
- Export functionality for DISCO insights
- Real-time collaboration features

### Performance Optimizations
- Caching of analysis results
- Incremental analysis updates
- Background processing for large conversations
- Rate limiting for API calls

## Files Modified

- `hooks/use-transcription.ts` - Added DISCO analysis logic
- `contexts/transcription-context.tsx` - Updated context interface
- `app/dashboard/page.tsx` - Updated UI to show real DISCO data
- `test-disco-integration.js` - Test script for API verification

## Dependencies

- React hooks for state management
- Fetch API for HTTP requests
- Debounced analysis to prevent excessive API calls
- Real-time transcription data processing
