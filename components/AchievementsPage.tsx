"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Award, Star, Gift, Lock, Flame, Trophy, Target, Plus, Check, Trash2, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "./ui/ConfirmDialog";

type Reward = { id: string; name: string; cost: number; description: string };
type BadgeData = { id: string; name: string; icon: LucideIcon; achieved: boolean; criteria: string };
type Goal = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
};

const iconMap: Record<string, LucideIcon> = {
  star: Star,
  award: Award,
  gift: Gift,
  flame: Flame,
};

export function AchievementsPage() {
  const [points, setPoints] = useState(0);
  const [streakDays] = useState(0); // TODO: implement streak calculation
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [rewardToRedeem, setRewardToRedeem] = useState<Reward | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const level = Math.floor(points / 200) + 1;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // Get current student ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("student_user_id", user.id)
      .single();

    if (!studentData) {
      setIsLoading(false);
      return;
    }

    const currentStudentId = studentData.id;
    setStudentId(currentStudentId);

    // Fetch total points
    const { data: pointsData } = await supabase
      .from("points_ledger")
      .select("points")
      .eq("student_id", currentStudentId);

    const totalPoints = pointsData?.reduce((sum, entry) => sum + entry.points, 0) ?? 0;
    setPoints(totalPoints);

    // Fetch all badges and student's earned badges
    const { data: allBadges } = await supabase
      .from("badges")
      .select("*")
      .order("created_at");

    const { data: earnedBadges } = await supabase
      .from("student_badges")
      .select("badge_id")
      .eq("student_id", currentStudentId);

    // Fetch student goals
    const { data: goalsData } = await supabase
      .from("student_goals")
      .select("*")
      .eq("student_id", currentStudentId)
      .order("is_completed")
      .order("target_date", { nullsFirst: false });

    setGoals(goalsData ?? []);

    const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) ?? []);

    const badgesList: BadgeData[] = (allBadges ?? []).map(badge => ({
      id: badge.id,
      name: badge.name,
      icon: iconMap[badge.icon] ?? Star,
      achieved: earnedBadgeIds.has(badge.id),
      criteria: badge.criteria,
    }));

    setBadges(badgesList);

    // Fetch rewards
    const { data: rewardsData } = await supabase
      .from("rewards")
      .select("*")
      .is("archived_at", null)
      .order("cost_points");

    setRewards(rewardsData?.map(r => ({
      id: r.id,
      name: r.name,
      cost: r.cost_points,
      description: r.description,
    })) ?? []);

    setIsLoading(false);
  };

  const handleRedeem = (r: Reward) => {
    if (points < r.cost) return;
    setRewardToRedeem(r);
  };

  const confirmRedeem = async () => {
    const reward = rewardToRedeem;
    if (!reward) return;

    // Get current student ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("student_user_id", user.id)
      .single();

    if (!studentData) return;

    // Insert redemption record
    const { error: redemptionError } = await supabase
      .from("reward_redemptions")
      .insert({
        student_id: studentData.id,
        reward_id: reward.id,
        status: "pending",
      });

    if (redemptionError) {
      toast.error(`Error redeeming reward: ${redemptionError.message}`);
      return;
    }

    // Deduct points
    const { error: pointsError } = await supabase
      .from("points_ledger")
      .insert({
        student_id: studentData.id,
        source_type: "reward_redemption",
        source_id: reward.id,
        points: -reward.cost,
        description: `Redeemed: ${reward.name}`,
      });

    if (pointsError) {
      toast.error(`Error deducting points: ${pointsError.message}`);
      return;
    }

    // Update local state
    setPoints((p) => p - reward.cost);
    setRewardToRedeem(null);
    toast.success(`Successfully redeemed ${reward.name}!`);
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim() || !studentId) return;
    setIsAddingGoal(true);

    const { data, error } = await supabase
      .from("student_goals")
      .insert({
        student_id: studentId,
        title: newGoalTitle.trim(),
        target_date: newGoalDate || null,
      })
      .select()
      .single();

    setIsAddingGoal(false);

    if (error) {
      toast.error(`Failed to add goal: ${error.message}`);
      return;
    }

    setGoals(prev => [...prev, data]);
    setNewGoalTitle("");
    setNewGoalDate("");
    toast.success("Goal added!");
  };

  const handleToggleGoal = async (goal: Goal) => {
    const newCompleted = !goal.is_completed;
    const { error } = await supabase
      .from("student_goals")
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", goal.id);

    if (error) {
      toast.error(`Failed to update goal: ${error.message}`);
      return;
    }

    setGoals(prev =>
      prev.map(g =>
        g.id === goal.id
          ? { ...g, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : g
      )
    );
    toast.success(newCompleted ? "Goal completed!" : "Goal reopened");
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;

    const { error } = await supabase
      .from("student_goals")
      .delete()
      .eq("id", goalToDelete);

    if (error) {
      toast.error(`Failed to delete goal: ${error.message}`);
      return;
    }

    setGoals((prev) => prev.filter((g) => g.id !== goalToDelete));
    setGoalToDelete(null);
    toast.success("Goal deleted");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-3 animate-pulse" />
          <p className="text-gray-500">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-gradient-card border-0 shadow-lg rounded-2xl">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Points</div>
              <div className="text-2xl font-semibold text-amber-600">{points}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Level</div>
              <div className="text-2xl font-semibold text-indigo-600">{level}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Daily Streak</div>
              <div className="text-2xl font-semibold text-orange-600">{streakDays} days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="badges" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.id} className={`rounded-2xl border-0 shadow-md transition-all duration-200 ${b.achieved ? 'bg-white' : 'bg-gray-50/80 hover:bg-white hover:shadow-lg'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow ${b.achieved ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                        title={b.achieved ? `Badge earned: ${b.name}` : `Locked - ${b.criteria}`}
                      >
                        {b.achieved ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <span className={`${b.achieved ? 'text-gray-900' : 'text-gray-600'}`}>{b.name}</span>
                      {b.achieved ? (
                        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Achieved</Badge>
                      ) : (
                        <Badge className="ml-auto bg-gray-100 text-gray-500 border-gray-200">Locked</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm ${b.achieved ? 'text-gray-600' : 'text-gray-500'}`}>
                      {b.achieved ? b.criteria : `🔒 ${b.criteria}`}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="goals" className="mt-4">
          <Card className="rounded-2xl border-0 shadow-md bg-white mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add New Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="What do you want to achieve?"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={newGoalDate}
                      onChange={(e) => setNewGoalDate(e.target.value)}
                      className="pl-9 w-[150px]"
                    />
                  </div>
                  <Button
                    onClick={handleAddGoal}
                    disabled={!newGoalTitle.trim() || isAddingGoal}
                    className="bg-gradient-primary text-white btn-glow"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {goals.length === 0 ? (
              <Card className="rounded-2xl border-0 shadow-md bg-gray-50/80">
                <CardContent className="py-8 text-center">
                  <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No goals yet. Add your first goal above!</p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card
                  key={goal.id}
                  className={`rounded-2xl border-0 shadow-md transition-all duration-200 ${
                    goal.is_completed ? 'bg-emerald-50/50' : 'bg-white'
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => handleToggleGoal(goal)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        goal.is_completed
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {goal.is_completed && <Check className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${goal.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {goal.title}
                      </p>
                      {goal.target_date && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(goal.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {goal.is_completed && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                        Completed
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="rewards" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((r) => {
              const affordable = points >= r.cost;
              return (
                <Card key={r.id} className="rounded-2xl border-0 shadow-md bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-rose-600" />
                      <span>{r.name}</span>
                      <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">{r.cost} pts</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">{r.description}</p>
                    <Button
                      disabled={!affordable}
                      onClick={() => handleRedeem(r)}
                      className={`rounded-xl ${affordable ? 'bg-gradient-primary text-white btn-glow' : ''}`}
                      variant={affordable ? 'default' : 'outline'}
                    >
                      {affordable ? 'Redeem' : 'Not enough points'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={Boolean(rewardToRedeem)}
        onOpenChange={(open) => {
          if (!open) setRewardToRedeem(null);
        }}
        title={rewardToRedeem ? `Redeem ${rewardToRedeem.name}?` : "Redeem reward?"}
        description={
          rewardToRedeem
            ? `This will spend ${rewardToRedeem.cost} points and create a pending redemption request.`
            : undefined
        }
        confirmLabel="Redeem"
        onConfirm={() => {
          void confirmRedeem();
        }}
      />
      <ConfirmDialog
        open={Boolean(goalToDelete)}
        onOpenChange={(open) => {
          if (!open) setGoalToDelete(null);
        }}
        title="Delete this goal?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          void confirmDeleteGoal();
        }}
      />
    </div>
  );
}

export default AchievementsPage;

