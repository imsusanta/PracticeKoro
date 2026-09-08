import { supabase } from "@/integrations/supabase/client";

const POPULAR_TESTS_KEY = "practicekoro_popular_mock_tests";
const SITE_SETTING_KEY = "popular_mock_tests";

/**
 * Get popular test IDs from localStorage cache immediately
 */
export const getCachedPopularTestIds = (): string[] => {
  try {
    const stored = localStorage.getItem(POPULAR_TESTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error reading cached popular tests:", e);
  }
  return [];
};

/**
 * Fetch popular test IDs from Supabase site_settings
 */
export const fetchPopularTestIds = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SITE_SETTING_KEY)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch popular tests from site_settings:", error.message);
      return getCachedPopularTestIds();
    }

    if (data?.value) {
      const ids: string[] = JSON.parse(data.value);
      localStorage.setItem(POPULAR_TESTS_KEY, JSON.stringify(ids));
      return ids;
    }
  } catch (e) {
    console.error("Error in fetchPopularTestIds:", e);
  }
  return getCachedPopularTestIds();
};

/**
 * Save popular test IDs to Supabase site_settings & localStorage
 */
export const savePopularTestIds = async (testIds: string[]): Promise<boolean> => {
  try {
    localStorage.setItem(POPULAR_TESTS_KEY, JSON.stringify(testIds));

    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: SITE_SETTING_KEY,
        value: JSON.stringify(testIds),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to update popular tests in site_settings:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error in savePopularTestIds:", e);
    return false;
  }
};

/**
 * Toggle whether a test is in the popular tests list
 */
export const togglePopularTestId = async (testId: string): Promise<{ isPopular: boolean; allIds: string[] }> => {
  const current = await fetchPopularTestIds();
  const exists = current.includes(testId);
  const next = exists ? current.filter(id => id !== testId) : [...current, testId];
  await savePopularTestIds(next);
  return { isPopular: !exists, allIds: next };
};
