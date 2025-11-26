import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "./TaskInput";

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Omit<Task, "id">;
  userId: string;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export const RecurringTaskDialog = ({
  open,
  onOpenChange,
  task,
  userId,
  onSuccess,
}: RecurringTaskDialogProps) => {
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const { toast } = useToast();

  const handleCreateRecurring = async () => {
    let recurrencePattern = {};

    switch (recurrenceType) {
      case "weekly":
        recurrencePattern = { daysOfWeek: selectedDays };
        break;
      case "monthly":
        recurrencePattern = { dayOfMonth };
        break;
    }

    const { error } = await supabase.from("recurring_tasks").insert({
      user_id: userId,
      title: task.title,
      duration: task.duration,
      energy_level: task.energyLevel,
      priority: task.priority,
      recurrence_type: recurrenceType,
      recurrence_pattern: recurrencePattern,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create recurring task",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Recurring task created",
        description: `"${task.title}" will now repeat ${recurrenceType}`,
      });
      onOpenChange(false);
      onSuccess();
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Make Task Recurring</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Task: <span className="font-semibold text-foreground">{task.title}</span>
            </p>
          </div>

          <div>
            <Label htmlFor="recurrenceType">Recurrence Pattern</Label>
            <Select
              value={recurrenceType}
              onValueChange={(v) => setRecurrenceType(v as typeof recurrenceType)}
            >
              <SelectTrigger id="recurrenceType" className="mt-1.5 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly (Select Days)</SelectItem>
                <SelectItem value="monthly">Monthly (Specific Day)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === "weekly" && (
            <div>
              <Label className="mb-2 block">Select Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex flex-col items-center">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                      className="mb-1"
                    />
                    <Label
                      htmlFor={`day-${day.value}`}
                      className="text-xs cursor-pointer"
                    >
                      {day.label.substring(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurrenceType === "monthly" && (
            <div>
              <Label htmlFor="dayOfMonth">Day of Month</Label>
              <Select
                value={dayOfMonth.toString()}
                onValueChange={(v) => setDayOfMonth(parseInt(v))}
              >
                <SelectTrigger id="dayOfMonth" className="mt-1.5 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleCreateRecurring}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Create Recurring Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
