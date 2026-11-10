import { test, expect, unico } from './api';
import { EstudiantesPage } from '../pages/EstudiantesPage';

// Rol BD (Alejandra Guio, S8): el flujo que faltaba en la suite — registrar una
// observación en el detalle de un estudiante (seguimiento convivencial y académico).

test('una observación registrada aparece en el detalle del estudiante con su tipo', async ({ page, datos }) => {
  // Arrange
  const est = await datos.estudiante(null);
  const texto = unico('Participa activamente en clase');
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();
  await estudiantes.buscar(est.apellido);
  await page.getByRole('button', { name: `Ver a ${est.nombre} ${est.apellido}` }).click();
  const detalle = page.getByRole('dialog', { name: `${est.nombre} ${est.apellido}` });

  // Act
  await detalle.getByRole('button', { name: 'Nueva' }).click();
  await detalle.getByRole('combobox', { name: 'Tipo de observación' }).click();
  await page.getByRole('option', { name: /Académica/ }).click();
  await detalle.getByRole('textbox', { name: 'Observación' }).fill(texto);
  await detalle.getByRole('button', { name: 'Guardar' }).click();

  // Assert
  await expect(page.getByText('Observación registrada')).toBeVisible();
  await expect(detalle.getByText(texto)).toBeVisible();
  await expect(detalle.getByText('Académica', { exact: true })).toBeVisible();
});

test('no se guarda una observación vacía', async ({ page, datos }) => {
  const est = await datos.estudiante(null);
  const estudiantes = new EstudiantesPage(page);
  await estudiantes.abrir();
  await estudiantes.buscar(est.apellido);
  await page.getByRole('button', { name: `Ver a ${est.nombre} ${est.apellido}` }).click();
  const detalle = page.getByRole('dialog', { name: `${est.nombre} ${est.apellido}` });

  await detalle.getByRole('button', { name: 'Nueva' }).click();
  await detalle.getByRole('textbox', { name: 'Observación' }).fill('   ');
  await detalle.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Escribe una observación')).toBeVisible();
  await expect(detalle.getByText('Sin observaciones registradas')).toBeVisible();
});
