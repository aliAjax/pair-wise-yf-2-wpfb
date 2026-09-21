import { useEffect, useMemo, useState } from 'react';
import {
  Footprints,
  Package,
  Archive,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  MapPin,
  Clock,
  Ruler,
  AlertTriangle,
  Share2,
  CirclePause,
  Check,
} from 'lucide-react';
import { useBenchStore } from '@/store/useBenchStore';
import { useRouteStore } from '@/store/useRouteStore';
import {
  MIN_ROUTE_STOPS,
  MAX_ROUTE_SPAN_KM,
  MAX_TOTAL_STAY_MINUTES,
  isBenchServing,
  getTotalStayMinutes,
  getMaxSpan,
  getActiveRouteByBench,
} from '@/utils/routeRules';
import type { RouteRejection } from '@/utils/routeRules';
import { ROUTE_STATUS_LABELS } from '@/types';
import type { WalkRoute } from '@/types';

type ConfirmState =
  | { kind: 'archive'; route: WalkRoute }
  | { kind: 'deleteRoute'; route: WalkRoute }
  | { kind: 'removeStop'; route: WalkRoute; benchId: string; benchName: string }
  | { kind: 'restore'; benchId: string; benchName: string }
  | null;

export default function RoutePage() {
  const { benches, initialize, initialized } = useBenchStore();
  const setRouteServing = useBenchStore((s) => s.setRouteServing);
  const {
    routes,
    draftStops,
    initialized: routesInitialized,
    initializeRoutes,
    toggleDraftStop,
    moveDraftStop,
    setDraftStayMinutes,
    clearDraft,
    pruneDraftStops,
    packRoute,
    archiveRoute,
    removeArchivedStop,
    deleteRoute,
  } = useRouteStore();

  const [routeName, setRouteName] = useState('');
  const [rejections, setRejections] = useState<RouteRejection[]>([]);
  const [packedName, setPackedName] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  useEffect(() => {
    if (!initialized) initialize();
    if (!routesInitialized) initializeRoutes();
  }, [initialized, routesInitialized, initialize, initializeRoutes]);

  useEffect(() => {
    if (initialized && routesInitialized) pruneDraftStops();
  }, [initialized, routesInitialized, benches.length, pruneDraftStops]);

  const benchById = useMemo(() => new Map(benches.map((b) => [b.id, b])), [benches]);
  const activeRouteByBench = useMemo(() => getActiveRouteByBench(routes), [routes]);
  const draftIds = useMemo(() => new Set(draftStops.map((s) => s.benchId)), [draftStops]);

  const totalStay = getTotalStayMinutes(draftStops);
  const maxSpan = getMaxSpan(draftStops, benches);
  const stayOver = totalStay > MAX_TOTAL_STAY_MINUTES;
  const spanOver = maxSpan.km > MAX_ROUTE_SPAN_KM;
  const canPack = draftStops.length >= MIN_ROUTE_STOPS;

  const activeRoutes = routes.filter((r) => r.status === 'active');
  const archivedRoutes = routes.filter((r) => r.status === 'archived');
  const pausedBenches = benches.filter((b) => !isBenchServing(b));

  const handlePack = () => {
    setPackedName(null);
    const result = packRoute(routeName);
    if (result.ok && result.route) {
      setRejections([]);
      setRouteName('');
      setPackedName(result.route.name);
    } else {
      setRejections(result.rejections);
    }
  };

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'archive') archiveRoute(confirm.route.id);
    if (confirm.kind === 'deleteRoute') deleteRoute(confirm.route.id);
    if (confirm.kind === 'removeStop') removeArchivedStop(confirm.route.id, confirm.benchId);
    if (confirm.kind === 'restore') setRouteServing(confirm.benchId, true);
    setConfirm(null);
  };

  const confirmCopy: Record<string, { title: string; body: string; action: string }> = {
    archive: {
      title: '归档路线',
      body: `确定归档「${confirm?.kind === 'archive' ? confirm.route.name : ''}」吗？归档后途经点可逐处移出，移出的长椅将停止接待。`,
      action: '归档',
    },
    deleteRoute: {
      title: '取消路线',
      body: `确定取消「${confirm?.kind === 'deleteRoute' ? confirm.route.name : ''}」吗？路线内的长椅将解除占用。`,
      action: '取消路线',
    },
    removeStop: {
      title: '移出途经点',
      body: `将「${confirm?.kind === 'removeStop' ? confirm.benchName : ''}」移出已归档路线后，该处将停止接待，恢复分享须重新确认。`,
      action: '移出并停止接待',
    },
    restore: {
      title: '恢复分享',
      body: `重新确认恢复「${confirm?.kind === 'restore' ? confirm.benchName : ''}」的分享接待吗？恢复后可再次加入新路线。`,
      action: '确认恢复',
    },
  };
  const currentConfirm = confirm ? confirmCopy[confirm.kind] : null;

  const renderRouteCard = (route: WalkRoute) => {
    const routeTotal = getTotalStayMinutes(route.stops);
    const routeSpan = getMaxSpan(route.stops, benches);
    const isActive = route.status === 'active';

    return (
      <div key={route.id} className="p-4 bg-warm-cream/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-serif font-medium text-deep-brown truncate">{route.name}</h4>
            <span
              className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                isActive ? 'bg-moss-green/10 text-moss-green' : 'bg-ochre/10 text-ochre'
              }`}
            >
              {ROUTE_STATUS_LABELS[route.status]}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && (
              <button
                onClick={() => setConfirm({ kind: 'archive', route })}
                className="flex items-center gap-1 px-2 py-1 text-xs text-ochre hover:bg-ochre/10 rounded-md transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                归档
              </button>
            )}
            <button
              onClick={() => setConfirm({ kind: 'deleteRoute', route })}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isActive ? '取消' : '删除'}
            </button>
          </div>
        </div>

        <ol className="space-y-1.5 mb-3">
          {route.stops.map((stop, index) => {
            const bench = benchById.get(stop.benchId);
            return (
              <li key={stop.benchId} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-moss-green text-white' : 'bg-ochre/70 text-white'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-deep-brown truncate flex-1">
                  {bench ? bench.name : '（档案已删除）'}
                </span>
                <span className="text-xs text-ink-light flex-shrink-0">{stop.stayMinutes} 分钟</span>
                {!isActive && bench && (
                  <button
                    onClick={() =>
                      setConfirm({ kind: 'removeStop', route, benchId: bench.id, benchName: bench.name })
                    }
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                    移出
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-4 text-xs text-ink-light">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            总停留 {routeTotal} 分钟
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5" />
            最大跨度 {routeSpan.km.toFixed(1)} 公里
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-semibold text-deep-brown mb-1">散步路线</h2>
        <p className="text-ink-light text-sm">
          勾选至少两处长椅，按访问次序打包一条散步路线
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 打包台 */}
        <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-1 self-start">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-moss-green" />
            <h3 className="font-serif text-lg font-semibold text-deep-brown">路线打包台</h3>
          </div>

          <div className="mb-4">
            <p className="text-xs text-ink-light mb-2">勾选长椅（勾选顺序即访问次序）</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {benches.map((bench) => {
                const checked = draftIds.has(bench.id);
                const serving = isBenchServing(bench);
                const occupying = activeRouteByBench.get(bench.id);
                const disabled = !serving || !!occupying;
                const order = draftStops.findIndex((s) => s.benchId === bench.id);

                return (
                  <button
                    key={bench.id}
                    disabled={disabled}
                    onClick={() => {
                      setPackedName(null);
                      toggleDraftStop(bench.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                      checked
                        ? 'border-moss-green bg-moss-green/10'
                        : disabled
                          ? 'border-deep-brown/5 bg-deep-brown/5 opacity-60 cursor-not-allowed'
                          : 'border-deep-brown/10 bg-white/50 hover:border-moss-green/50'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                        checked ? 'bg-moss-green border-moss-green' : 'border-deep-brown/30 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-deep-brown truncate">{bench.name}</span>
                      <span className="block text-xs text-ink-light truncate">{bench.location}</span>
                    </span>
                    {checked && order >= 0 && (
                      <span className="w-5 h-5 rounded-full bg-moss-green text-white text-xs flex items-center justify-center flex-shrink-0">
                        {order + 1}
                      </span>
                    )}
                    {!serving && (
                      <span className="flex items-center gap-1 text-xs text-red-500 flex-shrink-0">
                        <CirclePause className="w-3.5 h-3.5" />
                        停止接待
                      </span>
                    )}
                    {serving && occupying && (
                      <span className="text-xs text-ochre flex-shrink-0">已在未结束路线</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {draftStops.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-ink-light mb-2">访问次序与停留分钟</p>
              <ol className="space-y-1.5">
                {draftStops.map((stop, index) => {
                  const bench = benchById.get(stop.benchId);
                  if (!bench) return null;
                  return (
                    <li
                      key={stop.benchId}
                      className="flex items-center gap-2 px-2.5 py-2 bg-white/60 border border-deep-brown/10 rounded-lg"
                    >
                      <span className="w-5 h-5 rounded-full bg-ochre text-white text-xs flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-deep-brown truncate">
                        {bench.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={MAX_TOTAL_STAY_MINUTES}
                          value={stop.stayMinutes}
                          onChange={(e) =>
                            setDraftStayMinutes(stop.benchId, Number(e.target.value))
                          }
                          className="w-16 px-1.5 py-1 text-sm text-center border border-deep-brown/20 rounded-md bg-white"
                        />
                        <span className="text-xs text-ink-light">分钟</span>
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <button
                          onClick={() => moveDraftStop(stop.benchId, 'up')}
                          disabled={index === 0}
                          className="p-1 text-ink-light hover:text-deep-brown disabled:opacity-30 transition-colors"
                          aria-label="上移"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveDraftStop(stop.benchId, 'down')}
                          disabled={index === draftStops.length - 1}
                          className="p-1 text-ink-light hover:text-deep-brown disabled:opacity-30 transition-colors"
                          aria-label="下移"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleDraftStop(stop.benchId)}
                          className="p-1 text-ink-light hover:text-red-500 transition-colors"
                          aria-label="移除"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs">
            <span className="text-ink-light">
              已选 <span className="font-medium text-deep-brown">{draftStops.length}</span> 处
            </span>
            <span className={`flex items-center gap-1 ${stayOver ? 'text-red-500 font-medium' : 'text-ink-light'}`}>
              <Clock className="w-3.5 h-3.5" />
              总停留 {totalStay}/{MAX_TOTAL_STAY_MINUTES} 分钟
            </span>
            <span className={`flex items-center gap-1 ${spanOver ? 'text-red-500 font-medium' : 'text-ink-light'}`}>
              <Ruler className="w-3.5 h-3.5" />
              最大跨度 {maxSpan.km.toFixed(1)}/{MAX_ROUTE_SPAN_KM} 公里
            </span>
          </div>

          {rejections.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                整单已退回，现有路线与档案未改动
              </div>
              <ul className="space-y-1">
                {rejections.map((r, i) => (
                  <li key={i} className="text-xs text-red-600 leading-relaxed">
                    · {r.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {packedName && (
            <div className="mb-4 p-3 bg-moss-green/10 border border-moss-green/30 rounded-lg flex items-center gap-1.5 text-sm text-moss-green">
              <Check className="w-4 h-4" />
              「{packedName}」打包成功，已加入未结束路线
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="路线名称（可选）"
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-deep-brown/20 rounded-lg bg-white"
            />
            <button
              onClick={handlePack}
              disabled={!canPack}
              className="flex items-center gap-1.5 px-4 py-2 bg-moss-green text-white rounded-lg text-sm font-medium hover:bg-moss-light transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Package className="w-4 h-4" />
              打包路线
            </button>
            {draftStops.length > 0 && (
              <button
                onClick={() => {
                  clearDraft();
                  setRejections([]);
                  setPackedName(null);
                }}
                className="px-3 py-2 text-sm text-ink-light hover:text-deep-brown hover:bg-deep-brown/5 rounded-lg transition-colors flex-shrink-0"
              >
                清空
              </button>
            )}
          </div>
          {!canPack && (
            <p className="mt-2 text-xs text-ink-light">
              再勾选 {MIN_ROUTE_STOPS - draftStops.length} 处即可打包
            </p>
          )}
        </div>

        {/* 路线档案 */}
        <div className="space-y-6">
          <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-2">
            <div className="flex items-center gap-2 mb-4">
              <Footprints className="w-5 h-5 text-moss-green" />
              <h3 className="font-serif text-lg font-semibold text-deep-brown">路线档案</h3>
            </div>

            {routes.length > 0 ? (
              <div className="space-y-3">
                {activeRoutes.map(renderRouteCard)}
                {archivedRoutes.map(renderRouteCard)}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-moss-green/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-moss-green/50" />
                </div>
                <p className="text-sm text-ink-light">还没有路线档案</p>
                <p className="text-xs text-ink-light/60 mt-1">在左侧打包台勾选长椅开始</p>
              </div>
            )}
          </div>

          {pausedBenches.length > 0 && (
            <div className="paper-texture rounded-xl shadow-paper p-6 fade-in opacity-0 stagger-3">
              <div className="flex items-center gap-2 mb-4">
                <CirclePause className="w-5 h-5 text-red-500" />
                <h3 className="font-serif text-lg font-semibold text-deep-brown">停止接待</h3>
              </div>
              <div className="space-y-2">
                {pausedBenches.map((bench) => (
                  <div
                    key={bench.id}
                    className="flex items-center gap-2 px-3 py-2 bg-warm-cream/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-deep-brown truncate">{bench.name}</p>
                      <p className="text-xs text-ink-light truncate">{bench.location}</p>
                    </div>
                    <button
                      onClick={() =>
                        setConfirm({ kind: 'restore', benchId: bench.id, benchName: bench.name })
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-moss-green hover:bg-moss-green/10 rounded-md transition-colors flex-shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      恢复分享
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirm && currentConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="paper-texture rounded-xl shadow-paper-hover p-6 max-w-sm w-full fade-in">
            <h3 className="font-serif text-lg font-semibold text-deep-brown mb-2">
              {currentConfirm.title}
            </h3>
            <p className="text-ink-light text-sm mb-6">{currentConfirm.body}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-deep-brown bg-warm-beige hover:bg-warm-beige/80 rounded-lg transition-colors"
              >
                再想想
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  confirm.kind === 'restore' ? 'bg-moss-green hover:bg-moss-light' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {currentConfirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
