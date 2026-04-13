# Match Dashboard Feature

## Overview

The Match Dashboard provides a real-time view of match schedules, countdowns, current match information, and historical scores. It includes a testing feature to set custom times for development and testing purposes.

## Features

### 1. **Match Countdown**
- Shows time remaining until your team's next match
- Displays the estimated time based on average match duration (~7 minutes per match)
- Updates in real-time with a live countdown timer
- Format: Hours, Minutes, Seconds (e.g., "2h 14m 35s")

### 2. **Current Match Display**
- Shows the match currently being played by your team (if any)
- Displays live status with pulsing "LIVE" indicator
- Shows all participating teams on both Red and Blue alliances
- Highlights your team's position
- Shows scores in real-time

### 3. **Next Match Information**
- Complete alliance composition (Red and Blue teams)
- Your team's alliance assignment (color-coded)
- Preparation checklist for quick reference
- All details displayed before the match starts

### 4. **Match History/Schedule**
- Complete list of all matches in the event
- Shows match status: Completed, Live, or Scheduled
- Highlights matches your team is participating in
- Displays final scores for completed matches
- Color-coded by alliance (Red/Blue)

### 5. **Test Time Controls** ⏰
- Toggle test controls with the 🧪 button in the header
- Set a custom "current time" for testing countdown functionality
- Test button colors:
  - **Set Time**: Apply a custom datetime
  - **Use Current**: Return to actual current time
- Useful for:
  - Testing countdown behavior at different stages
  - Simulating various match scenarios
  - Development and debugging

## UI Elements

### Colors & Styling
- **Red Alliance**: #ef4444 (bright red)
- **Blue Alliance**: #3b82f6 (bright blue)
- **Your Team**: Full solid color with black/white text (stands out)
- **Other Teams**: Semi-transparent background with color text

### Status Indicators
- ✓ Done: Completed matches (reduced opacity)
- 🔴 Live: Currently playing (pulsing animation)
- Scheduled: Upcoming matches

### Responsive Design
- **Desktop (1200px+)**: Full three-column alliance grid layout
- **Tablet (768px-1199px)**: Single column with optimized spacing
- **Mobile (< 768px)**: Fully optimized for small screens with touch-friendly controls

## Data Structure

### Mock Data Format
```typescript
interface Match {
  matchKey: string;        // e.g., "txcmp2_qm1"
  compLevel: string;       // "qm" (qualification matches)
  matchNumber: number;     // 1, 2, 3, etc.
  redTeams: string[];      // e.g., ["frc6377", "frc1690", "frc2345"]
  blueTeams: string[];
  redScore?: number;       // Only for completed matches
  blueScore?: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}
```

## How to Use

### Accessing the Dashboard
1. From the home page, click the **"Match Countdown"** card
2. Or navigate directly to `/match-dashboard`

### Using the Countdown Timer
- The timer automatically updates every second
- Shows estimated time until your team's next scheduled match
- Countdown is calculated as: `(next_match_number - current_match_number) × 7 minutes`

### Testing with Custom Times
1. Click the **🧪 Test Controls** button at the top
2. Use the datetime picker to select a test time
3. Click **Set Time** to activate the test time
4. Observe how the countdown updates based on the test time
5. Click **Use Current** to return to real time

### Monitoring Matches
- **Green highlight**: Matches your team plays in
- **Teal border**: Your team indicator in the schedule list
- **Live section**: Shows current match details if your team is playing
- **Up Next section**: Shows details of your team's upcoming match

## Current Implementation Notes

⚠️ **Important**: The dashboard currently uses mock data for demonstration. To integrate with real match data:

### Future Integration Steps
1. **Replace mock data** with real API calls to your backend
2. **Connect TBA API** (The Blue Alliance) for official match data:
   ```typescript
   - /api/v3/event/{eventKey}/matches
   - /api/v3/team/{teamKey}/event/{eventKey}/status
   ```
3. **Implement real-time updates** using WebSockets or SWR polling
4. **Add score sync** from official scoring systems

### Sample Integration Pattern
```typescript
import { useEventMatches } from '@/hooks/useEventData';

// Inside component:
const { matches, isLoading } = useEventMatches(eventKey);
// Replace mockMatches with matches
```

## Configuration

### Current Settings (Mockable)
- `eventKey`: "txcmp2" (change as needed)
- `teamKey`: "frc6377" (your team number)
- `currentMatchNumber`: 0 (update based on event progress)
- Match duration: 7 minutes (configurable)

### To Customize
Edit the initial state in `page.tsx`:
```typescript
const [state, setState] = useState<MatchDashboardState>({
  eventKey: 'txcmp2',      // ← Change here
  teamKey: 'frc6377',       // ← Change here
  currentMatchNumber: 0,    // ← Update as event progresses
});
```

## Styling

### CSS Modules Used
- **MatchDashboard.module.css**: All styles for the dashboard
- Theme variables applied:
  - `--primary-teal`: Primary accent color
  - `--primary-brown`: Secondary accent
  - `--text-primary`: Text color

### Animations
- **fadeIn**: Smooth section entrance (0.4s)
- **pulse**: Live match indicator (2s loop)

## Browser Support

- ✅ Chrome/Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Countdown not updating | Check browser console, ensure JavaScript is enabled |
| Test time not working | Clear datetime input and re-enter in correct format |
| Styles look off | Verify CSS module is loading, check browser DevTools |
| Mobile layout broken | Update viewport meta tag, check CSS media queries |

## Future Enhancements

- [ ] Integration with real match data from TBA API
- [ ] Automated score updates from field monitors
- [ ] Push notifications for match start alerts
- [ ] Match video playback
- [ ] Alliance strategy notes
- [ ] Team composition analytics
- [ ] Historical match statistics
- [ ] Match replay timelines

## File Locations

```
src/app/match-dashboard/
├── page.tsx                    # Main component
└── MatchDashboard.module.css   # Styling
```

## Support

For issues or questions, refer to the main project documentation or contact the development team.

