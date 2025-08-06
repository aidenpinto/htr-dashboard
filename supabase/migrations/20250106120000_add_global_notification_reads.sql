-- Create table to track which users have read which global notifications
CREATE TABLE public.notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

-- Create indexes for better performance
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads(notification_id);

-- Enable Row Level Security
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can only view their own reads
CREATE POLICY "Users can view their own reads" ON public.notification_reads
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reads (mark as read)
CREATE POLICY "Users can mark notifications as read" ON public.notification_reads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER TABLE public.notification_reads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;
