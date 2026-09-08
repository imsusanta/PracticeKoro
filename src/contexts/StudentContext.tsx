import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  StudentProfile,
  fetchStudentProfile,
  checkUserSubscription,
  fetchSiteSubscriptionFee
} from "@/services/studentService";

interface StudentContextType {
  session: Session | null;
  user: User | null;
  profile: StudentProfile | null;
  hasSubscription: boolean;
  subscriptionFee: number;
  isLoading: boolean;
  refreshSubscription: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [subscriptionFee, setSubscriptionFee] = useState<number>(199);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load all user essentials in parallel
  const loadUserData = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setHasSubscription(false);
      setIsLoading(false);
      return;
    }

    setSession(activeSession);
    setUser(activeSession.user);

    try {
      const [profileData, isSubscribed, fee] = await Promise.all([
        fetchStudentProfile(activeSession.user.id),
        checkUserSubscription(activeSession.user.id),
        fetchSiteSubscriptionFee(),
      ]);

      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({
          id: activeSession.user.id,
          full_name:
            activeSession.user.user_metadata?.full_name ||
            activeSession.user.email?.split("@")[0] ||
            "Student",
          avatar_url: null,
          email: activeSession.user.email || "",
          phone: null,
        });
      }

      setHasSubscription(isSubscribed);
      setSubscriptionFee(fee);
    } catch (err) {
      console.error("Error loading student context data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      loadUserData(initialSession);
    });

    // Auth state listener
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        loadUserData(updatedSession);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [loadUserData]);

  // Re-check subscription and invalidate mockTests / test queries
  const refreshSubscription = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const isSubscribed = await checkUserSubscription(user.id);
    setHasSubscription(isSubscribed);

    // Invalidate React Query caches so UI updates instantaneously
    await queryClient.invalidateQueries({ queryKey: ["mockTests"] });
    await queryClient.invalidateQueries({ queryKey: ["exams"] });
    return isSubscribed;
  }, [user, queryClient]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const updated = await fetchStudentProfile(user.id);
    if (updated) {
      setProfile(updated);
    }
  }, [user]);

  // Logout cleanly
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setSession(null);
    setUser(null);
    setProfile(null);
    setHasSubscription(false);
  }, [queryClient]);

  return (
    <StudentContext.Provider
      value={{
        session,
        user,
        profile,
        hasSubscription,
        subscriptionFee,
        isLoading,
        refreshSubscription,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudentAuth = (): StudentContextType => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error("useStudentAuth must be used within a StudentProvider");
  }
  return context;
};
