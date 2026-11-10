# Incidencias abiertas

Defectos encontrados por las pruebas que no se corrigieron en el trimestre. Cada uno tiene un test marcado
como **fallo esperado**: el CI sigue en verde mientras el defecto exista y se pone en rojo cuando alguien lo
corrige sin quitar la marca (así nadie olvida cerrarla).

| # | Defecto | Dónde | Test (fallo esperado) | Por qué sigue abierta |
|---|---|---|---|---|
| INC-1 | Un estudiante **sin notas** aparece "en riesgo" en Estudiantes (su promedio se toma como 0), mientras que en "Estudiantes destacados" del Dashboard aparece como bien | `src/lib/estudiantes.ts` (`enriquecerEstudiantes`), `src/components/dashboard/RecentStudents.tsx` | `estudiantes.test.ts › INC-1: un estudiante sin notas ni alertas no queda 'en riesgo'…` (`it.fails`) | Es una regla de negocio: hay que acordar con la coordinación del colegio cómo se muestra un estudiante recién matriculado (¿"sin notas"?) antes de cambiarla |

> Para abrirla también como *issue* de GitHub: copia la fila y enlaza el test.
