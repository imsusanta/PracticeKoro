import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getActiveSubscription, getYearlySubscriptionFee } from "@/lib/subscription";

export function useActiveSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["billing", "active-subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getActiveSubscription(user!.id),
    staleTime: 60 * 1000,
  });
}

export function useHasActiveSubscription() {
  const query = useActiveSubscription();
  return {
    ...query,
    hasSubscription: Boolean(query.data),
  };
}

export function useYearlySubscriptionFee() {
  return useQuery({
    queryKey: ["billing", "yearly-fee"],
    queryFn: getYearlySubscriptionFee,
    staleTime: 5 * 60 * 1000,
  });
}
