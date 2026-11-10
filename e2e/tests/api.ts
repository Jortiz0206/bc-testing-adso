import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Datos preparados POR EL API (no por la UI) contra la BD de pruebas, con valores únicos.
// El token sale de la misma sesión que guardó auth.setup.ts: no se vuelve a iniciar sesión.
export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000';
const SESION = 'playwright/.auth/docente.json';

export const unico = (prefijo: string) => `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

function tokenGuardado(): string {
  const estado = JSON.parse(readFileSync(SESION, 'utf-8')) as { origins: { localStorage: { name: string; value: string }[] }[] };
  const item = estado.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'classkids_token');
  if (!item) throw new Error(`No hay token en ${SESION}: corre el proyecto "setup".`);
  return item.value;
}

class DatosDePrueba {
  constructor(private readonly request: APIRequestContext, private readonly token: string) {}

  private async crear<T>(ruta: string, data: Record<string, unknown>): Promise<T> {
    const respuesta = await this.request.post(`${API}${ruta}`, { headers: { Authorization: `Bearer ${this.token}` }, data });
    expect(respuesta.status(), `POST ${ruta}`).toBe(201);
    return respuesta.json();
  }

  async listar<T>(ruta: string): Promise<T> {
    const respuesta = await this.request.get(`${API}${ruta}`, { headers: { Authorization: `Bearer ${this.token}` } });
    expect(respuesta.ok()).toBeTruthy();
    return respuesta.json();
  }

  async eliminar(ruta: string) {
    await this.request.delete(`${API}${ruta}`, { headers: { Authorization: `Bearer ${this.token}` } });
  }

  grupo() {
    return this.crear<{ id: number; nombre: string }>('/grupos', { nombre: unico('Grupo E2E'), grado: '1°', turno: 'Matutino' });
  }

  materia() {
    return this.crear<{ id: number; nombre: string }>('/materias', { nombre: unico('Materia E2E') });
  }

  actividad(grupoId: number, materiaId: number) {
    return this.crear<{ id: number; titulo: string }>('/actividades', {
      grupo_id: grupoId, materia_id: materiaId, titulo: unico('Taller E2E'), tipo: 'tarea', fecha_entrega: '2099-12-31',
    });
  }

  estudiante(grupoId: number | null, datos: Record<string, unknown> = {}) {
    return this.crear<{ id: number; nombre: string; apellido: string; documento: string }>('/estudiantes', {
      documento: unico('DOC'), nombre: 'Ana', apellido: unico('Ruiz'), grupo_id: grupoId, ...datos,
    });
  }

  alerta(estudianteId: number) {
    return this.crear<{ id: number }>('/alertas', { estudiante_id: estudianteId, tipo: 'Seguimiento', mensaje: unico('Revisar') });
  }

  calificacion(estudianteId: number, materiaId: number, nota: number) {
    return this.crear<{ id: number }>('/calificaciones', { estudiante_id: estudianteId, materia_id: materiaId, nota });
  }
}

export const test = base.extend<{ datos: DatosDePrueba }>({
  datos: async ({ request }, use) => {
    await use(new DatosDePrueba(request, tokenGuardado()));
  },
});

export { expect };
