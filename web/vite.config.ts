import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // setupFiles stellt ein In-Memory-localStorage bereit (jsdom liefert hier keins) — nötig für die Persistenz der Erstellungs-Auswahl.
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], globals: true, include: ['src/**/*.test.{ts,tsx}'] },
});
