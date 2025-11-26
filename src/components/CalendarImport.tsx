import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Upload, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ICAL from "ical.js";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
}

interface CalendarImportProps {
  userId: string;
  onEventsImported: () => void;
}

export const CalendarImport = ({ userId, onEventsImported }: CalendarImportProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { toast } = useToast();

  const loadCalendarEvents = async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error loading calendar events:", error);
    } else {
      setEvents(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ics')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .ics calendar file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      const parsedEvents = vevents.map((vevent) => {
        const event = new ICAL.Event(vevent);
        return {
          user_id: userId,
          title: event.summary || "Untitled Event",
          start_time: event.startDate.toJSDate().toISOString(),
          end_time: event.endDate.toJSDate().toISOString(),
          all_day: event.startDate.isDate,
        };
      });

      if (parsedEvents.length === 0) {
        toast({
          title: "No events found",
          description: "The calendar file contains no events",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter events to only include today and future events
      const futureEvents = parsedEvents.filter((event) => {
        const eventDate = new Date(event.start_time);
        return eventDate >= today;
      });

      if (futureEvents.length === 0) {
        toast({
          title: "No upcoming events",
          description: "All events in the calendar are in the past",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("calendar_events")
        .insert(futureEvents);

      if (insertError) {
        toast({
          title: "Error",
          description: "Failed to import calendar events",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Calendar imported!",
          description: `${futureEvents.length} upcoming event(s) imported successfully`,
        });
        loadCalendarEvents();
        onEventsImported();
      }
    } catch (error) {
      console.error("Error parsing calendar:", error);
      toast({
        title: "Error",
        description: "Failed to parse calendar file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = "";
    }
  };

  const handleClearCalendar = async () => {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear calendar events",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Calendar cleared",
        description: "All calendar events have been removed",
      });
      setEvents([]);
      onEventsImported();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event deleted",
      });
      loadCalendarEvents();
      onEventsImported();
    }
  };

  // Load events on mount
  useEffect(() => {
    loadCalendarEvents();
  }, []);

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Import Calendar</h3>
        </div>
        <div className="flex gap-2">
          <Label htmlFor="calendar-upload" className="cursor-pointer">
            <Button
              asChild
              size="sm"
              disabled={isUploading}
              className="bg-primary hover:bg-primary/90"
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Importing..." : "Import .ics"}
              </span>
            </Button>
          </Label>
          <Input
            id="calendar-upload"
            type="file"
            accept=".ics"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          {events.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearCalendar}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Import your calendar to schedule tasks around your existing commitments. The optimizer will find free time slots automatically.
      </p>

      {events.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 bg-secondary rounded-lg border border-border flex items-start justify-between"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(event.start_time).toLocaleString()} -{" "}
                  {new Date(event.end_time).toLocaleTimeString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteEvent(event.id)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No calendar events imported</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a .ics file to get started
          </p>
        </div>
      )}
    </Card>
  );
};