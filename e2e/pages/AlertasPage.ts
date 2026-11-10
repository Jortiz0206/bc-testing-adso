import type { Page } from '@playwright/test';

export class AlertasPage {
  readonly detalle;

  constructor(private readonly page: Page) {
    this.detalle = page.getByRole('dialog', { name: 'Detalle de Alerta' });
  }

  async abrir() {
    await this.page.goto('/app/alertas');
  }

  tarjetaDe(estudiante: string) {
    return this.page.getByText(estudiante, { exact: true });
  }

  async abrirAlertaDe(estudiante: string) {
    await this.tarjetaDe(estudiante).click();
  }

  async resolver() {
    await this.detalle.getByRole('button', { name: 'Resolver' }).click();
  }
}
