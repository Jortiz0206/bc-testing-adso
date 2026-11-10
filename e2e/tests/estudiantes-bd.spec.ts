import { test, expect, unico } from './api';
import { EstudiantesPage } from '../pages/EstudiantesPage';

// Flujo crítico del rol BD — Johanna Ortiz (S6) y Jan Janos (S7): registrar un estudiante.
// Contra el backend con la BD de pruebas; cada test crea por el API lo que necesita.

test('un estudiante registrado por la UI queda en su grupo y aparece al buscarlo', async ({ page, datos }) => {
  // Arrange
  const grupo = await datos.grupo();
  const apellido = unico('Ruiz');
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();

  // Act
  await estudiantes.llenarRegistro({ documento: unico('DOC'), nombre: 'Ana', apellido, grupo: grupo.nombre });
  await estudiantes.botonRegistrar().click();

  // Assert
  await expect(page.getByText('Estudiante registrado')).toBeVisible();
  await estudiantes.buscar(apellido);
  await expect(estudiantes.filaDe(apellido)).toHaveCount(1);
  await expect(estudiantes.filaDe(apellido).getByText(grupo.nombre)).toBeVisible();
});

test('registrar un documento que ya existe muestra el motivo y no duplica al estudiante', async ({ page, datos }) => {
  const grupo = await datos.grupo();
  const existente = await datos.estudiante(grupo.id, { nombre: 'Beto' });
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();

  await estudiantes.llenarRegistro({ documento: existente.documento, nombre: 'Otro', apellido: existente.apellido, grupo: grupo.nombre });
  await estudiantes.botonRegistrar().click();

  await expect(page.getByText(/Ya existe un registro con esos datos/)).toBeVisible();
  await estudiantes.dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await estudiantes.buscar(existente.apellido);
  await expect(estudiantes.filaDe(existente.apellido)).toHaveCount(1);
});

test('doble clic en "Registrar" con el API lento crea un solo estudiante', async ({ page, datos }) => {
  // Parte 3 (defecto de tiempos): el POST se retrasa y la persona hace doble clic.
  const grupo = await datos.grupo();
  const apellido = unico('Doble');
  let posts = 0;
  await page.route('**/estudiantes', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    await new Promise((r) => setTimeout(r, 800)); // red lenta simulada en el route, no en el test
    await route.fallback();
  });
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();
  await estudiantes.llenarRegistro({ documento: unico('DOC'), nombre: 'Ana', apellido, grupo: grupo.nombre });

  await estudiantes.botonRegistrar().dblclick();

  await expect(page.getByText('Estudiante registrado')).toBeVisible();
  expect(posts).toBe(1);
  const enBd = await datos.listar<{ apellido: string }[]>(`/estudiantes?grupo_id=${grupo.id}`);
  expect(enBd.filter((e) => e.apellido === apellido)).toHaveLength(1);
});
