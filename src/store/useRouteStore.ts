import { create } from 'zustand';
import type { RouteStop, WalkingRoute } from '@/types';
import { loadRoutes, saveRoutes } from '@/utils/storage';
import { validateRoutePlan } from '@/utils/routeRules';
import { generateId } from '@/utils/comfort';
import { useBenchStore } from '@/store/useBenchStore';

interface RouteState {
  routes: WalkingRoute[];
  initialized: boolean;
  /** 打包台勾选的长椅，按勾选先后即访问次序排列 */
  selectedBenchIds: string[];
  /** 每处长椅的停留分钟草稿 */
  stayDraft: Record<string, number>;
  /** 整单退回的原因；为 null 表示没有未处理的退回 */
  rejection: string[] | null;
}

interface RouteActions {
  initialize: () => void;
  toggleBench: (benchId: string) => void;
  moveSelected: (benchId: string, direction: -1 | 1) => void;
  setStayMinutes: (benchId: string, minutes: number) => void;
  clearDraft: () => void;
  packRoute: (name: string) => { ok: boolean; reasons: string[] };
  archiveRoute: (id: string) => void;
  removeStop: (routeId: string, benchId: string) => void;
  restoreRoute: (id: string) => void;
  dismissRejection: () => void;
}

const initialState: RouteState = {
  routes: [],
  initialized: false,
  selectedBenchIds: [],
  stayDraft: {},
  rejection: null,
};

export const useRouteStore = create<RouteState & RouteActions>((set, get) => {
  const persist = (routes: WalkingRoute[]) => {
    set({ routes });
    saveRoutes(routes);
  };

  return {
    ...initialState,

    initialize: () => {
      set({ routes: loadRoutes(), initialized: true });
    },

    toggleBench: (benchId) => {
      const { selectedBenchIds } = get();
      if (selectedBenchIds.includes(benchId)) {
        set({ selectedBenchIds: selectedBenchIds.filter((id) => id !== benchId) });
      } else {
        set({ selectedBenchIds: [...selectedBenchIds, benchId] });
      }
    },

    moveSelected: (benchId, direction) => {
      const ids = [...get().selectedBenchIds];
      const index = ids.indexOf(benchId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      set({ selectedBenchIds: ids });
    },

    setStayMinutes: (benchId, minutes) => {
      set({ stayDraft: { ...get().stayDraft, [benchId]: minutes } });
    },

    clearDraft: () => set({ selectedBenchIds: [], stayDraft: {}, rejection: null }),

    packRoute: (name) => {
      const { selectedBenchIds, stayDraft, routes } = get();
      const stops: RouteStop[] = selectedBenchIds.map((benchId) => ({
        benchId,
        stayMinutes: stayDraft[benchId] ?? 0,
      }));

      const reasons = validateRoutePlan(stops, useBenchStore.getState().benches, routes);
      if (reasons.length > 0) {
        // 整单退回：现有路线与档案保持不变
        set({ rejection: reasons });
        return { ok: false, reasons };
      }

      const now = new Date().toISOString();
      const route: WalkingRoute = {
        id: generateId(),
        name: name.trim() || `散步路线 ${routes.length + 1}`,
        stops,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      persist([route, ...routes]);
      set({ selectedBenchIds: [], stayDraft: {}, rejection: null });
      return { ok: true, reasons: [] };
    },

    archiveRoute: (id) => {
      const now = new Date().toISOString();
      persist(
        get().routes.map((route) =>
          route.id === id && route.status === 'active'
            ? { ...route, status: 'archived', archivedAt: now, updatedAt: now }
            : route
        )
      );
    },

    removeStop: (routeId, benchId) => {
      // 归档后移出某处：路线停止接待
      persist(
        get().routes.map((route) =>
          route.id === routeId && route.status === 'archived'
            ? {
                ...route,
                stops: route.stops.filter((stop) => stop.benchId !== benchId),
                status: 'stopped',
                updatedAt: new Date().toISOString(),
              }
            : route
        )
      );
    },

    restoreRoute: (id) => {
      persist(
        get().routes.map((route) =>
          route.id === id && route.status === 'stopped'
            ? { ...route, status: 'archived', updatedAt: new Date().toISOString() }
            : route
        )
      );
    },

    dismissRejection: () => set({ rejection: null }),
  };
});
