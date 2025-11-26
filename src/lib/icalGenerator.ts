import type { ScheduledTask } from "@/components/ScheduleTimeline";

export const generateICalFile = (schedule: ScheduledTask[]): string => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  // Get local timezone
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Helper to format time for iCal in local time (YYYYMMDDTHHMMSS)
  const formatDateTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(today);
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    
    // Format as local time (no Z suffix for local time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hour}${min}${sec}`;
  };

  // iCal header with local timezone
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedule Optimizer//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Optimized Schedule
X-WR-TIMEZONE:${timezoneName}
`;

  // Add each task as an event
  schedule.forEach((task) => {
    const startDateTime = formatDateTime(task.startTime);
    const endDateTime = formatDateTime(task.endTime);
    const uid = `${task.id}-${dateStr}@schedule-optimizer.com`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Create description with task details
    const description = task.isBreak 
      ? "Break time - rest and recharge"
      : `Duration: ${task.duration} minutes\\nEnergy Level: ${task.energyLevel}\\nPriority: ${task.priority}`;
    
    // No reminder for breaks
    const alarm = task.isBreak ? "" : `BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${task.title}
END:VALARM
`;
    
    ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${timestamp}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${task.title}
DESCRIPTION:${description}
STATUS:CONFIRMED
SEQUENCE:0
${alarm}END:VEVENT
`;
  });

  // iCal footer
  ical += 'END:VCALENDAR';
  
  return ical;
};

export const downloadICalFile = (schedule: ScheduledTask[]) => {
  const icalContent = generateICalFile(schedule);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const today = new Date().toISOString().split('T')[0];
  link.download = `schedule-${today}.ics`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
