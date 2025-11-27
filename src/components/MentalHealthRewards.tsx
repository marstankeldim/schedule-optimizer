import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Smile, Coffee, Moon, Sun, Brain } from "lucide-react";

interface MentalHealthRewardsProps {
  userId: string;
}

interface WellnessReward {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "balance" | "rest" | "mindfulness";
  unlocked: boolean;
}

const wellnessRewards: WellnessReward[] = [
  {
    id: "work_life_balance",
    name: "Work-Life Harmony",
    description: "Maintained healthy work hours for 7 days",
    icon: <Heart className="w-5 h-5" />,
    category: "balance",
    unlocked: false,
  },
  {
    id: "break_champion",
    name: "Break Champion",
    description: "Took all scheduled breaks for 5 consecutive days",
    icon: <Coffee className="w-5 h-5" />,
    category: "rest",
    unlocked: false,
  },
  {
    id: "evening_guardian",
    name: "Evening Guardian",
    description: "Finished work before evening cutoff for 7 days",
    icon: <Moon className="w-5 h-5" />,
    category: "balance",
    unlocked: false,
  },
  {
    id: "morning_person",
    name: "Morning Energizer",
    description: "Started work on time for 7 consecutive days",
    icon: <Sun className="w-5 h-5" />,
    category: "mindfulness",
    unlocked: false,
  },
  {
    id: "energy_master",
    name: "Energy Master",
    description: "Balanced high, medium, and low energy tasks for a week",
    icon: <Brain className="w-5 h-5" />,
    category: "mindfulness",
    unlocked: false,
  },
  {
    id: "wellness_warrior",
    name: "Wellness Warrior",
    description: "Completed all hydration and meal breaks for 3 days",
    icon: <Smile className="w-5 h-5" />,
    category: "rest",
    unlocked: false,
  },
];

export const MentalHealthRewards = ({ userId }: MentalHealthRewardsProps) => {
  const getCategoryColor = (category: WellnessReward["category"]) => {
    switch (category) {
      case "balance":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "rest":
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "mindfulness":
        return "bg-purple-500/10 text-purple-500 border-purple-500/30";
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Wellness Rewards</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Celebrate healthy productivity habits and sustainable work patterns
      </p>

      <div className="space-y-3">
        {wellnessRewards.map((reward) => (
          <div
            key={reward.id}
            className={`p-3 rounded-lg border transition-all ${
              reward.unlocked
                ? getCategoryColor(reward.category)
                : "bg-muted/20 border-muted opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${reward.unlocked ? "" : "opacity-50"}`}>
                {reward.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-foreground">{reward.name}</h4>
                  {reward.unlocked && (
                    <Badge variant="outline" className="text-xs">
                      Unlocked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {reward.description}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-2 text-[10px] ${getCategoryColor(reward.category)}`}
                >
                  {reward.category}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-xs text-muted-foreground text-center">
          💚 Remember: Your wellbeing is just as important as your productivity
        </p>
      </div>
    </Card>
  );
};
