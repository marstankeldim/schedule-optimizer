import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly" | "custom">("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [customInterval, setCustomInterval] = useState(2);
  const [customUnit, setCustomUnit] = useState<"days" | "weeks" | "months">("weeks");
  const { toast } = useToast();

  const handleCreateRecurring = async () => {
    let recurrencePattern: any = {};
    let effectiveRecurrenceType: "daily" | "weekly" | "monthly" | "custom" = recurrenceType;

    switch (recurrenceType) {
      case "weekly":
        if (selectedDays.length === 0) {
          toast({
            title: "Select days",
            description: "Please select at least one day for weekly recurrence",
            variant: "destructive",
          });
          return;
        }
        recurrencePattern = { daysOfWeek: selectedDays };
        break;
      case "monthly":
        recurrencePattern = { dayOfMonth };
        break;
      case "custom":
        if (customUnit === "weeks" && selectedDays.length === 0) {
          toast({
            title: "Select days",
            description: "Please select at least one day for custom weekly recurrence",
            variant: "destructive",
          });
          return;
        }
        recurrencePattern = { 
          interval: customInterval,
          unit: customUnit,
          daysOfWeek: customUnit === "weeks" ? selectedDays : undefined,
          dayOfMonth: customUnit === "months" ? dayOfMonth : undefined,
        };
        effectiveRecurrenceType = "custom";
        break;
    }

    const { error } = await supabase.from("recurring_tasks").insert({
      user_id: userId,
      title: task.title,
      duration: task.duration,
      energy_level: task.energyLevel,
      priority: task.priority,
      recurrence_type: effectiveRecurrenceType,
      recurrence_pattern: recurrencePattern,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create recurring task",
        variant: "destructive",
      });
    } else {
      const description = recurrenceType === "custom" 
        ? `Every ${customInterval} ${customUnit}`
        : recurrenceType;
      toast({
        title: "Recurring task created",
        description: `"${task.title}" will now repeat: ${description}`,
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
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
                <SelectItem value="custom">Custom Interval</SelectItem>
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

          {recurrenceType === "custom" && (
            <>
              <div className="space-y-2">
                <Label>Repeat every</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(parseInt(e.target.value) || 2)}
                    className="w-20 bg-secondary border-border"
                  />
                  <Select value={customUnit} onValueChange={(v: any) => setCustomUnit(v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  For example: "2 weeks" = every 2 weeks
                </p>
              </div>

              {customUnit === "weeks" && (
                <div>
                  <Label className="mb-2 block">On these days</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex flex-col items-center">
                        <Checkbox
                          id={`custom-day-${day.value}`}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={() => toggleDay(day.value)}
                          className="mb-1"
                        />
                        <Label
                          htmlFor={`custom-day-${day.value}`}
                          className="text-xs cursor-pointer"
                        >
                          {day.label.substring(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customUnit === "months" && (
                <div>
                  <Label htmlFor="customDayOfMonth">On day of month</Label>
                  <Select
                    value={dayOfMonth.toString()}
                    onValueChange={(v) => setDayOfMonth(parseInt(v))}
                  >
                    <SelectTrigger id="customDayOfMonth" className="mt-1.5 bg-secondary border-border">
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
            </>
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