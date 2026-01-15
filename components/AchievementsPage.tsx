"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Award, Star, Gift, Lock, Flame, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { LucideIcon } from "lucide-react";

type Reward = { id: string; name: string; cost: number; description: string };
type BadgeData = { id: string; name: string; icon: LucideIcon; achieved: boolean; criteria: string };

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
  const [isLoading, setIsLoading] = useState(true);
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

    const studentId = studentData.id;

    // Fetch total points
    const { data: pointsData } = await supabase
      .from("points_ledger")
      .select("points")
      .eq("student_id", studentId);

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
      .eq("student_id", studentId);

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

  const handleRedeem = async (r: Reward) => {
    if (points < r.cost) return;
    const ok = confirm(`Redeem ${r.name} for ${r.cost} points?`);
    if (!ok) return;

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
        reward_id: r.id,
        status: "pending",
      });

    if (redemptionError) {
      alert(`Error redeeming reward: ${redemptionError.message}`);
      return;
    }

    // Deduct points
    const { error: pointsError } = await supabase
      .from("points_ledger")
      .insert({
        student_id: studentData.id,
        source_type: "reward_redemption",
        source_id: r.id,
        points: -r.cost,
        description: `Redeemed: ${r.name}`,
      });

    if (pointsError) {
      alert(`Error deducting points: ${pointsError.message}`);
      return;
    }

    // Update local state
    setPoints(p => p - r.cost);
    alert(`Successfully redeemed ${r.name}!`);
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
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="badges" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.id} className={`rounded-2xl border-0 shadow-md ${b.achieved ? 'bg-white' : 'bg-gray-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow ${b.achieved ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {b.achieved ? <Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <span className={`${b.achieved ? 'text-gray-900' : 'text-gray-500'}`}>{b.name}</span>
                      {b.achieved && <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Achieved</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{b.criteria}</p>
                  </CardContent>
                </Card>
              )
            })}
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
    </div>
  );
}

export default AchievementsPage;

