"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Award, Star, Gift, Lock, Flame, Trophy } from "lucide-react";
import { useState } from "react";

type Reward = { id: string; name: string; cost: number; description: string };

export function AchievementsPage() {
  const [points, setPoints] = useState(350);
  const [streakDays] = useState(12);
  const level = Math.floor(points / 200) + 1; // simple level calc

  const badges = [
    { id: 'b1', name: 'Starter', icon: Star, achieved: true, criteria: 'Complete your first task' },
    { id: 'b2', name: 'On-Time Hero', icon: Award, achieved: true, criteria: '5 on-time submissions' },
    { id: 'b3', name: 'Curiosity', icon: Gift, achieved: false, criteria: 'Ask 10 AI Tutor questions' },
    { id: 'b4', name: 'Streak Master', icon: Flame, achieved: false, criteria: '7-day daily streak' },
  ];

  const rewards: Reward[] = [
    { id: 'r1', name: 'Study Resource Pack', cost: 200, description: 'Downloadable guides and cheatsheets' },
    { id: 'r2', name: 'Vectorius Trophy', cost: 500, description: 'Digital trophy for your profile' },
    { id: 'r3', name: 'Charity Donation', cost: 600, description: 'Donate points to support education' },
  ];

  const handleRedeem = (r: Reward) => {
    if (points < r.cost) return;
    const ok = confirm(`Redeem ${r.name} for ${r.cost} points?`);
    if (!ok) return;
    setPoints(p => p - r.cost);
    // TODO: mark reward claimed in user state
  };

  return (
    <div className="space-grid-6">
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
                  <CardContent className="space-grid-3">
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

