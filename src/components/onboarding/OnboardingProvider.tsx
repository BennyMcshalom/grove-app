"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { MAX_CHAPTERS } from "@/lib/chapters";

/**
 * Onboarding answers, shared across the flow's steps.
 *
 * Persisted to sessionStorage so a refresh mid-flow doesn't wipe the user's
 * answers. There is no backend yet — swap `persist` for an API call when one
 * exists.
 */
export interface OnboardingState {
  chapters: string[];
  /** chapter slug -> chosen option labels */
  spaces: Record<string, string[]>;
  profile: {
    mind: string;
    workingThrough: string;
    lookingFor: string;
  };
}

const EMPTY: OnboardingState = {
  chapters: [],
  spaces: {},
  profile: { mind: "", workingThrough: "", lookingFor: "" },
};

const STORAGE_KEY = "grouv.onboarding";

interface OnboardingContextValue extends OnboardingState {
  toggleChapter: (slug: string) => void;
  setSpaceOptions: (slug: string, options: string[]) => void;
  setProfileField: (field: keyof OnboardingState["profile"], value: string) => void;
  /** Position of a chapter in the chosen set, for "Space 2 of 4". */
  spaceIndex: (slug: string) => number;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(EMPTY);

  // Read persisted answers after mount so server and client markup match.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      // Private mode or blocked storage — carry on with an empty flow.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Non-fatal: answers just won't survive a refresh.
    }
  }, [state]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...state,
      toggleChapter: (slug) =>
        setState((prev) => {
          const chosen = prev.chapters.includes(slug);
          if (chosen) {
            const { [slug]: _removed, ...restSpaces } = prev.spaces;
            return {
              ...prev,
              chapters: prev.chapters.filter((s) => s !== slug),
              spaces: restSpaces,
            };
          }
          if (prev.chapters.length >= MAX_CHAPTERS) return prev;
          return { ...prev, chapters: [...prev.chapters, slug] };
        }),
      setSpaceOptions: (slug, options) =>
        setState((prev) => ({
          ...prev,
          spaces: { ...prev.spaces, [slug]: options },
        })),
      setProfileField: (field, fieldValue) =>
        setState((prev) => ({
          ...prev,
          profile: { ...prev.profile, [field]: fieldValue },
        })),
      spaceIndex: (slug) => state.chapters.indexOf(slug),
      reset: () => setState(EMPTY),
    }),
    [state],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return context;
}
