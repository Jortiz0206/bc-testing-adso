import type { Page } from '@playwright/test';

export class EstudiantesPage {
  readonly dialogo;

  constructor(private readonly page: Page) {
    this.dialogo = page.getByRole('dialog', { name: 'Registrar nuevo estudiante' });
  }

  async abrir() {
    await this.page.goto('/app/estudiantes');
  }

  async llenarRegistro(datos: { documento?: string; nombre?: string; apellido?: string; grupo?: string }) {
    await this.page.getByRole('button', { name: 'Nuevo Estudiante' }).click();
    if (datos.documento) await this.dialogo.getByLabel('Documento').fill(datos.documento);
    if (datos.nombre) await this.dialogo.getByLabel('Nombre').fill(datos.nombre);
    if (datos.apellido) await this.dialogo.getByLabel('Apellido').fill(datos.apellido);
    if (datos.grupo) {
      await this.dialogo.getByRole('combobox', { name: 'Grupo' }).click();
      await this.page.getByRole('option', { name: datos.grupo }).click();
    }
  }

  botonRegistrar() {
    return this.dialogo.getByRole('button', { name: 'Registrar' });
  }

  async buscar(texto: string) {
    await this.page.getByRole('textbox', { name: 'Buscar estudiante' }).fill(texto);
  }

  filaDe(texto: string) {
    return this.page.getByRole('row', { name: new RegExp(texto) });
  }
}
