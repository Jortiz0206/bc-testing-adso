import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { docente } from './datos';

// Helpers para preparar datos POR EL API (no por la UI) contra la BD de pruebas.
export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';

export const unico = (prefijo: string) => `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export async function sesionDocente(request: APIRequestContext) {
  const respuesta = await request.post(`${API}/auth/login`, { data: { email: docente.email, password: docente.password } });
  expect(respuesta.ok()).toBeTruthy();
  return (await respuesta.json()) as { access_token: string; user: Record<string, unknown> };
}

/** Siembra la sesión en el navegador, como si la persona ya hubiera iniciado sesión. */
export async function entrarComo(page: Page, sesion: { access_token: string; user: Record<string, unknown> }) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('classkids_token', token);
    localStorage.setItem('classkids_user', JSON.stringify(user));
  }, { token: sesion.access_token, user: sesion.user });
}

export async function crearGrupo(request: APIRequestContext, token: string) {
  const respuesta = await request.post(`${API}/grupos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nombre: unico('Grupo E2E'), grado: '1°', turno: 'Matutino' },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()) as { id: number; nombre: string };
}

export async function crearEstudiante(request: APIRequestContext, token: string, datos: Record<string, unknown>) {
  const respuesta = await request.post(`${API}/estudiantes`, { headers: { Authorization: `Bearer ${token}` }, data: datos });
  expect(respuesta.status()).toBe(201);
  return respuesta.json();
}
