# Calendar Component Test - Execution Instructions

## Test Command

Run the following command to execute the Calendar E2E test:

```bash
npm run test:e2e -- tests/e2e/professional-calendar.spec.ts -g "should display calendar week view correctly on desktop" --project=chromium --timeout=60000
```

## What to Look For in Console Output

### 1. Module Initialization Logs

**Look for:**
```
[CALENDAR INIT] Localizer initialized successfully
```

**OR error variants:**
```
[CALENDAR INIT] Moment.js is not available
[CALENDAR INIT] Failed to initialize localizer: [error details]
```

**Interpretation:**
- ✅ **If `[CALENDAR INIT]` appears:** Module is loading and executing
- ❌ **If `[CALENDAR INIT]` is missing:** Module may not be loading or executing

### 2. Component Mount Logs

**Look for:**
```
[CALENDAR COMPONENT] ProfessionalCalendar component mounted
[CALENDAR COMPONENT] Props: { bookingsCount: 0, isLoading: false, hasOnDateSelect: true }
```

**Interpretation:**
- ✅ **If `[CALENDAR COMPONENT]` appears:** Component is mounting successfully
- ❌ **If `[CALENDAR COMPONENT]` is missing:** Component is not mounting despite condition being true

### 3. Render Function Logs

**Look for:**
```
[CALENDAR RENDER] Starting Calendar render function
[CALENDAR RENDER] isLoading: false
[CALENDAR RENDER] filteredEvents count: 0
```

**Interpretation:**
- ✅ **If `[CALENDAR RENDER]` appears:** Render function is executing
- ❌ **If `[CALENDAR RENDER]` is missing:** Render function is not executing (may be blocked by isLoading or other condition)

### 4. Prop Validation Logs

**Look for:**
```
[CALENDAR DEBUG] Props validated: { eventsCount: 0, localizerType: 'object', momentType: 'function', currentDate: '...', view: 'month' }
```

**Interpretation:**
- ✅ **If `[CALENDAR DEBUG] Props validated` appears:** All props are valid and Calendar component should render
- ❌ **If missing:** Validation may have failed (check for error logs)

### 5. Error Logs

**Look for any of:**
```
[CALENDAR ERROR] Localizer not initialized
[CALENDAR ERROR] Moment.js not available
[CALENDAR ERROR] Invalid currentDate
[CALENDAR ERROR] Invalid view
[CALENDAR ERROR] Fatal error rendering Calendar component: [error]
[CALENDAR ERROR BOUNDARY] Caught error: [error]
```

**Interpretation:**
- **If any `[CALENDAR ERROR]` appears:** Specific validation or render error occurred
- **If `[CALENDAR ERROR BOUNDARY]` appears:** React render error was caught

### 6. Page Content Diagnostics

**Look for:**
```
Page content check:
- Has calendar-view-not-rendered: false
- Has calendar-schedule-title: true/false
- Has rbc-calendar: true/false
- Has react-big-calendar-container: true/false
- Has calendar-error (any error state): true/false
```

**Interpretation:**
- **calendar-view-not-rendered: true** → Calendar view condition failed
- **calendar-schedule-title: false** → Component not rendering
- **rbc-calendar: false** → react-big-calendar not rendering
- **calendar-error: true** → Error state is present

### 7. Calendar Elements Status

**Look for:**
```
Calendar elements status: {
  "scheduleTitle": "found/not found",
  "calendarContainer": "found/not found",
  "rbcCalendar": "found/not found",
  "anyError": ["calendar-error-..."]
}
```

**Interpretation:**
- **scheduleTitle: "found"** → Component is rendering
- **calendarContainer: "found"** → Container div exists
- **rbcCalendar: "found"** → react-big-calendar rendered successfully
- **anyError: [...]** → List of error states present

## Diagnostic Scenarios

### Scenario 1: Module Not Loading
**Symptoms:**
- No `[CALENDAR INIT]` logs
- No `[CALENDAR COMPONENT]` logs
- No `[CALENDAR RENDER]` logs

**Conclusion:** Module-level code is not executing. Possible causes:
- Import error
- Module not included in bundle
- Build/bundling issue

### Scenario 2: Component Not Mounting
**Symptoms:**
- `[CALENDAR INIT]` logs present
- No `[CALENDAR COMPONENT]` logs
- No `[CALENDAR RENDER]` logs

**Conclusion:** Component is not mounting despite condition being true. Possible causes:
- React Suspense boundary
- Parent component error
- Conditional rendering issue

### Scenario 3: Render Function Not Executing
**Symptoms:**
- `[CALENDAR INIT]` logs present
- `[CALENDAR COMPONENT]` logs present
- No `[CALENDAR RENDER]` logs

**Conclusion:** Component mounts but render function doesn't execute. Possible causes:
- Early return due to `isLoading`
- Conditional rendering preventing execution
- Error before render function

### Scenario 4: Runtime Error
**Symptoms:**
- `[CALENDAR INIT]` logs present
- `[CALENDAR COMPONENT]` logs present
- `[CALENDAR RENDER]` logs present (or partial)
- `[CALENDAR ERROR]` or `[CALENDAR ERROR BOUNDARY]` logs present

**Conclusion:** Runtime error during render. Check error message for details.

### Scenario 5: Success
**Symptoms:**
- All logs present in sequence
- `rbc-calendar: "found"` in elements status
- No error states

**Conclusion:** Component is rendering successfully.

## Expected Full Log Sequence (Success)

```
[CALENDAR INIT] Localizer initialized successfully
[CALENDAR COMPONENT] ProfessionalCalendar component mounted
[CALENDAR COMPONENT] Props: { bookingsCount: 0, isLoading: false, hasOnDateSelect: true }
[CALENDAR RENDER] Starting Calendar render function
[CALENDAR RENDER] isLoading: false
[CALENDAR RENDER] filteredEvents count: 0
[CALENDAR DEBUG] Props validated: { eventsCount: 0, localizerType: 'object', momentType: 'function', currentDate: '2024-...', view: 'month' }
Page content check:
- Has calendar-view-not-rendered: false
- Has calendar-schedule-title: true
- Has rbc-calendar: true
- Has react-big-calendar-container: true
- Has calendar-error (any error state): false
Calendar elements status: {
  "scheduleTitle": "found",
  "calendarContainer": "found",
  "rbcCalendar": "found",
  "anyError": []
}
```

## Quick Reference: Log Sequence

1. **`[CALENDAR INIT]`** → Module loading
2. **`[CALENDAR COMPONENT]`** → Component mounting
3. **`[CALENDAR RENDER]`** → Render function executing
4. **`[CALENDAR DEBUG] Props validated`** → Props are valid
5. **`rbc-calendar: "found"`** → Calendar rendered successfully

## Next Steps After Test

1. **If logs are missing:** Check which log is the last one present to identify failure point
2. **If errors are present:** Review error message and stack trace
3. **If all logs present but `.rbc-calendar` not found:** Check CSS or DOM structure
4. **If test passes:** Component is working correctly

## Files to Review

- `src/components/calendar/professional-calendar.tsx` - Component implementation
- `tests/e2e/professional-calendar.spec.ts` - Test file
- `src/pages/professional-dashboard.tsx` - Parent component

