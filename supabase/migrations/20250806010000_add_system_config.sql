-- Create system configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create RLS policies for system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read system config
CREATE POLICY "Admins can read system config" ON system_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Allow admins to insert system config
CREATE POLICY "Admins can insert system config" ON system_config
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Allow admins to update system config
CREATE POLICY "Admins can update system config" ON system_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Allow public read access for non-sensitive config like registration_open
CREATE POLICY "Anyone can read public system config" ON system_config
    FOR SELECT USING (
        key IN ('registration_open')
    );

-- Insert default configuration
INSERT INTO system_config (key, value) VALUES 
    ('registration_open', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;