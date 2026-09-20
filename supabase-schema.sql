-- Create tables for LiveTranslate Chat

-- Rooms Table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(6) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by VARCHAR NOT NULL
);

-- Participants Table
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    gender VARCHAR NOT NULL,
    language VARCHAR NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id VARCHAR NOT NULL,
    sender_name VARCHAR NOT NULL,
    sender_gender VARCHAR,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    original_language VARCHAR,
    target_language VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    translation_status VARCHAR DEFAULT 'completed'
);

-- Set up Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public access for MVP (since there is no auth/login)
-- In a production app with login, you would restrict this to authenticated users
CREATE POLICY "Allow public read/insert on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/insert/update on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/insert on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for rooms, participants, and messages
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table messages;
