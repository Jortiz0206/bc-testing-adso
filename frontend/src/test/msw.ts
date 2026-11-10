// Servidor MSW para los tests que usan el cliente HTTP real (api/client.ts).
// Fake: responde como el backend, pero en memoria y sin red.
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

export const API = "http://127.0.0.1:8000";

export const server = setupServer();

/** Activa MSW en el archivo de test que lo importe. Cualquier petición sin handler falla el test. */
export function usarMsw() {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
