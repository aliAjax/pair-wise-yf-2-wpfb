import type { Bench, RouteStop, WalkRoute } from '@/types';

/** 打包规则常量：至少两处、两地跨度上限五公里、总停留上限九十分钟 */
export const MIN_ROUTE_STOPS = 2;
export const MAX_ROUTE_SPAN_KM = 5;
export const MAX_TOTAL_STAY_MINUTES = 90;
export const MIN_STAY_MINUTES_PER_STOP = 1;

export type RouteRejectionCode =
  | 'too-few-stops'
  | 'stop-missing'
  | 'duplicate-stop'
  | 'invalid-stay'
  | 'stop-in-active-route'
  | 'stop-not-serving'
  | 'span-too-large'
  | 'stay-too-long';

export interface RouteRejection {
  code: RouteRejectionCode;
  message: string;
}

/** 长椅是否仍在接待新路线（旧档案缺省视为正常接待） */
export function isBenchServing(bench: Bench): boolean {
  return bench.routeServing !== false;
}

/** 哈弗辛公式：两处经纬度之间的球面距离（公里） */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function getTotalStayMinutes(stops: RouteStop[]): number {
  return stops.reduce((sum, stop) => sum + (stop.stayMinutes || 0), 0);
}

/** 路线中相距最远的两处及其跨度（公里） */
export function getMaxSpan(
  stops: RouteStop[],
  benches: Bench[]
): { km: number; from?: Bench; to?: Bench } {
  let max = { km: 0, from: undefined as Bench | undefined, to: undefined as Bench | undefined };
  const byId = new Map(benches.map((b) => [b.id, b]));
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const a = byId.get(stops[i].benchId);
      const b = byId.get(stops[j].benchId);
      if (!a || !b) continue;
      const km = haversineKm(a, b);
      if (km > max.km) max = { km, from: a, to: b };
    }
  }
  return max;
}

/** 各长椅当前所属的未结束路线（一张长椅至多归入一条） */
export function getActiveRouteByBench(routes: WalkRoute[]): Map<string, WalkRoute> {
  const map = new Map<string, WalkRoute>();
  for (const route of routes) {
    if (route.status !== 'active') continue;
    for (const stop of route.stops) {
      map.set(stop.benchId, route);
    }
  }
  return map;
}

/**
 * 校验一整单打包请求。
 * 返回空数组表示通过；否则返回全部退回原因（调用方须保证整单退回、不做任何改动）。
 */
export function validateRoutePlan(
  stops: RouteStop[],
  benches: Bench[],
  routes: WalkRoute[]
): RouteRejection[] {
  const rejections: RouteRejection[] = [];
  const byId = new Map(benches.map((b) => [b.id, b]));

  if (stops.length < MIN_ROUTE_STOPS) {
    rejections.push({
      code: 'too-few-stops',
      message: `至少勾选 ${MIN_ROUTE_STOPS} 处才能打包路线（当前 ${stops.length} 处）`,
    });
    return rejections;
  }

  const seen = new Set<string>();
  const activeRouteByBench = getActiveRouteByBench(routes);

  for (const stop of stops) {
    const bench = byId.get(stop.benchId);
    if (!bench) {
      rejections.push({
        code: 'stop-missing',
        message: '清单中包含已不存在的档案，请移除后重试',
      });
      continue;
    }
    if (seen.has(stop.benchId)) {
      rejections.push({
        code: 'duplicate-stop',
        message: `「${bench.name}」被重复勾选`,
      });
    }
    seen.add(stop.benchId);

    if (
      !Number.isFinite(stop.stayMinutes) ||
      stop.stayMinutes < MIN_STAY_MINUTES_PER_STOP ||
      stop.stayMinutes > MAX_TOTAL_STAY_MINUTES
    ) {
      rejections.push({
        code: 'invalid-stay',
        message: `「${bench.name}」的停留分钟需为 ${MIN_STAY_MINUTES_PER_STOP}-${MAX_TOTAL_STAY_MINUTES} 之间的数字`,
      });
    }

    const occupying = activeRouteByBench.get(stop.benchId);
    if (occupying) {
      rejections.push({
        code: 'stop-in-active-route',
        message: `「${bench.name}」已归入未结束路线「${occupying.name}」`,
      });
    }

    if (!isBenchServing(bench)) {
      rejections.push({
        code: 'stop-not-serving',
        message: `「${bench.name}」已停止接待，须恢复分享后才能加入新路线`,
      });
    }
  }

  const span = getMaxSpan(stops, benches);
  if (span.km > MAX_ROUTE_SPAN_KM && span.from && span.to) {
    rejections.push({
      code: 'span-too-large',
      message: `「${span.from.name}」与「${span.to.name}」两地跨度 ${span.km.toFixed(1)} 公里，超过 ${MAX_ROUTE_SPAN_KM} 公里上限`,
    });
  }

  const totalStay = getTotalStayMinutes(stops);
  if (totalStay > MAX_TOTAL_STAY_MINUTES) {
    rejections.push({
      code: 'stay-too-long',
      message: `总停留 ${totalStay} 分钟，超过 ${MAX_TOTAL_STAY_MINUTES} 分钟上限`,
    });
  }

  return rejections;
}
