import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Footprints,
  PackagePlus,
  Archive,
  RotateCcw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  X,
  MapPin,
  Clock,
  Route as RouteIcon,
  Ban,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useRouteStore } from '@/store/useRouteStore';
import {
  maxSpanKm,
  totalStayMinutes,
  unfinishedBenchIds,
  MAX_ROUTE_SPAN_KM,
  MAX_TOTAL_STAY_MINUTES,
  MIN_ROUTE_STOPS,
} from '@/utils/routeRules';
import { ROUTE_STATUS_LABELS } from '@/types';
import type { RouteStatus, WalkingRoute } from '@/types';

const STATUS_BADGE: Record<RouteStatus, string> = {
  active: 'bg-moss-green/10 text-moss-green',
  archived: 'bg-ink-light/10 text-ink-light',
  stopped: 'bg-red-500/10 text-red-500',
};

export default function RoutePage() {
  const navigate = useNavigate();
  const { benches, initialize: initBenches, initialized: benchesReady } = useBenchStore();
  const {
    routes,
    initialized: routesReady,
    selectedBenchIds,
    stayDraft,
    rejection,
    initialize: initRoutes,
    toggleBench,
    moveSelected,
    setStayMinutes,
    clearDraft,
    packRoute,
    archiveRoute,
    removeStop,
    restoreRoute,
    dismissRejection,
  } = useRouteStore();

  const [routeName, setRouteName] = useState('');

  useEffect(() => {
    if (!benchesReady) initBenches();
    if (!routesReady) initRoutes();
  }, [benchesReady, routesReady, initBenches, initRoutes]);

  const busyBenchIds = useMemo(() => unfinishedBenchIds(routes), [routes]);

  const draftStops = useMemo(
    () =>
      selectedBenchIds.map((benchId) => ({
        benchId,
        stayMinutes: stayDraft[benchId] ?? 0,
      })),
    [selectedBenchIds, stayDraft]
  );

  const draftTotalStay = totalStayMinutes(draftStops);
  const draftSpan = draftStops.length >= MIN_ROUTE_STOPS ? maxSpanKm(draftStops, benches) : 0;

  const benchById = useMemo(() => new Map(benches.map((bench) => [bench.id, bench])), [benches]);

  const handlePack = () => {
    const result = packRoute(routeName);
    if (result.ok) {
      setRouteName('');
    }
  };

  const handleRestore = (route: WalkingRoute) => {
    if (window.confirm(`恢复分享「${route.name}」需要重新确认，确定恢复吗？`)) {
      restoreRoute(route.id);
    }
  };

  const statusCounts = {
    active: routes.filter((route) => route.status === 'active'),
    archived: routes.filter((route) => route.status === 'archived'),
    stopped: routes.filter((route) => route.status === 'stopped'),
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">
          散步路线打包台
        </h2>
        <p className="text-ink-light text-sm">
          勾选至少 {MIN_ROUTE_STOPS} 处长椅，按访问次序排好并填上停留分钟，即可打包成一条散步路线
        </p>
      </div>

      {rejection && (
        <div className="paper-texture rounded-xl shadow-paper border border-red-500/30 p-4 mb-6 fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-semibold text-deep-brown mb-1">
                整单退回，现有路线与档案未作改动
              </h3>
              <ul className="list-disc list-inside text-sm text-ink-light space-y-0.5">
                {rejection.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={dismissRejection}
              className="text-ink-light hover:text-deep-brown transition-colors"
              aria-label="关闭退回提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* 长椅勾选 */}
        <section className="paper-texture rounded-xl shadow-paper p-5">
          <h3 className="font-serif text-lg font-semibold text-deep-brown mb-1">
            选择长椅
          </h3>
          <p className="text-xs text-ink-light mb-4">
            点击勾选即加入路线，勾选顺序就是访问次序
          </p>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {benches.map((bench) => {
              const checked = selectedBenchIds.includes(bench.id);
              const order = selectedBenchIds.indexOf(bench.id) + 1;
              const busy = busyBenchIds.has(bench.id);

              return (
                <label
                  key={bench.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    busy
                      ? 'opacity-60 cursor-not-allowed border-deep-brown/10 bg-warm-beige/50'
                      : checked
                        ? 'cursor-pointer border-moss-green bg-moss-green/5'
                        : 'cursor-pointer border-deep-brown/10 bg-white/50 hover:border-moss-green/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={checked}
                    onChange={() => toggleBench(bench.id)}
                    className="w-4 h-4 accent-moss-green flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-deep-brown text-sm truncate">
                        {bench.name}
                      </span>
                      {busy && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-ochre/10 text-ochre text-xs rounded">
                          未结束路线中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-ink-light">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{bench.location}</span>
                    </div>
                  </div>
                  {checked && (
                    <span className="w-6 h-6 rounded-full bg-moss-green text-white text-xs flex items-center justify-center flex-shrink-0">
                      {order}
                    </span>
                  )}
                </label>
              );
            })}

            {benches.length === 0 && (
              <p className="text-sm text-ink-light text-center py-8">
                还没有长椅档案，先去添加几处长椅吧
              </p>
            )}
          </div>
        </section>

        {/* 访问次序与停留 */}
        <section className="paper-texture rounded-xl shadow-paper p-5 flex flex-col">
          <h3 className="font-serif text-lg font-semibold text-deep-brown mb-1">
            访问次序与停留
          </h3>
          <p className="text-xs text-ink-light mb-4">
            为每处填写停留分钟，可调整访问先后
          </p>

          <input
            type="text"
            value={routeName}
            onChange={(event) => setRouteName(event.target.value)}
            placeholder={`路线名称（默认：散步路线 ${routes.length + 1}）`}
            className="w-full px-3 py-2 mb-4 bg-white/50 border border-deep-brown/10 rounded-lg text-sm text-deep-brown placeholder:text-ink-light/60 focus:bg-white transition-colors"
          />

          <div className="space-y-2 flex-1">
            {selectedBenchIds.map((benchId, index) => {
              const bench = benchById.get(benchId);
              if (!bench) return null;
              return (
                <div
                  key={benchId}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white/60 border border-deep-brown/10"
                >
                  <span className="w-6 h-6 rounded-full bg-moss-green text-white text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-deep-brown truncate">
                      {bench.name}
                    </div>
                    <div className="text-xs text-ink-light truncate">{bench.location}</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={MAX_TOTAL_STAY_MINUTES}
                    value={stayDraft[benchId] ?? ''}
                    onChange={(event) =>
                      setStayMinutes(benchId, Number(event.target.value))
                    }
                    placeholder="分钟"
                    className="w-20 px-2 py-1.5 bg-white/70 border border-deep-brown/10 rounded-lg text-sm text-deep-brown text-center"
                  />
                  <span className="text-xs text-ink-light flex-shrink-0">分钟</span>
                  <div className="flex flex-col flex-shrink-0">
                    <button
                      onClick={() => moveSelected(benchId, -1)}
                      disabled={index === 0}
                      className="text-ink-light hover:text-deep-brown disabled:opacity-30 transition-colors"
                      aria-label="上移"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSelected(benchId, 1)}
                      disabled={index === selectedBenchIds.length - 1}
                      className="text-ink-light hover:text-deep-brown disabled:opacity-30 transition-colors"
                      aria-label="下移"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleBench(benchId)}
                    className="text-ink-light hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="移出选择"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {selectedBenchIds.length === 0 && (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center border border-dashed border-deep-brown/15 rounded-lg">
                <Footprints className="w-8 h-8 text-moss-green/40 mb-2" />
                <p className="text-sm text-ink-light">
                  从左侧勾选长椅，这里会按访问次序列出
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-deep-brown/10">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-light mb-3">
              <span>
                已选{' '}
                <span className="font-medium text-deep-brown">
                  {selectedBenchIds.length}
                </span>{' '}
                / 至少 {MIN_ROUTE_STOPS} 处
              </span>
              <span>
                总停留{' '}
                <span
                  className={`font-medium ${
                    draftTotalStay > MAX_TOTAL_STAY_MINUTES ? 'text-red-500' : 'text-deep-brown'
                  }`}
                >
                  {draftTotalStay}
                </span>{' '}
                / {MAX_TOTAL_STAY_MINUTES} 分钟
              </span>
              <span>
                最大跨度{' '}
                <span
                  className={`font-medium ${
                    draftSpan > MAX_ROUTE_SPAN_KM ? 'text-red-500' : 'text-deep-brown'
                  }`}
                >
                  {draftSpan.toFixed(2)}
                </span>{' '}
                / {MAX_ROUTE_SPAN_KM} 公里
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePack}
                disabled={selectedBenchIds.length < MIN_ROUTE_STOPS}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-moss-green text-white rounded-lg font-medium text-sm hover:bg-moss-light transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PackagePlus className="w-4 h-4" />
                打包路线
              </button>
              {selectedBenchIds.length > 0 && (
                <button
                  onClick={clearDraft}
                  className="px-4 py-2.5 text-sm text-ink-light hover:text-deep-brown hover:bg-deep-brown/5 rounded-lg transition-colors"
                >
                  清空
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 路线列表 */}
      <div className="mb-4 flex items-center gap-2">
        <RouteIcon className="w-5 h-5 text-moss-green" />
        <h3 className="font-serif text-xl font-semibold text-deep-brown">路线档案</h3>
        <span className="text-sm text-ink-light">
          未结束 {statusCounts.active.length} · 已归档 {statusCounts.archived.length} · 停止接待{' '}
          {statusCounts.stopped.length}
        </span>
      </div>

      {routes.length > 0 ? (
        <div className="space-y-4">
          {routes.map((route) => {
            const totalStay = totalStayMinutes(route.stops);
            const span = maxSpanKm(route.stops, benches);

            return (
              <article
                key={route.id}
                className="paper-texture rounded-xl shadow-paper p-5 fade-in"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h4 className="font-serif text-lg font-semibold text-deep-brown">
                    {route.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[route.status]}`}
                  >
                    {ROUTE_STATUS_LABELS[route.status]}
                  </span>
                  <span className="text-xs text-ink-light ml-auto">
                    共 {route.stops.length} 处 · 总停留 {totalStay} 分钟 · 跨度{' '}
                    {span.toFixed(2)} 公里
                  </span>
                </div>

                <ol className="space-y-1.5 mb-4">
                  {route.stops.map((stop, index) => {
                    const bench = benchById.get(stop.benchId);
                    return (
                      <li
                        key={stop.benchId}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-white/50 border border-deep-brown/5"
                      >
                        <span className="w-5 h-5 rounded-full bg-moss-green/15 text-moss-green text-xs flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => bench && navigate(`/bench/${bench.id}`)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <span className="text-sm font-medium text-deep-brown truncate block">
                            {bench?.name ?? '已删除的长椅'}
                          </span>
                          <span className="text-xs text-ink-light truncate block">
                            {bench?.location ?? '—'}
                          </span>
                        </button>
                        <span className="flex items-center gap-1 text-xs text-ink-light flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {stop.stayMinutes} 分钟
                        </span>
                        {route.status === 'archived' && (
                          <button
                            onClick={() => removeStop(route.id, stop.benchId)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
                          >
                            <Ban className="w-3 h-3" />
                            移出
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>

                <div className="flex items-center gap-2">
                  {route.status === 'active' && (
                    <button
                      onClick={() => archiveRoute(route.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-ochre text-white rounded-lg text-sm font-medium hover:bg-ochre-light transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      归档路线
                    </button>
                  )}
                  {route.status === 'stopped' && (
                    <>
                      <p className="text-xs text-red-500/80">
                        已停止接待，恢复分享须重新确认
                      </p>
                      <button
                        onClick={() => handleRestore(route)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-moss-green text-white rounded-lg text-sm font-medium hover:bg-moss-light transition-colors ml-auto"
                      >
                        <RotateCcw className="w-4 h-4" />
                        恢复分享
                      </button>
                    </>
                  )}
                  {route.status === 'archived' && (
                    <p className="text-xs text-ink-light">
                      归档后若移出某处，路线将停止接待
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="paper-texture rounded-xl shadow-paper p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-moss-green/10 flex items-center justify-center mx-auto mb-4">
            <RouteIcon className="w-8 h-8 text-moss-green/50" />
          </div>
          <h3 className="font-serif text-lg font-medium text-deep-brown mb-2">
            还没有散步路线
          </h3>
          <p className="text-ink-light text-sm">
            在上方打包台勾选长椅，打包第一条散步路线吧
          </p>
        </div>
      )}
    </div>
  );
}
