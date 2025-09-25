-- Create calls table
CREATE TABLE calls (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  call_date DATE NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  attendees INTEGER DEFAULT 0,
  attendee_emails JSONB DEFAULT '[]', -- array of attendee email addresses
  
  -- Meeting Planning
  meeting_agenda JSONB DEFAULT '[]', -- list of agenda items
  meeting_description TEXT, -- description of the meeting
  
  -- AI & Analysis
  ai_summary TEXT,
  assistant_id TEXT, -- ID of the assistant created for this call
  thread_id TEXT, -- ID of the thread associated with this call
  bot_id TEXT, -- ID of the bot handling this call
  meeting_id TEXT, -- External meeting identifier
  
  -- Status & Metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  -- Media & Content
  voice_recording_path TEXT, -- path to audio file in Supabase Storage
  transcript JSONB DEFAULT '{}', -- JSON object with transcript data and permissions
  transcript_speakers JSONB DEFAULT '{}', -- speaker identification data
  
  -- DISCO Framework Data
  disco_data JSONB DEFAULT '{}', -- Decision Criteria, Impact, Situation, Challenges, Objectives
  
  -- Post-Call Actions & Completion
  post_call_actions JSONB DEFAULT '{}', -- dictionary with action keys and completion status values
  post_call_completion INTEGER DEFAULT 0, -- percentage
  tasks_completed INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  
  -- Genie Content
  genie_content JSONB DEFAULT '[]', -- list of genie content items
  labels JSONB DEFAULT '[]', -- list of labels { text, color }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calls
CREATE POLICY "Users can view own calls" 
ON calls 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calls" 
ON calls 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own calls" 
ON calls 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own calls" 
ON calls 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create policy for users with edit permissions
CREATE POLICY "Users with edit permissions can update transcript" 
ON calls 
FOR UPDATE 
USING (
  auth.uid() = owner_id OR 
  jsonb_exists(transcript->'permissions'->'editors', auth.jwt() ->> 'email')
);

-- Create trigger for calls
CREATE TRIGGER update_calls_updated_at 
  BEFORE UPDATE ON calls 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_calls_owner_id ON calls(owner_id);
CREATE INDEX idx_calls_call_date ON calls(call_date);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_company ON calls(company);
CREATE INDEX idx_calls_assistant_id ON calls(assistant_id);
CREATE INDEX idx_calls_thread_id ON calls(thread_id);
CREATE INDEX idx_calls_bot_id ON calls(bot_id);
CREATE INDEX idx_calls_meeting_id ON calls(meeting_id);
