import type { Page } from '@playwright/test';

// Objeto de página: solo acciones, sin aserciones.
export class LoginPage {
  constructor(private readonly page: Page) {}

  async abrir() {
    await this.page.goto('/auth');
  }

  async entrar(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Contraseña').fill(password);
    await this.page.getByRole('button', { name: 'Iniciar sesión' }).click();
  }
}
