"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { touchLastActive } from "@/lib/actions/users";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Invisible component that tracks user presence via Supabase Realtime.
 * Mounted once in the dashboard layout. No UI rendered.
 *
 * Each user joins the "presence:online" channel with their user ID.
 * The users page subscribes to the same channel to show green dots.
 */
export function PresenceProvider({ userId }: { userId: string }) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // No-op on the provider side — consumers read state via useOnlineUsers()
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Update last_active_at in DB (throttled — skips if recent)
    touchLastActive();

    // Refresh last_active_at every 5 minutes while active
    const interval = setInterval(() => touchLastActive(), 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
