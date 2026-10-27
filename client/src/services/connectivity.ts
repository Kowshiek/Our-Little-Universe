import { BACKEND_URL } from '../config';

/**
 * Strict Online-Only Connectivity Checker
 * Actively probes backend availability, not just navigator.onLine.
 */

export interface ConnectivityState {
  isOnline: boolean;
  isBackendReachable: boolean;
  latencyMs: number | null;
  lastCheckedAt: number;
  errorMessage?: string;
}

type ConnectivityListener = (state: ConnectivityState) => void;

class ConnectivityManager {
  private state: ConnectivityState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isBackendReachable: false,
    latencyMs: null,
    lastCheckedAt: 0,
  };

  private listeners: Set<ConnectivityListener> = new Set();
  private checkIntervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkBackendConnectivity());
      window.addEventListener('offline', () => {
        this.updateState({
          isOnline: false,
          isBackendReachable: false,
          errorMessage: "Network connection lost. You're offline.",
        });
      });
    }
  }

  public getState(): ConnectivityState {
    return { ...this.state };
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private updateState(partial: Partial<ConnectivityState>) {
    this.state = {
      ...this.state,
      ...partial,
      lastCheckedAt: Date.now(),
    };
    this.notifyListeners();
  }

  /**
   * Ping backend `/api/health` with a strict timeout
   */
  public async checkBackendConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({
        isOnline: false,
        isBackendReachable: false,
        latencyMs: null,
        errorMessage: "You're offline. Connect to the internet to enter Our Little Universe.",
      });
      return false;
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const latency = Math.round(performance.now() - startTime);
        this.updateState({
          isOnline: true,
          isBackendReachable: true,
          latencyMs: latency,
          errorMessage: undefined,
        });
        return true;
      } else {
        this.updateState({
          isOnline: true,
          isBackendReachable: false,
          latencyMs: null,
          errorMessage: 'Server is currently unreachable. Retrying...',
        });
        return false;
      }
    } catch (err: any) {
      this.updateState({
        isOnline: navigator.onLine,
        isBackendReachable: false,
        latencyMs: null,
        errorMessage: "You're offline. Connect to the internet to enter Our Little Universe.",
      });
      return false;
    }
  }

  /**
   * Start periodic health monitoring
   */
  public startMonitoring(intervalMs = 8000) {
    this.stopMonitoring();
    this.checkBackendConnectivity();
    this.checkIntervalTimer = setInterval(() => {
      this.checkBackendConnectivity();
    }, intervalMs);
  }

  public stopMonitoring() {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }
}

export const connectivity = new ConnectivityManager();
