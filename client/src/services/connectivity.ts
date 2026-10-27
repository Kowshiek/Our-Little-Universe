import { getBackendUrl } from '../config';

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
        errorMessage: "You're offline. Connect to the internet to enter Love Battle.",
      });
      return false;
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Validate that response is genuinely JSON from Our Little Universe backend,
        // and NOT a static HTML rewrite from Vercel!
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          this.updateState({
            isOnline: true,
            isBackendReachable: false,
            latencyMs: null,
            errorMessage: 'Backend server not connected. Please connect your backend server URL.',
          });
          return false;
        }

        const data = await response.json().catch(() => ({}));
        if (data.status === 'online' || data.game === 'LOVE BATTLE' || data.game === 'Our Little Universe') {
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
            errorMessage: 'Unrecognized server response. Please verify backend URL.',
          });
          return false;
        }
      } else {
        this.updateState({
          isOnline: true,
          isBackendReachable: false,
          latencyMs: null,
          errorMessage: 'Server is currently waking up or unreachable.',
        });
        return false;
      }
    } catch (err: any) {
      this.updateState({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isBackendReachable: false,
        latencyMs: null,
        errorMessage: typeof navigator !== 'undefined' && !navigator.onLine
          ? "No internet connection detected on your device."
          : "Backend server is waking up or not yet connected.",
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
