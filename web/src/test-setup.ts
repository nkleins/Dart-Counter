// In-Memory-localStorage für die Test-Umgebung.
// jsdom mit opaque origin (about:blank) stellt kein globales `localStorage` bereit;
// der App-Code (Persistenz der Erstellungs-Auswahl, Keypad-Checkout) nutzt aber das
// globale `localStorage`. Dieses Setup liefert ein einfaches, konformes Ersatz-Storage.
class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length(): number { return this.m.size; }
  clear(): void { this.m.clear(); }
  getItem(key: string): string | null { return this.m.has(key) ? this.m.get(key)! : null; }
  setItem(key: string, value: string): void { this.m.set(key, String(value)); }
  removeItem(key: string): void { this.m.delete(key); }
  key(index: number): string | null { return [...this.m.keys()][index] ?? null; }
}

if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), writable: true, configurable: true });
}
