/**
 * REAL-TIME EVENT BUS (Cross-tab and In-Memory Synchronization)
 * 
 * Menghubungkan Creator, Admin, dan Buyer secara real-time saat itu juga
 * menggunakan Web BroadcastChannel dan Storage event signals.
 */

export type RealtimeEventType = 
  | 'PRODUCT_SUBMITTED'
  | 'PRODUCT_STATUS_UPDATED'
  | 'ORDER_SUBMITTED'
  | 'ORDER_VERIFIED'
  | 'FORCE_SYNC';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  payload: T;
  timestamp: number;
  sourceTabId: string;
}

class RealtimeSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: RealtimeEvent) => void> = new Set();
  private tabId: string = Math.random().toString(36).substring(2, 9);

  constructor() {
    if (typeof window !== 'undefined') {
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.channel = new BroadcastChannel('kclick_realtime_sync_channel');
          this.channel.onmessage = (msg: MessageEvent<RealtimeEvent>) => {
            if (msg.data && msg.data.type && msg.data.sourceTabId !== this.tabId) {
              this.notifyListeners(msg.data);
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel initialization error:', e);
        }
      }

      // Storage event listener as reliable cross-window conduit
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'kclick_sync_realtime_signal' && e.newValue) {
          try {
            const event = JSON.parse(e.newValue) as RealtimeEvent;
            if (event && event.type && event.sourceTabId !== this.tabId) {
              this.notifyListeners(event);
            }
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private notifyListeners(event: RealtimeEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }

  public broadcast<T = any>(type: RealtimeEventType, payload: T) {
    const event: RealtimeEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    };

    // 1. Notify current window listeners
    this.notifyListeners(event);

    // 2. Broadcast across tabs via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (e) {
        console.warn('BroadcastChannel postMessage warning:', e);
      }
    }

    // 3. Signal other tabs via localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kclick_sync_realtime_signal', JSON.stringify(event));
      } catch {
        // ignore
      }
    }
  }

  public subscribe(listener: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Play a subtle notification chime for immediate audio-visual real life feedback
  public playNotificationChime() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio playback might be restricted if no user interaction yet, safe to ignore
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
