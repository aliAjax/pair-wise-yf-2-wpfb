import type { Bench, WalkingRoute } from '@/types';

const STORAGE_KEY = 'bench-archive-data';
const ROUTE_STORAGE_KEY = 'bench-route-data';

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

export function loadRoutes(): WalkingRoute[] {
  try {
    const data = localStorage.getItem(ROUTE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load routes from localStorage:', error);
  }
  return [];
}

export function saveRoutes(routes: WalkingRoute[]): void {
  try {
    localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(routes));
  } catch (error) {
    console.error('Failed to save routes to localStorage:', error);
  }
}
