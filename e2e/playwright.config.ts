import { defineConfig, devices } from '@playwright/test';

// Puerto del frontend (Vite usa 8080 en ClassKids, ver frontend/vite.config.ts).
// Cámbialo con FRONT_PORT si el 8080 ya está ocupado.
const port = Number(process.env.FRONT_PORT ?? 8080);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  /* Falla en CI si alguien deja un test.only */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /* Lista en la terminal + reporte HTML que abres con "pnpm report" */
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    /* Guarda la traza solo cuando un test falla y se reintenta */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Playwright levanta el frontend. El backend y la BD los levantas tú antes
  // (ver la sección "Pruebas" del README).
  // Se usa 127.0.0.1 (no "::" ni localhost) para que funcione igual en equipos sin IPv6;
  // el backend ya lo acepta en CORS_ORIGINS.
  // Se lanza vite con node, sin pnpm de por medio, para que Playwright pueda
  // detenerlo al terminar.
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    cwd: '../frontend',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
