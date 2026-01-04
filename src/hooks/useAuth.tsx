import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Cache to prevent multiple simultaneous admin checks
const adminCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const checkInProgressRef = useRef<Promise<boolean> | null>(null);

  const checkAdminRole = useCallback(async (userId: string) => {
    // Check cache first
    const cached = adminCheckCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Using cached admin role:", cached.result);
      setIsAdmin(cached.result);
      setAdminChecked(true);
      return;
    }

    // If already checking, wait for that check to complete
    if (checkInProgressRef.current) {
      try {
        const result = await checkInProgressRef.current;
        setIsAdmin(result);
        setAdminChecked(true);
      } catch {
        setIsAdmin(false);
        setAdminChecked(true);
      }
      return;
    }

    // Start new check
    const checkPromise = (async (): Promise<boolean> => {
      setAdminCheckError(null);
      
      try {
        console.log("Checking admin role via has_role RPC for user:", userId);
        
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin" as AppRole,
        });

        if (error) {
          console.error("Error checking admin role:", error);
          setAdminCheckError(`${error.code || "ERROR"}: ${error.message}`);
          return false;
        } else {
          console.log("Admin role check result:", data);
          const isAdminResult = data === true;
          // Cache the result
          adminCheckCache.set(userId, { result: isAdminResult, timestamp: Date.now() });
          return isAdminResult;
        }
      } catch (err: any) {
        console.error("Exception checking admin role:", err);
        setAdminCheckError(err?.message || "Unknown error during role check");
        return false;
      }
    })();

    checkInProgressRef.current = checkPromise;

    try {
      const result = await checkPromise;
      setIsAdmin(result);
    } catch {
      setIsAdmin(false);
    } finally {
      setAdminChecked(true);
      checkInProgressRef.current = null;
    }
  }, []);

  const recheckAdminRole = useCallback(() => {
    if (user) {
      setAdminChecked(false);
      checkAdminRole(user.id);
    }
  }, [user, checkAdminRole]);

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("Auth state changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use async/await properly instead of setTimeout
          try {
            await checkAdminRole(session.user.id);
          } finally {
            if (isMounted) setLoading(false);
          }
        } else {
          setIsAdmin(false);
          setAdminChecked(true);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        console.log("Got existing session:", session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkAdminRole(session.user.id);
        } else {
          setAdminChecked(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminRole]);


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
