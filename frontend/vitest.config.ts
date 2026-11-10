import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // `pnpm test` ejecuta `vitest run --coverage`: cada corrida mide la cobertura
    // y falla si baja del umbral.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Arranque de la app: solo monta <App />, no tiene lógica de negocio.
        "src/main.tsx",
        // Componentes de shadcn/ui generados por su CLI (código de terceros
        // copiado al repo); no los escribimos nosotros ni tienen reglas del proyecto.
        "src/components/ui/**",
        // Solo declaraciones de tipos: no generan código ejecutable.
        "src/vite-env.d.ts",
        "src/types/**",
        // Infraestructura de pruebas.
        "src/test/**",
      ],
      // Umbral = mayor entre el piso de la semana y la cobertura real del cierre
      // anterior, redondeada hacia abajo (ver docs/matriz-rotacion.md). Nunca baja.
      thresholds: { lines: 71, branches: 71, functions: 71, statements: 71 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
