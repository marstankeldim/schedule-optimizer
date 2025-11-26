import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyOptimizationSettingsProps {
  userId: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const WeeklyOptimizationSettings = ({ userId }: WeeklyOptimizationSettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(8);
  const [preferredDeepWorkDays, setPreferredDeepWorkDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday"]);
  const [minBreakMinutesPerHour, setMinBreakMinutesPerHour] = useState(10);
  const [allowEveningWork, setAllowEveningWork] = useState(true);
  const [eveningCutoffTime, setEveningCutoffTime] = useState("18:00");

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error loading settings:", error);
    } else if (data) {
      setMaxHoursPerDay(data.max_hours_per_day || 8);
      setPreferredDeepWorkDays(data.preferred_deep_work_days || ["Monday", "Tuesday", "Wednesday"]);
      setMinBreakMinutesPerHour(data.min_break_minutes_per_hour || 10);
      setAllowEveningWork(data.allow_evening_work !== false);
      setEveningCutoffTime(data.evening_cutoff_time || "18:00");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        max_hours_per_day: maxHoursPerDay,
        preferred_deep_work_days: preferredDeepWorkDays,
        min_break_minutes_per_hour: minBreakMinutesPerHour,
        allow_evening_work: allowEveningWork,
        evening_cutoff_time: eveningCutoffTime,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save optimization settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Weekly optimization settings have been updated",
      });
    }
  };

  const toggleDay = (day: string) => {
    setPreferredDeepWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <div className="text-center text-muted-foreground">Loading settings...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Weekly Optimization Settings</h3>
          <p className="text-xs text-muted-foreground">Fine-tune how your weekly schedule is optimized</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="maxHours">Max hours per day</Label>
          <Input
            id="maxHours"
            type="number"
            min={1}
            max={16}
            value={maxHoursPerDay}
            onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value) || 8)}
            className="mt-1.5 bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum focused work hours per day (excludes breaks)
          </p>
        </div>

        <div>
          <Label>Preferred deep work days</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select days best suited for high-energy, high-priority tasks
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day}`}
                  checked={preferredDeepWorkDays.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="minBreak">Min break minutes per hour</Label>
          <Input
            id="minBreak"
            type="number"
            min={0}
            max={30}
            value={minBreakMinutesPerHour}
            onChange={(e) => setMinBreakMinutesPerHour(parseInt(e.target.value) || 10)}
            className="mt-1.5 bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum break time per hour of focused work
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="eveningWork">Allow evening work</Label>
            <p className="text-xs text-muted-foreground">
              Schedule tasks after 6pm if needed
            </p>
          </div>
          <Switch
            id="eveningWork"
            checked={allowEveningWork}
            onCheckedChange={setAllowEveningWork}
          />
        </div>

        {allowEveningWork && (
          <div>
            <Label htmlFor="eveningCutoff">Evening cutoff time</Label>
            <Input
              id="eveningCutoff"
              type="time"
              value={eveningCutoffTime}
              onChange={(e) => setEveningCutoffTime(e.target.value)}
              className="mt-1.5 bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Stop scheduling tasks after this time
            </p>
          </div>
        )}

        <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 font-semibold">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </Card>
  );
};