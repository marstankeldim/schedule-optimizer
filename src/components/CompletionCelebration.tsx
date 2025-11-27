import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, TrendingUp } from "lucide-react";

interface CompletionCelebrationProps {
  onContinue: () => void;
  tasksCompleted: number;
  currentStreak?: number;
}

export const CompletionCelebration = ({ 
  onContinue, 
  tasksCompleted,
  currentStreak = 0 
}: CompletionCelebrationProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="p-12 max-w-lg text-center bg-gradient-card border-primary shadow-glow animate-in zoom-in-95 duration-500">
        <div className="animate-in zoom-in-50 duration-700 delay-200">
          <Trophy className="w-24 h-24 mx-auto mb-6 text-primary" />
        </div>
        
        <h2 className="text-4xl font-bold text-foreground mb-4 animate-in slide-in-from-bottom-4 duration-500 delay-300">
          🎉 All Tasks Complete!
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8 animate-in slide-in-from-bottom-4 duration-500 delay-400">
          You completed {tasksCompleted} tasks today. Amazing work!
        </p>
        
        {currentStreak > 0 && (
          <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-primary/10 rounded-lg border border-primary/30 animate-in zoom-in-95 duration-500 delay-500">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              {currentStreak} day streak!
            </span>
          </div>
        )}
        
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-600">
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Plan Next Tasks
          </Button>
        </div>
      </Card>
    </div>
  );
};
