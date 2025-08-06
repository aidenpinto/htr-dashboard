# Registration Toggle Implementation

## Overview
Implemented a system-wide registration toggle that allows admins to close registration for participants. When registration is closed, participants cannot register or edit their registration details and are directed to contact hi@hacktheridge.ca for additional inquiries.

## Components Added/Modified

### 1. Database Migration
- **File**: `supabase/migrations/20250806010000_add_system_config.sql`
- **Purpose**: Creates a `system_config` table to store system-wide configuration settings
- **Features**:
  - RLS policies for admin-only updates
  - Public read access for non-sensitive settings like `registration_open`
  - Default value: registration is open by default

### 2. Admin System Settings Component
- **File**: `src/components/AdminSystemSettings.tsx`
- **Purpose**: Provides admin interface to toggle registration status
- **Features**:
  - Toggle switch to open/close registration
  - Real-time status updates
  - Loading states and error handling
  - Visual feedback for current state

### 3. Registration Utility Function
- **File**: `src/lib/registration-utils.ts`
- **Purpose**: Utility function to check registration status
- **Features**:
  - Centralized registration status checking
  - Error handling with sensible defaults (defaults to open)

### 4. Updated Registration Form
- **File**: `src/components/RegistrationForm.tsx`
- **Purpose**: Modified to respect registration status
- **Features**:
  - Checks registration status on load
  - Shows appropriate UI when registration is closed
  - Displays contact information (hi@hacktheridge.ca)
  - Shows existing registration status for already registered users
  - Prevents form submission when registration is closed

### 5. Updated Admin Interface
- **File**: `src/pages/Admin.tsx`
- **Purpose**: Added new "Settings" tab to admin interface
- **Features**:
  - New tab for system settings
  - Integrates AdminSystemSettings component

## User Experience

### For Participants (when registration is open):
- Normal registration form is displayed
- Can register or update existing registration
- Form functions as before

### For Participants (when registration is closed):
- Registration form is replaced with a "Registration Closed" message
- Clear indication that registration is not available
- Contact information (hi@hacktheridge.ca) prominently displayed
- If already registered, shows confirmation of existing registration

### For Admins:
- New "Settings" tab in admin interface
- Simple toggle switch to open/close registration
- Clear feedback on current state
- Status updates with toast notifications

## Technical Implementation

### Database Structure
```sql
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);
```

### Security
- RLS policies ensure only admins can modify settings
- Public read access only for specific non-sensitive keys
- Proper authentication checks in all components

### Error Handling
- Graceful degradation (defaults to open registration on errors)
- Toast notifications for user feedback
- Loading states during operations
- TypeScript type safety with `as any` workarounds for new table

## Usage Instructions

1. **To close registration**: 
   - Go to Admin → Settings tab
   - Toggle the "Registration Open" switch off
   - Confirmation toast will appear

2. **To reopen registration**:
   - Go to Admin → Settings tab  
   - Toggle the "Registration Open" switch on
   - Confirmation toast will appear

3. **Participants will immediately see**:
   - Closed registration message with contact email
   - Cannot access registration form
   - If already registered, see confirmation of existing registration

## Future Enhancements
- Additional system settings can be easily added to the `system_config` table
- Settings could include registration deadlines, maintenance mode, etc.
- Email templates for closed registration notifications
- Audit logging for settings changes
