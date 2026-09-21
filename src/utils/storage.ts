import type { Bench, RouteStop, WalkRoute } from '@/types';

const STORAGE_KEY = 'bench-archive-data';
const ROUTES_STORAGE_KEY = 'bench-archive-routes';
const ROUTE_DRAFT_STORAGE_KEY = 'bench-archive-route-draft';

export function loadBenches(): Bench[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load benches from localStorage:', error);
  }
  return [];
}

export function saveBenches(benches: Bench[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(benches));
  } catch (error) {
    console.error('Failed to save benches to localStorage:', error);
  }
}

export function clearBenches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear benches from localStorage:', error);
  }
}

export function loadRoutes(): WalkRoute[] {
  try {
    const data = localStorage.getItem(ROUTES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load routes from localStorage:', error);
  }
  return [];
}

export function saveRoutes(routes: WalkRoute[]): void {
  try {
    localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
  } catch (error) {
    console.error('Failed to save routes to localStorage:', error);
  }
}

export function loadRouteDraft(): RouteStop[] {
  try {
    const data = localStorage.getItem(ROUTE_DRAFT_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load route draft from localStorage:', error);
  }
  return [];
}

export function saveRouteDraft(stops: RouteStop[]): void {
  try {
    localStorage.setItem(ROUTE_DRAFT_STORAGE_KEY, JSON.stringify(stops));
  } catch (error) {
    console.error('Failed to save route draft to localStorage:', error);
  }
}
