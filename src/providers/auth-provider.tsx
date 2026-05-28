"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setCouple, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const fetchUserData = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) setUser(profile as UserProfile);

      const { data: couples } = await supabase
        .from("couples")
        .select("*, owner:owner_id(id,name,email,avatar_url), partner:partner_id(id,name,email,avatar_url)")
        .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      setCouple(couples?.[0] ?? null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setUser(null);
        setCouple(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setUser(null);
          setCouple(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setCouple, setLoading]);

  return <>{children}</>;
}
