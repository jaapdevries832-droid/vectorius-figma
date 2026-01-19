"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, AlertTriangle, CalendarClock } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";

type ParentAlert = {
  id: string;
  alert_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};

const iconForAlert = (type: string) => {
  switch (type) {
    case "overdue_assignment":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "upcoming_test":
    case "upcoming_project":
      return <CalendarClock className="w-4 h-4 text-blue-500" />;
    default:
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  }
};

export function ParentAlertsList({ parentId }: { parentId: string | null }) {
  const [alerts, setAlerts] = useState<ParentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAlerts = useCallback(async () => {
    if (!parentId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("parent_alerts")
      .select("id, alert_type, title, message, is_read, created_at")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error) {
      setAlerts(data ?? []);
    }
    setIsLoading(false);
  }, [parentId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const unreadCount = useMemo(
    () => alerts.filter((alert) => !alert.is_read).length,
    [alerts]
  );

  const markAllRead = async () => {
    if (!parentId || unreadCount === 0) return;
    await supabase
      .from("parent_alerts")
      .update({ is_read: true })
      .eq("parent_id", parentId)
      .eq("is_read", false);
    await loadAlerts();
  };

  const markRead = async (alertId: string) => {
    await supabase.from("parent_alerts").update({ is_read: true }).eq("id", alertId);
    setAlerts((prev) => prev.map((alert) => alert.id === alertId ? { ...alert, is_read: true } : alert));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && loadAlerts()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-3 rounded-2xl transition-colors">
          <Bell className="w-5 h-5 text-blue-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0 animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 rounded-2xl border-0 shadow-xl bg-white/95 backdrop-blur-lg">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Parent Alerts</p>
            <p className="text-xs text-gray-600">Signals that need attention.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Loading alerts...</div>
          )}
          {!isLoading && alerts.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No alerts yet.</div>
          )}
          {!isLoading && alerts.map((alert) => (
            <DropdownMenuItem
              key={alert.id}
              className="flex items-start gap-3 p-4 cursor-pointer"
              onClick={() => markRead(alert.id)}
            >
              {iconForAlert(alert.alert_type)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                {alert.message && (
                  <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                )}
                <p className="text-[11px] text-gray-500 mt-2">
                  {new Date(alert.created_at).toLocaleDateString()}
                </p>
              </div>
              {!alert.is_read && (
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-2" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
