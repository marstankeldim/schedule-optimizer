import type { ScheduledTask } from "@/components/ScheduleTimeline";

export const generateICalFile = (schedule: ScheduledTask[]): string => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  // Helper to format time for iCal (YYYYMMDDTHHMMSS)
  const formatDateTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(today);
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // iCal header
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedule Optimizer//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Optimized Schedule
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
END:STANDARD
END:VTIMEZONE
`;

  // Add each task as an event
  schedule.forEach((task) => {
    const startDateTime = formatDateTime(task.startTime);
    const endDateTime = formatDateTime(task.endTime);
    const uid = `${task.id}-${dateStr}@schedule-optimizer.com`;
    
    // Create description with task details
    const description = `Duration: ${task.duration} minutes\\nEnergy Level: ${task.energyLevel}\\nPriority: ${task.priority}`;
    
    ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${task.title}
DESCRIPTION:${description}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${task.title}
END:VALARM
END:VEVENT
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
