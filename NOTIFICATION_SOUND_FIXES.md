# Notification Sound Testing Guide

This guide explains how to test the notification sound fixes for global notifications and replay notifications on the participant dashboard.

## Issues Fixed

1. **Global notification sounds not playing**: Fixed audio context initialization and management
2. **Replay notification sounds not playing**: Fixed audio context reuse and proper initialization
3. **Mobile audio issues**: Added proper user interaction handling and fallback to vibration

## Key Improvements

### 1. Persistent Audio Context
- Audio contexts are now properly initialized once and reused
- Automatic resume from suspended state (required for mobile)
- Proper cleanup and error handling

### 2. Mobile-Friendly Audio
- Audio context initialization on user interaction
- Vibration fallback when audio fails
- Proper handling of suspended audio contexts

### 3. Real-time Detection
- Improved new notification detection in NotificationBanner
- Added proper delays for audio context stabilization
- Enhanced logging for debugging

### 4. Better Error Handling
- Graceful fallbacks to vibration
- Detailed console logging for debugging
- Recovery mechanisms for failed audio initialization

## How to Test

### Testing Global Notifications (Admin Dashboard)

1. Open the Admin Dashboard
2. Go to Notifications Management → Global tab
3. Click "Test Sound" button to send a test notification
4. Check participant dashboard for sound/vibration

### Testing Replay Functionality

1. Create a global notification from admin panel
2. Click the replay button (Play icon) on an existing notification
3. Check participant dashboard for replay sound/vibration

### Testing on Participant Dashboard

1. Open participant dashboard
2. Go to Notifications tab
3. Use the "Notification Sound Test" component to:
   - Initialize audio context
   - Test global notification sounds
   - Test replay sounds

### Browser Console Testing

Open browser console on participant dashboard and run:

```javascript
// Test global notification sound
testNotificationSound();

// Test replay notification sound  
testReplayNotificationSound();

// Test audio initialization
testGlobalNotificationAudio();
```

## Expected Behavior

### For Global Notifications:
- **Desktop**: Should hear a pleasant notification sound (800Hz → 1000Hz → 800Hz pattern)
- **Mobile**: Sound if possible, otherwise device vibration (150ms-50ms-150ms)
- **Fallback**: Vibration if audio completely fails

### For Replay Notifications:
- **Desktop**: Should hear an attention-grabbing sound (600Hz → 800Hz → 1000Hz → 800Hz → 600Hz pattern)
- **Mobile**: Sound if possible, otherwise stronger vibration pattern (200ms-100ms-200ms-100ms-200ms)
- **Fallback**: Single vibration if audio completely fails

## Troubleshooting

### No Sound on Desktop
1. Check browser's audio policy settings
2. Ensure user has interacted with the page first
3. Check browser console for error messages
4. Try the test buttons to initialize audio context

### No Sound on Mobile
1. Ensure device isn't in silent mode
2. Check if vibration fallback triggers
3. Try tapping the screen first to enable audio context
4. Some mobile browsers require explicit user gesture for audio

### Debugging
- Check browser console for detailed logs
- Use the test components in the dashboard
- Verify notification data structure includes `is_replay` field
- Check real-time listeners are working in developer tools

## Files Modified

- `src/components/NotificationBanner.tsx` - Main global notification sound handling
- `src/components/TeamNotificationBanner.tsx` - Team notification sounds (for reference)
- `src/components/AdminNotifications.tsx` - Added test functionality
- `src/pages/Dashboard.tsx` - Enhanced real-time listeners and filtering
- `src/components/NotificationSoundTest.tsx` - New test component

## Technical Notes

- Audio contexts are created once and reused to prevent mobile issues
- Real-time updates trigger sound through proper state management
- Replay notifications use broadcast events to avoid database clutter
- Fallback mechanisms ensure users get feedback even if audio fails
