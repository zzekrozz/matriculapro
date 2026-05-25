'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentState } from '@/lib/usePersistentState';

export type BoughtState = 'yes' | 'no' | null;

interface CourseState {
  completedModules: string[];
  completedRouteSteps: string[];
  completedItvSteps: string[];
  completedCases: string[];
  bought: BoughtState;
  markModuleComplete: (id: string) => void;
  toggleRouteStep: (id: string) => void;
  toggleItvStep: (id: string) => void;
  markCaseComplete: (id: string) => void;
  setBought: (b: BoughtState) => void;
  reset: () => void;
}

const CourseContext = createContext<CourseState | null>(null);

const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter(x => x !== id) : [...list, id];

export function CourseProvider({ children }: { children: ReactNode }) {
  const [completedModules, setCompletedModules] = usePersistentState<string[]>('mpro:completed-modules', []);
  const [completedRouteSteps, setCompletedRouteSteps] = usePersistentState<string[]>('mpro:completed-route', []);
  const [completedItvSteps, setCompletedItvSteps] = usePersistentState<string[]>('mpro:completed-itv', []);
  const [completedCases, setCompletedCases] = usePersistentState<string[]>('mpro:completed-cases', []);
  const [bought, setBought] = usePersistentState<BoughtState>('mpro:bought', null);

  const value = useMemo<CourseState>(() => ({
    completedModules,
    completedRouteSteps,
    completedItvSteps,
    completedCases,
    bought,
    markModuleComplete: (id) => setCompletedModules(prev => prev.includes(id) ? prev : [...prev, id]),
    toggleRouteStep: (id) => setCompletedRouteSteps(prev => toggleIn(prev, id)),
    toggleItvStep: (id) => setCompletedItvSteps(prev => toggleIn(prev, id)),
    markCaseComplete: (id) => setCompletedCases(prev => prev.includes(id) ? prev : [...prev, id]),
    setBought,
    reset: () => {
      setCompletedModules([]);
      setCompletedRouteSteps([]);
      setCompletedItvSteps([]);
      setCompletedCases([]);
      setBought(null);
    },
  }), [
    completedModules, completedRouteSteps, completedItvSteps, completedCases, bought,
    setCompletedModules, setCompletedRouteSteps, setCompletedItvSteps, setCompletedCases, setBought
  ]);

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used within CourseProvider');
  return ctx;
}
