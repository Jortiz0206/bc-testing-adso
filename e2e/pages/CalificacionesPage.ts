import type { Page } from '@playwright/test';

export class CalificacionesPage {
  constructor(private readonly page: Page) {}

  async abrir() {
    await this.page.goto('/app/calificaciones');
  }

  async elegir(grupo: string, actividad: string) {
    await this.page.getByRole('combobox', { name: 'Grupo' }).click();
    await this.page.getByRole('option', { name: grupo }).click();
    await this.page.getByRole('combobox', { name: 'Actividad' }).click();
    await this.page.getByRole('option', { name: new RegExp(actividad) }).click();
  }

  campoDe(estudiante: string) {
    return this.page.getByRole('spinbutton', { name: `Calificación de ${estudiante}` });
  }

  async calificar(estudiante: string, porcentaje: number) {
    await this.campoDe(estudiante).fill(String(porcentaje));
  }

  async guardar() {
    await this.page.getByRole('button', { name: 'Guardar cambios' }).click();
  }
}
