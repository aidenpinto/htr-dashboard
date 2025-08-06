-- Create user_notifications table for targeted notifications
-- This allows sending notifications to specific users (like team members)

CREATE TABLE user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_team_id ON user_notifications(team_id);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at);

-- Enable Row Level Security
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON user_notifications
FOR SELECT USING (auth.uid() = user_id);

-- Admins can insert notifications for any user
CREATE POLICY "Admins can create notifications" ON user_notifications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON user_notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER TABLE user_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
