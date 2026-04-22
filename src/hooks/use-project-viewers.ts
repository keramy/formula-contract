"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Tracks other users currently viewing the same project's timeline via
 * Supabase Realtime Presence. Joins a per-project channel when the hook
 * mounts and broadcasts the current user's ID + name; returns the set of
 * OTHER viewers (excluding self).
 *
 * No locking — just awareness. Last-writer-wins semantics unchanged.
 */
export interface ProjectViewer {
  userId: string;
  name: string;
  joinedAt: string;
}

export function useProjectViewers(projectId: string, currentUser: { id: string; name: string }): ProjectViewer[] {
  const [viewers, setViewers] = useState<ProjectViewer[]>([]);

  useEffect(() => {
    if (!projectId || !currentUser.id) return;

    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`presence:project:${projectId}`, {
      config: { presence: { key: currentUser.id } },
    });

    const updateFromState = () => {
      const state = channel.presenceState();
      const others: ProjectViewer[] = [];
      for (const [key, entries] of Object.entries(state)) {
        if (key === currentUser.id) continue;
        // Supabase stores an array of tracked payloads per presence key.
        // Take the most recent entry for the viewer's display info.
        const latest = entries[entries.length - 1] as { user_id?: string; name?: string; joined_at?: string } | undefined;
        if (!latest) continue;
        others.push({
          userId: key,
          name: latest.name || "Teammate",
          joinedAt: latest.joined_at || new Date().toISOString(),
        });
      }
      setViewers(others);
    };

    channel
      .on("presence", { event: "sync" }, updateFromState)
      .on("presence", { event: "join" }, updateFromState)
      .on("presence", { event: "leave" }, updateFromState)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [projectId, currentUser.id, currentUser.name]);

  return viewers;
}
