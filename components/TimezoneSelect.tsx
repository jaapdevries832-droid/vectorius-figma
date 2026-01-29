"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Common timezones grouped by region
const COMMON_TIMEZONES = [
  // Americas
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  // Europe
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Madrid",
  "Europe/Rome",
  // Asia/Pacific
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  // UTC
  "UTC",
];

function formatTimezone(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    const offset = tzPart?.value ?? "";

    // Format the timezone name for display
    const displayName = tz.replace(/_/g, " ").replace(/\//g, " / ");
    return `${displayName} (${offset})`;
  } catch {
    return tz;
  }
}

function detectBrowserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's in our common list, otherwise default to America/New_York
    if (COMMON_TIMEZONES.includes(detected)) {
      return detected;
    }
    // If not in common list, still return it - it's valid
    return detected;
  } catch {
    return "America/New_York";
  }
}

type TimezoneSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function TimezoneSelect({ value, onChange, disabled }: TimezoneSelectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-detect timezone on mount if no value is set
    if (!value) {
      const detected = detectBrowserTimezone();
      onChange(detected);
    }
  }, [value, onChange]);

  // Get all available timezones including the current value if not in common list
  const allTimezones = value && !COMMON_TIMEZONES.includes(value)
    ? [value, ...COMMON_TIMEZONES]
    : COMMON_TIMEZONES;

  if (!mounted) {
    return (
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {allTimezones.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {formatTimezone(tz)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
