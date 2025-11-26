import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coffee, Utensils, Droplets, Save } from "lucide-react";

interface SchedulePreferencesProps {
  userId: string;
}

interface Preferences {
  breakfast_time: string;
  breakfast_duration: number;
  lunch_time: string;
  lunch_duration: number;
  dinner_time: string;
  dinner_duration: number;
  enable_nutrition_reminders: boolean;
  enable_hydration_reminders: boolean;
  hydration_interval: number;
}

export const SchedulePreferences = ({ userId }: SchedulePreferencesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    breakfast_time: "08:00",
    breakfast_duration: 20,
    lunch_time: "12:30",
    lunch_duration: 60,
    dinner_time: "18:30",
    dinner_duration: 60,
    enable_nutrition_reminders: true,
    enable_hydration_reminders: true,
    hydration_interval: 120,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading preferences:", error);
    } else if (data) {
      setPreferences(data);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", userId)
      .single();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("user_preferences")
        .update(preferences)
        .eq("user_id", userId));
    } else {
      ({ error } = await supabase
        .from("user_preferences")
        .insert({ ...preferences, user_id: userId }));
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preferences saved!",
        description: "Your meal break and reminder preferences have been updated",
      });
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Utensils className="w-5 h-5 text-primary" />
        Schedule Preferences
      </h3>

      <div className="space-y-6">
        {/* Breakfast Settings */}
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-4 h-4 text-primary" />
            <Label className="text-base font-medium">Breakfast Break</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="breakfast-time" className="text-sm text-muted-foreground">Time</Label>
              <Input
                id="breakfast-time"
                type="time"
                value={preferences.breakfast_time}
                onChange={(e) =>
                  setPreferences({ ...preferences, breakfast_time: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="breakfast-duration" className="text-sm text-muted-foreground">Duration (min)</Label>
              <Input
                id="breakfast-duration"
                type="number"
                min="5"
                max="120"
                value={preferences.breakfast_duration}
                onChange={(e) =>
                  setPreferences({ ...preferences, breakfast_duration: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Lunch Settings */}
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-primary" />
            <Label className="text-base font-medium">Lunch Break</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lunch-time" className="text-sm text-muted-foreground">Time</Label>
              <Input
                id="lunch-time"
                type="time"
                value={preferences.lunch_time}
                onChange={(e) =>
                  setPreferences({ ...preferences, lunch_time: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lunch-duration" className="text-sm text-muted-foreground">Duration (min)</Label>
              <Input
                id="lunch-duration"
                type="number"
                min="15"
                max="180"
                value={preferences.lunch_duration}
                onChange={(e) =>
                  setPreferences({ ...preferences, lunch_duration: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Dinner Settings */}
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-primary" />
            <Label className="text-base font-medium">Dinner Break</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dinner-time" className="text-sm text-muted-foreground">Time</Label>
              <Input
                id="dinner-time"
                type="time"
                value={preferences.dinner_time}
                onChange={(e) =>
                  setPreferences({ ...preferences, dinner_time: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dinner-duration" className="text-sm text-muted-foreground">Duration (min)</Label>
              <Input
                id="dinner-duration"
                type="number"
                min="15"
                max="180"
                value={preferences.dinner_duration}
                onChange={(e) =>
                  setPreferences({ ...preferences, dinner_duration: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
          <Label className="text-base font-medium">Reminders</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              <Label htmlFor="nutrition-reminders" className="text-sm">
                Nutrition reminders with meals
              </Label>
            </div>
            <Switch
              id="nutrition-reminders"
              checked={preferences.enable_nutrition_reminders}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, enable_nutrition_reminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <Label htmlFor="hydration-reminders" className="text-sm">
                Hydration reminders
              </Label>
            </div>
            <Switch
              id="hydration-reminders"
              checked={preferences.enable_hydration_reminders}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, enable_hydration_reminders: checked })
              }
            />
          </div>

          {preferences.enable_hydration_reminders && (
            <div className="ml-6">
              <Label htmlFor="hydration-interval" className="text-sm text-muted-foreground">
                Hydration reminder interval (minutes)
              </Label>
              <Input
                id="hydration-interval"
                type="number"
                min="30"
                max="240"
                step="30"
                value={preferences.hydration_interval}
                onChange={(e) =>
                  setPreferences({ ...preferences, hydration_interval: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          )}
        </div>

        <Button
          onClick={savePreferences}
          disabled={loading}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </Card>
  );
};