import type { Bench, RouteStop, WalkingRoute } from '@/types';

export const MIN_ROUTE_STOPS = 2;
export const MAX_ROUTE_SPAN_KM = 5;
export const MAX_TOTAL_STAY_MINUTES = 90;

interface LatLng {
  lat: number;
  lng: number;
}

/** 两点间球面距离（公里） */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function totalStayMinutes(stops: RouteStop[]): number {
  return stops.reduce((sum, stop) => sum + (stop.stayMinutes || 0), 0);
}

/** 任意两处之间的最大跨度（公里），不足两处时为 0 */
export function maxSpanKm(stops: RouteStop[], benches: Bench[]): number {
  const points = stops
    .map((stop) => benches.find((bench) => bench.id === stop.benchId))
    .filter((bench): bench is Bench => Boolean(bench));

  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, distanceKm(points[i], points[j]));
    }
  }
  return max;
}

/** 已归入未结束路线的长椅 id 集合 */
export function unfinishedBenchIds(routes: WalkingRoute[]): Set<string> {
  const ids = new Set<string>();
  routes
    .filter((route) => route.status === 'active')
    .forEach((route) => route.stops.forEach((stop) => ids.add(stop.benchId)));
  return ids;
}

/** 未结束路线中各长椅的访问次序号（用于地图编号） */
export function stopOrderByBench(routes: WalkingRoute[]): Map<string, number> {
  const orders = new Map<string, number>();
  routes
    .filter((route) => route.status === 'active')
    .forEach((route) => {
      route.stops.forEach((stop, index) => {
        if (!orders.has(stop.benchId)) {
          orders.set(stop.benchId, index + 1);
        }
      });
    });
  return orders;
}

/**
 * 打包校验：任一规则不满足则整单退回，返回全部退回原因；
 * 返回空数组表示可以打包。
 */
export function validateRoutePlan(
  stops: RouteStop[],
  benches: Bench[],
  routes: WalkingRoute[]
): string[] {
  const reasons: string[] = [];

  if (stops.length < MIN_ROUTE_STOPS) {
    reasons.push(`至少勾选 ${MIN_ROUTE_STOPS} 处长椅才能打包路线`);
  }

  const benchById = new Map(benches.map((bench) => [bench.id, bench]));
  const nameOf = (benchId: string) => benchById.get(benchId)?.name ?? '未知长椅';

  stops.forEach((stop) => {
    if (!Number.isFinite(stop.stayMinutes) || stop.stayMinutes <= 0) {
      reasons.push(`请为「${nameOf(stop.benchId)}」填写停留分钟`);
    }
  });

  const busy = unfinishedBenchIds(routes);
  stops.forEach((stop) => {
    if (busy.has(stop.benchId)) {
      reasons.push(`「${nameOf(stop.benchId)}」已归入未结束的路线，不能重复打包`);
    }
  });

  const seen = new Set<string>();
  stops.forEach((stop) => {
    if (seen.has(stop.benchId)) {
      reasons.push(`「${nameOf(stop.benchId)}」在路线中重复出现`);
    }
    seen.add(stop.benchId);
  });

  if (stops.length >= MIN_ROUTE_STOPS) {
    const span = maxSpanKm(stops, benches);
    if (span > MAX_ROUTE_SPAN_KM) {
      reasons.push(`两地跨度 ${span.toFixed(2)} 公里，超过 ${MAX_ROUTE_SPAN_KM} 公里上限`);
    }
  }

  const totalStay = totalStayMinutes(stops);
  if (totalStay > MAX_TOTAL_STAY_MINUTES) {
    reasons.push(`总停留 ${totalStay} 分钟，超过 ${MAX_TOTAL_STAY_MINUTES} 分钟上限`);
  }

  return reasons;
}
