import { format, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import type { View } from 'react-big-calendar';

interface CurrentTimeIndicatorProps {
  currentTime: Date;
  view: View;
  currentDate: Date;
}

/**
 * CurrentTimeIndicator – Red line like Google Calendar
 * Shows current time position on week/day views.
 */
export function CurrentTimeIndicator({
  currentTime,
  view,
  currentDate,
}: CurrentTimeIndicatorProps) {
  const isCurrentDay = isSameDay(currentTime, currentDate);
  const isInCurrentWeek =
    view === 'week' &&
    currentTime >= startOfWeek(currentDate, { weekStartsOn: 0 }) &&
    currentTime <= endOfWeek(currentDate, { weekStartsOn: 0 });

  if ((view === 'week' && !isInCurrentWeek) || (view === 'day' && !isCurrentDay)) {
    return null;
  }

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const startHour = 6;
  const endHour = 23;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalRange = endMinutes - startMinutes;
  const positionFromStart = totalMinutes - startMinutes;
  const topPosition = Math.max(0, Math.min(100, (positionFromStart / totalRange) * 100));

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: `${topPosition}%`,
        marginTop: '-1px',
        zIndex: 30,
      }}
    >
      <div className="flex items-center h-0.5">
        <div className="w-14 text-xs text-red-600 font-medium pr-2 pl-1 text-right bg-red-50 dark:bg-red-950/80 rounded-full border border-red-200 dark:border-red-900/50">
          {format(currentTime, 'h:mm a')}
        </div>
        <div className="flex-1 relative">
          <div className="h-0.5 bg-red-600 relative">
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-600 rounded-full border-2 border-background"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
