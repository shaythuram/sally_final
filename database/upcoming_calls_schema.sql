-- Create upcoming_calls table
CREATE TABLE upcoming_calls (
  call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  call_date DATE NOT NULL,
  call_time TIME NOT NULL,
  attendees JSONB DEFAULT '[]', -- array of attendee email addresses
  description TEXT DEFAULT '',
  agenda JSONB DEFAULT '[]', -- array of agenda items
  documents JSONB DEFAULT '[]', -- array of document information
  assistant_id TEXT, -- assistant associated with this scheduled call
  thread_id TEXT, -- thread associated with this scheduled call
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE upcoming_calls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for upcoming_calls
CREATE POLICY "Users can view own upcoming calls" 
ON upcoming_calls 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own upcoming calls" 
ON upcoming_calls 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own upcoming calls" 
ON upcoming_calls 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own upcoming calls" 
ON upcoming_calls 
FOR DELETE 
USING (auth.uid() = owner_id);

-- Create trigger for upcoming_calls
CREATE TRIGGER update_upcoming_calls_updated_at 
  BEFORE UPDATE ON upcoming_calls 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_upcoming_calls_owner_id ON upcoming_calls(owner_id);
CREATE INDEX idx_upcoming_calls_call_date ON upcoming_calls(call_date);
CREATE INDEX idx_upcoming_calls_company ON upcoming_calls(company);
CREATE INDEX idx_upcoming_calls_assistant_id ON upcoming_calls(assistant_id);
CREATE INDEX idx_upcoming_calls_thread_id ON upcoming_calls(thread_id);
