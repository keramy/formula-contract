"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to the shared presence channel and return a Set of online user IDs.
 * Only used on the admin users page — not mounted globally.
 */
export function useOnlineUsers(): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel("presence:online", {
      config: { presence: { key: "admin-listener" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        for (const key of Object.keys(state)) {
          // Each key is a user ID (set by PresenceProvider)
          // Skip our own listener key
          if (key === "admin-listener") continue;
          ids.add(key);
        }
        setOnlineIds(ids);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineIds;
}
