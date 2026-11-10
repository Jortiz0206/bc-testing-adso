import { test, expect } from './api';
import { CalificacionesPage } from '../pages/CalificacionesPage';
import { AlertasPage } from '../pages/AlertasPage';

// Flujo crítico del rol Front (Johanna Ortiz, S7): calificar una actividad y hacer seguimiento
// a la alerta que genera una nota baja. Es lo que el docente hace todos los días y
// es lo que se muestra en la sustentación: de la nota a la alerta temprana.

test('la nota digitada en porcentaje queda guardada en escala 0-5', async ({ page, datos }) => {
  // Arrange (por el API)
  const grupo = await datos.grupo();
  const materia = await datos.materia();
  const actividad = await datos.actividad(grupo.id, materia.id);
  const est = await datos.estudiante(grupo.id);
  const calificaciones = new CalificacionesPage(page);
  await calificaciones.abrir();
  await calificaciones.elegir(grupo.nombre, actividad.titulo);

  // Act (por la UI, solo lo que se prueba)
  await calificaciones.calificar(`${est.nombre} ${est.apellido}`, 61);
  await calificaciones.guardar();

  // Assert
  await expect(page.getByText('Calificaciones guardadas correctamente')).toBeVisible();
  const guardadas = await datos.listar<{ estudiante_id: number; nota: number }[]>(`/calificaciones?actividad_id=${actividad.id}`);
  expect(guardadas).toEqual([expect.objectContaining({ estudiante_id: est.id, nota: 3.1 })]);
});

test('una nota baja genera una alerta temprana que el docente puede resolver', async ({ page, datos }) => {
  const grupo = await datos.grupo();
  const materia = await datos.materia();
  const actividad = await datos.actividad(grupo.id, materia.id);
  const est = await datos.estudiante(grupo.id);
  const nombre = `${est.nombre} ${est.apellido}`;
  const calificaciones = new CalificacionesPage(page);
  await calificaciones.abrir();
  await calificaciones.elegir(grupo.nombre, actividad.titulo);
  await calificaciones.calificar(nombre, 40);
  await calificaciones.guardar();
  await expect(page.getByText('Calificaciones guardadas correctamente')).toBeVisible();

  const alertas = new AlertasPage(page);
  await alertas.abrir();
  await alertas.abrirAlertaDe(nombre);
  await expect(alertas.detalle.getByText('Calificación baja')).toBeVisible();
  await alertas.resolver();

  await expect(page.getByText('Alerta actualizada')).toBeVisible();
  await alertas.abrirAlertaDe(nombre);
  await expect(alertas.detalle.getByText('Resuelta')).toBeVisible();
});

test('si la alerta ya no existe al resolverla, se muestra el motivo', async ({ page, datos }) => {
  const est = await datos.estudiante(null);
  const alerta = await datos.alerta(est.id);
  const alertas = new AlertasPage(page);
  await alertas.abrir();
  await alertas.abrirAlertaDe(`${est.nombre} ${est.apellido}`);

  await datos.eliminar(`/alertas/${alerta.id}`); // otra persona la borra mientras se mira
  await alertas.resolver();

  await expect(page.getByText('Alerta no encontrada')).toBeVisible();
});
