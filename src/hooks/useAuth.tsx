import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  const checkAdminRole = useCallback(async (userId: string) => {
    setAdminCheckError(null);
    try {
      console.log("Checking admin role via has_role RPC for user:", userId);
      
      // Use the SECURITY DEFINER function to bypass RLS
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin" as AppRole,
      });

      if (error) {
        console.error("Error checking admin role:", error);
        setAdminCheckError(`${error.code || "ERROR"}: ${error.message}`);
        setIsAdmin(false);
      } else {
        console.log("Admin role check result:", data);
        setIsAdmin(data === true);
      }
    } catch (err: any) {
      console.error("Exception checking admin role:", err);
      setAdminCheckError(err?.message || "Unknown error during role check");
      setIsAdmin(false);
    } finally {
      setAdminChecked(true);
    }
  }, []);

  const recheckAdminRole = useCallback(() => {
    if (user) {
      setAdminChecked(false);
      checkAdminRole(user.id);
    }
  }, [user, checkAdminRole]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        // Defer role check to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setAdminChecked(true);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Got existing session:", session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkAdminRole(session.user.id).then(() => {
          setLoading(false);
        });
      } else {
        setAdminChecked(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setIsAdmin(false);
    }
    return { error };
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    adminChecked,
    adminCheckError,
    recheckAdminRole,
    signIn,
    signUp,
    signOut,
  };
}
