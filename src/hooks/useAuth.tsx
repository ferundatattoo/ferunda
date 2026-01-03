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
    const TIMEOUT_MS = 8000;
    
    try {
      console.log("Checking admin role via has_role RPC for user:", userId);
      
      // Use Promise.race to implement timeout
      const rpcPromise = supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin" as AppRole,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout checking admin role")), TIMEOUT_MS)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

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
      const msg = err?.message || "Unknown error during role check";
      setAdminCheckError(msg.includes("Timeout") ? "Timeout verificando rol de admin" : msg);
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
    let isMounted = true;
    const SESSION_TIMEOUT_MS = 6000;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("Auth state changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
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

    // THEN check for existing session with timeout
    const initSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => {
            console.warn("Session fetch timeout - proceeding without session");
            resolve({ data: { session: null } });
          }, SESSION_TIMEOUT_MS)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted) return;
        
        console.log("Got existing session:", session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkAdminRole(session.user.id);
        } else {
          setAdminChecked(true);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        setAdminCheckError("Error al obtener sesión");
        setAdminChecked(true);
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
