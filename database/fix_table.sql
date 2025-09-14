-- Check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Add callsTaken column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'callsTaken'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN callsTaken INTEGER DEFAULT 0;
    END IF;
    
    -- Add createdAt column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updatedAt column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add outlookConnected column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'outlookConnected'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN outlookConnected BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add gmailConnected column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'gmailConnected'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN gmailConnected BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add dateJoined column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'dateJoined'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN dateJoined TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create the updatedAt trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
