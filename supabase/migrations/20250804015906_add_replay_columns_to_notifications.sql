-- Add replay functionality columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN is_replay BOOLEAN DEFAULT FALSE,
ADD COLUMN original_notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;

-- Add index for better performance when querying replay notifications
CREATE INDEX idx_notifications_is_replay ON public.notifications(is_replay);
CREATE INDEX idx_notifications_original_id ON public.notifications(original_notification_id); 