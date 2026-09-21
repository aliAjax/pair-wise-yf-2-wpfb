import { create } from 'zustand';
import type { RouteStop, WalkRoute } from '@/types';
import { loadRoutes, saveRoutes, loadRouteDraft, saveRouteDraft } from '@/utils/storage';
import { validateRoutePlan } from '@/utils/routeRules';
import type { RouteRejection } from '@/utils/routeRules';
import { generateId } from '@/utils/comfort';
import { useBenchStore } from '@/store/useBenchStore';

const DEFAULT_STAY_MINUTES = 15;

export interface PackRouteResult {
  ok: boolean;
  route?: WalkRoute;
  rejections: RouteRejection[];
}

interface RouteState {
  routes: WalkRoute[];
  /** 打包台草稿：按访问次序排列，随浏览器存档同步 */
  draftStops: RouteStop[];
  initialized: boolean;
}

interface RouteActions {
  initializeRoutes: () => void;
  toggleDraftStop: (benchId: string) => void;
  moveDraftStop: (benchId: string, direction: 'up' | 'down') => void;
  setDraftStayMinutes: (benchId: string, minutes: number) => void;
  clearDraft: () => void;
  pruneDraftStops: () => void;
  packRoute: (name?: string) => PackRouteResult;
  archiveRoute: (routeId: string) => void;
  removeArchivedStop: (routeId: string, benchId: string) => void;
  deleteRoute: (routeId: string) => void;
}

const initialState: RouteState = {
  routes: [],
  draftStops: [],
  initialized: false,
};

export const useRouteStore = create<RouteState & RouteActions>((set, get) => {
  const persistRoutes = (routes: WalkRoute[]) => {
    set({ routes });
    saveRoutes(routes);
  };

  const persistDraft = (draftStops: RouteStop[]) => {
    set({ draftStops });
    saveRouteDraft(draftStops);
  };

  return {
    ...initialState,

    initializeRoutes: () => {
      set({ routes: loadRoutes(), draftStops: loadRouteDraft(), initialized: true });
    },

    toggleDraftStop: (benchId) => {
      const { draftStops } = get();
      const existing = draftStops.find((stop) => stop.benchId === benchId);
      if (existing) {
        persistDraft(draftStops.filter((stop) => stop.benchId !== benchId));
      } else {
        persistDraft([...draftStops, { benchId, stayMinutes: DEFAULT_STAY_MINUTES }]);
      }
    },

    moveDraftStop: (benchId, direction) => {
      const { draftStops } = get();
      const index = draftStops.findIndex((stop) => stop.benchId === benchId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= draftStops.length) return;
      const next = [...draftStops];
      [next[index], next[target]] = [next[target], next[index]];
      persistDraft(next);
    },

    setDraftStayMinutes: (benchId, minutes) => {
      const stayMinutes = Math.round(minutes);
      if (!Number.isFinite(stayMinutes)) return;
      persistDraft(
        get().draftStops.map((stop) =>
          stop.benchId === benchId ? { ...stop, stayMinutes } : stop
        )
      );
    },

    clearDraft: () => persistDraft([]),

    pruneDraftStops: () => {
      const benches = useBenchStore.getState().benches;
      const ids = new Set(benches.map((b) => b.id));
      const { draftStops } = get();
      const next = draftStops.filter((stop) => ids.has(stop.benchId));
      if (next.length !== draftStops.length) persistDraft(next);
    },

    packRoute: (name) => {
      const { routes, draftStops } = get();
      const benches = useBenchStore.getState().benches;

      // 规则层整单校验：任何一条不通过即整单退回，现有路线与档案不改
      const rejections = validateRoutePlan(draftStops, benches, routes);
      if (rejections.length > 0) {
        return { ok: false, rejections };
      }

      const now = new Date().toISOString();
      const route: WalkRoute = {
        id: generateId(),
        name: name?.trim() || `散步路线 ${routes.length + 1}`,
        stops: draftStops.map((stop) => ({ ...stop })),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      persistRoutes([route, ...routes]);
      persistDraft([]);
      return { ok: true, route, rejections: [] };
    },

    archiveRoute: (routeId) => {
      persistRoutes(
        get().routes.map((route) =>
          route.id === routeId
            ? { ...route, status: 'archived', updatedAt: new Date().toISOString() }
            : route
        )
      );
    },

    removeArchivedStop: (routeId, benchId) => {
      const route = get().routes.find((r) => r.id === routeId);
      if (!route || route.status !== 'archived') return;

      const stops = route.stops.filter((stop) => stop.benchId !== benchId);
      const routes =
        stops.length === 0
          ? get().routes.filter((r) => r.id !== routeId)
          : get().routes.map((r) =>
              r.id === routeId
                ? { ...r, stops, updatedAt: new Date().toISOString() }
                : r
            );
      persistRoutes(routes);

      // 归档后移出某处：该处停止接待，恢复分享须重新确认
      useBenchStore.getState().setRouteServing(benchId, false);
    },

    deleteRoute: (routeId) => {
      persistRoutes(get().routes.filter((route) => route.id !== routeId));
    },
  };
});
