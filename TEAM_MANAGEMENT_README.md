# Team Management System

This document explains the team management feature for the Hack the Ridge dashboard.

## Overview

The team management system allows participants to:
- Create teams with up to 4 members
- Invite other participants via email
- Finalize team registration by selecting a room
- View and manage team details

Admins can:
- View all teams organized by room
- Edit team details and room assignments
- Send notifications to specific teams
- Confirm team placements

## Database Setup

### 1. Run the SQL Migration

Copy and paste the contents of `scripts/setup_team_system.sql` into your Supabase SQL Editor and run it.

This will create:
- `teams` table - stores team information
- `team_members` table - tracks team membership
- `team_invites` table - manages team invitations
- Row Level Security (RLS) policies
- Helper functions for team management

### 2. Room Configuration

The system supports the following rooms with capacity limits:
- **Regular Rooms (124, 123, 121, etc.)**: Maximum 2 teams per room
- **Library**: Unlimited capacity
- **Library Conference Room**: Maximum 2 teams

## User Features

### Creating a Team

1. Navigate to the "Teams" tab in the dashboard
2. Enter a team name
3. Click "Create Team"
4. You become the team leader automatically

### Inviting Members

1. In your team view, enter email addresses (comma-separated)
2. Click "Invite"
3. Invited users will see pending invites in their Teams tab
4. They can accept or decline the invitation

### Finalizing Team Registration

1. As team leader, select a room from the dropdown
2. Click "Finalize"
3. The system checks room capacity
4. Once finalized, no changes can be made

### Accepting Invites

1. Users with pending invites see them in the Teams tab
2. Click "Accept" or "Decline"
3. If accepted, they join the team immediately

## Admin Features

### Viewing Teams

1. Navigate to Admin Dashboard → Teams tab
2. Teams are grouped by room
3. Each team shows:
   - Team name and leader
   - Member count
   - Finalization status
   - Room assignment

### Managing Teams

1. Click "Edit" on any team
2. Change room assignment
3. Send notifications to team members
4. Click "Confirm" to mark placement as verified

### Room Management

- Admins can override the 2-team-per-room limit
- Drag teams between rooms (future feature)
- View room capacity and occupancy

## Database Schema

### Teams Table
```sql
teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  leader_id UUID REFERENCES auth.users(id),
  room VARCHAR(50) NOT NULL,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Team Members Table
```sql
team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'declined')),
  joined_at TIMESTAMP
)
```

### Team Invites Table
```sql
team_invites (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  inviter_id UUID REFERENCES auth.users(id),
  invitee_email VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP,
  expires_at TIMESTAMP
)
```

## Security Features

### Row Level Security (RLS)
- Users can only view teams they're members of
- Team leaders can update their teams
- Users can only manage their own team membership
- Invites are restricted to team leaders

### Validation Rules
- Maximum 4 members per team
- Room capacity limits enforced
- Only team leaders can finalize teams
- Finalized teams cannot be modified

## API Functions

### Helper Functions
- `is_team_leader(team_uuid, user_uuid)` - Check if user is team leader
- `get_team_members_count(team_uuid)` - Get member count
- `check_room_capacity(room_name, team_id)` - Check room availability

## Troubleshooting

### Common Issues

1. **"Failed to create team"**
   - Check if user is authenticated
   - Verify RLS policies are active

2. **"Room is at full capacity"**
   - Regular rooms have 2-team limit
   - Library has unlimited capacity
   - Check current room occupancy

3. **"Failed to send invites"**
   - Verify email addresses exist in profiles table
   - Check invitee_email format

4. **"Cannot finalize team"**
   - Only team leaders can finalize
   - Team must have at least 1 member
   - Room must have available capacity

### Database Queries

Check team membership:
```sql
SELECT * FROM team_members WHERE user_id = 'user-uuid';
```

Check room capacity:
```sql
SELECT COUNT(*) FROM teams WHERE room = 'room-name' AND is_finalized = TRUE;
```

View pending invites:
```sql
SELECT * FROM team_invites WHERE invitee_email = 'email@example.com' AND status = 'pending';
```

## Future Enhancements

- Drag-and-drop team management for admins
- Team chat functionality
- Team project submission integration
- Advanced room scheduling
- Team performance metrics

## Support

For issues or questions about the team management system, please contact the development team. 