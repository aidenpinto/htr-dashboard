# Check-in Based Access Control Implementation

This document outlines the implementation of check-in based access control in the HTR Dashboard.

## Overview

The system now differentiates between users based on their check-in status:
- **Not Checked In**: Can only see registration, discord, and resources tabs
- **Checked In**: Can see teams, schedule, notifications, devpost, discord, and resources tabs

## Database Changes Required

### Manual SQL to Run

Execute this SQL in your Supabase SQL editor:

```sql
-- Add checked_in column to registrations table
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Add an index for better performance when filtering by check-in status
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON public.registrations(checked_in);

-- Add a comment to document the column
COMMENT ON COLUMN public.registrations.checked_in IS 'Indicates whether the participant has been checked in at the event';
```

## Code Changes Made

### 1. Created Check-in Status Hook
- **File**: `src/hooks/use-checkin-status.tsx`
- **Purpose**: Provides a React hook to check if a user is checked in
- **Features**: 
  - Automatically checks user's check-in status from registrations table
  - Handles cases where the checked_in column might not exist yet
  - Provides loading state and refresh functionality

### 2. Updated Dashboard Component
- **File**: `src/pages/Dashboard.tsx`
- **Changes**:
  - Added conditional tab rendering based on check-in status
  - Not checked in: Only shows Registration, Discord, Resources tabs
  - Checked in: Shows Teams, Schedule, Notifications, Devpost, Discord, Resources tabs
  - Updated notification loading to only work for checked-in users
  - Added loading state for check-in status

### 3. Updated Team Management
- **File**: `src/components/TeamManagement.tsx`
- **Changes**:
  - Added check to prevent inviting users who are not checked in
  - Shows warning message if trying to invite non-checked-in users
  - Only allows team invitations between checked-in participants

### 4. Updated Notification Components
- **File**: `src/components/NewUserNotifications.tsx`
- **Changes**:
  - Added check-in status validation
  - Only loads and shows notifications for checked-in users
  - Real-time subscriptions only active for checked-in users

### 5. Updated Team Invite Notifications
- **File**: `src/components/TeamInviteNotification.tsx`
- **Changes**:
  - Added check-in status validation for responding to invites
  - Disabled invite response buttons for non-checked-in users
  - Shows warning message for non-checked-in users

## Admin Features

The existing AdminRegistrations component already supports:
- Viewing check-in status of all participants
- Filtering by check-in status (all, checked-in, not-checked-in)
- Toggling check-in status for individual participants

## How It Works

1. **User Registration**: Users can still register regardless of check-in status
2. **Check-in Process**: Admins use the Admin panel to check users in when they arrive
3. **Access Control**: The dashboard automatically updates to show appropriate tabs based on check-in status
4. **Team Invitations**: Only checked-in users can be invited to or create teams
5. **Notifications**: Only checked-in users receive and can view notifications

## Testing

1. Start the development server: `npm run dev`
2. Log in as a regular user - should only see Registration, Discord, Resources tabs
3. Use admin panel to check the user in
4. Refresh the dashboard - should now see all tabs including Teams, Schedule, Notifications
5. Test team invitations between checked-in and non-checked-in users

## Security Considerations

- Check-in status can only be modified by administrators
- All client-side checks are backed by server-side validation
- Users cannot manipulate their own check-in status
- Team invitations and notifications are filtered at the API level

## Future Enhancements

- Add real-time updates when a user's check-in status changes
- Add check-in notifications to users when they're checked in
- Add bulk check-in functionality for administrators
- Add check-in analytics and reporting
