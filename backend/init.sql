-- ========================================================
-- DATOS DE PRUEBA MASIVOS Y REALISTAS
-- ========================================================

CREATE TABLE IF NOT EXISTS user_roles (
	id SERIAL PRIMARY KEY,
	nombre VARCHAR(50) NOT NULL UNIQUE,
	descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL UNIQUE,
	nombre VARCHAR(120) NOT NULL,
	apellido VARCHAR(120),
	password_hash VARCHAR(255) NOT NULL,
	rol_id INTEGER REFERENCES user_roles(id),
	activo BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	last_sign_in_at TIMESTAMP
);

-- Migración para instalaciones creadas antes de separar nombre/apellido (mismo
-- patrón que `estudiantes`, que ya tenía ambas columnas por separado).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellido VARCHAR(120);

CREATE TABLE IF NOT EXISTS invitaciones (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL,
	rol_id INTEGER NOT NULL REFERENCES user_roles(id),
	token VARCHAR(120) NOT NULL UNIQUE,
	expires_at TIMESTAMP NOT NULL,
	accepted_at TIMESTAMP,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL,
	token VARCHAR(120) NOT NULL UNIQUE,
	expires_at TIMESTAMP NOT NULL,
	used_at TIMESTAMP,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grupos (
	id SERIAL PRIMARY KEY,
	nombre VARCHAR(120) NOT NULL,
	grado VARCHAR(30),
	turno VARCHAR(30),
	ano_lectivo INTEGER DEFAULT 2026
);

CREATE TABLE IF NOT EXISTS estudiantes (
	id SERIAL PRIMARY KEY,
	documento VARCHAR(50) NOT NULL UNIQUE,
	nombre VARCHAR(120) NOT NULL,
	apellido VARCHAR(120) NOT NULL,
	grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
	activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS materias (
	id SERIAL PRIMARY KEY,
	nombre VARCHAR(120) NOT NULL,
	codigo VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS actividades (
	id SERIAL PRIMARY KEY,
	materia_id INTEGER NOT NULL REFERENCES materias(id),
	grupo_id INTEGER NOT NULL REFERENCES grupos(id),
	titulo VARCHAR(200) NOT NULL,
	tipo VARCHAR(30) NOT NULL DEFAULT 'tarea',
	descripcion TEXT,
	fecha_entrega DATE
);

CREATE TABLE IF NOT EXISTS calificaciones (
	id SERIAL PRIMARY KEY,
	estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
	materia_id INTEGER NOT NULL REFERENCES materias(id),
	actividad_id INTEGER REFERENCES actividades(id) ON DELETE SET NULL,
	nota NUMERIC(3, 1) NOT NULL CHECK (nota >= 0 AND nota <= 5),
	periodo INTEGER NOT NULL DEFAULT 1,
	observacion TEXT,
	fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE actividades ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'tarea';

ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS actividad_id INTEGER REFERENCES actividades(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS observaciones (
	id SERIAL PRIMARY KEY,
	estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
	tipo VARCHAR(50) DEFAULT 'Convivencial',
	descripcion TEXT NOT NULL,
	fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alertas (
	id SERIAL PRIMARY KEY,
	estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
	tipo VARCHAR(80) NOT NULL,
	mensaje TEXT NOT NULL,
	estado VARCHAR(30) NOT NULL DEFAULT 'active',
	fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asignaciones (
	id SERIAL PRIMARY KEY,
	docente_id INTEGER NOT NULL REFERENCES usuarios(id),
	materia_id INTEGER NOT NULL REFERENCES materias(id),
	grupo_id INTEGER NOT NULL REFERENCES grupos(id),
	UNIQUE (docente_id, materia_id, grupo_id)
);

-- 1. Roles
INSERT INTO user_roles (nombre, descripcion) VALUES
('Administrador', 'Control total del sistema'),
('Docente', 'Registro de notas y asistencia'),
('Acudiente', 'Consulta de reportes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (email, nombre, password_hash, rol_id) VALUES
('admin@classkids.local', 'Administrador ClassKids', '$pbkdf2-sha256$29000$pRTCWIuxthbinFPqnXPOeQ$TwhKc2OrJ25QxCU9TLSlHTTOOrLqZBBtd0r5fa.ucoE', (SELECT id FROM user_roles WHERE nombre = 'Administrador')),
('docente@classkids.local', 'Docente ClassKids', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente'))
ON CONFLICT (email) DO NOTHING;

-- Migración para instalaciones creadas con el esquema anterior.
ALTER TABLE asignaciones DROP CONSTRAINT IF EXISTS asignaciones_docente_id_fkey;
UPDATE asignaciones a
SET docente_id = u.id
FROM usuarios u
JOIN user_roles r ON r.id = u.rol_id
WHERE lower(r.nombre) = 'docente' AND a.docente_id = r.id;
ALTER TABLE asignaciones ADD CONSTRAINT asignaciones_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES usuarios(id);
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_docente_materia_grupo_uidx
ON asignaciones (docente_id, materia_id, grupo_id);
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_materia_grupo_uidx
ON asignaciones (materia_id, grupo_id);

-- 2. Grupos
INSERT INTO grupos (nombre, grado, turno) VALUES
('Grado 1A', '1°', 'Matutino'),
('Grado 2A', '2°', 'Matutino'),
('Grado 3A', '3°', 'Vespertino');

-- 3. Materias
INSERT INTO materias (nombre, codigo) VALUES
('Matemáticas', 'MAT-01'),
('Español y Literatura', 'ESP-01'),
('Ciencias Naturales', 'CNT-01'),
('Sociales', 'SOC-01'),
('Inglés', 'ING-01');

-- 4. 20 Estudiantes
INSERT INTO estudiantes (documento, nombre, apellido, grupo_id) VALUES
('100101', 'Sofía', 'Gómez', 1), ('100102', 'Mateo', 'Rodríguez', 1),
('100103', 'Valentina', 'Martínez', 1), ('100104', 'Lucas', 'Hernández', 1),
('100105', 'Isabella', 'Díaz', 1), ('100106', 'Santiago', 'Pérez', 1),
('100107', 'Camila', 'Torres', 1), ('100108', 'Alejandro', 'Ramírez', 2),
('100109', 'Mariana', 'Flores', 2), ('100110', 'Diego', 'Acosta', 2),
('100111', 'Gabriela', 'Castro', 2), ('100112', 'Nicolas', 'Vargas', 2),
('100113', 'Daniela', 'Ríos', 2), ('100114', 'Samuel', 'Suárez', 2),
('100115', 'Lucía', 'Mendoza', 3), ('100116', 'Joaquín', 'Silva', 3),
('100117', 'Victoria', 'Rojas', 3), ('100118', 'Martín', 'Navarro', 3),
('100119', 'Elena', 'Morales', 3), ('100120', 'Tomás', 'Gutiérrez', 3);

-- 5. Actividades Académicas (15 registros)
INSERT INTO actividades (materia_id, grupo_id, titulo, descripcion, fecha_entrega) VALUES
(1, 1, 'Taller de Sumas y Restas', 'Resolver la guía interactiva del capítulo 2', '2026-09-05'),
(1, 1, 'Evaluación de Geometría', 'Prueba sobre figuras planas y perímetros', '2026-09-12'),
(2, 1, 'Lectura Comprensiva', 'Resumen sobre el cuento El Principito', '2026-09-08'),
(2, 1, 'Dictado y Ortografía', 'Uso correcto de la B y la V', '2026-09-15'),
(3, 1, 'Experimento de Germinación', 'Registro en diario del crecimiento de la semilla', '2026-09-20'),
(1, 2, 'Tablas de Multiplicar', 'Taller práctico de multiplicación por 2, 3 y 4', '2026-09-06'),
(3, 2, 'El Ciclo del Agua', 'Elaboración de maqueta explicativa', '2026-09-14'),
(4, 2, 'Mapa de la Región', 'Ubicación de departamentos en el croquis', '2026-09-18'),
(5, 2, 'Vocabulario: La Familia', 'Presentación oral corta en inglés', '2026-09-22'),
(1, 3, 'Fraccionarios Básicos', 'Representación gráfica de fracciones', '2026-09-10'),
(2, 3, 'Estructura del Párrafo', 'Redacción de texto expositivo corto', '2026-09-13'),
(4, 3, 'Democracia Escolar', 'Análisis sobre las funciones del personero', '2026-09-17'),
(5, 3, 'Verbo To Be', 'Taller escrito de gramática', '2026-09-21'),
(3, 3, 'Sistemas del Cuerpo Humano', 'Quiz sobre el sistema digestivo', '2026-09-25'),
(2, 2, 'Mesa Redonda: Comprensión', 'Debate en clase sobre la fábula asignada', '2026-09-28');

UPDATE actividades SET tipo = CASE
	WHEN lower(titulo) LIKE '%evaluación%' OR lower(titulo) LIKE '%quiz%' THEN 'examen'
	WHEN lower(titulo) LIKE '%maqueta%' OR lower(titulo) LIKE '%experimento%' THEN 'proyecto'
	WHEN lower(titulo) LIKE '%mesa redonda%' OR lower(titulo) LIKE '%presentación%' THEN 'participación'
	ELSE 'tarea'
END;

-- 6. Calificaciones (35 registros variados para gráficos)
INSERT INTO calificaciones (estudiante_id, materia_id, nota, periodo, observacion) VALUES
(1, 1, 4.8, 1, 'Excelente manejo conceptual'),
(1, 2, 4.5, 1, 'Muy buena redacción'),
(1, 3, 5.0, 1, 'Desempeño sobresaliente'),
(2, 1, 2.8, 1, 'Requiere apoyo en operaciones de resta'),
(2, 2, 3.5, 1, 'Cumple con el nivel básico'),
(2, 3, 2.5, 1, 'No presentó la guía de trabajo'),
(3, 1, 4.0, 1, 'Buen trabajo'),
(3, 2, 4.2, 1, 'Participación activa'),
(4, 1, 3.0, 1, 'Aprobado justo'),
(4, 4, 2.2, 1, 'Bajo rendimiento en evaluaciones escritas'),
(5, 5, 4.9, 1, 'Pronunciación destacada'),
(5, 1, 4.3, 1, 'Buen desempeño'),
(6, 2, 3.8, 1, 'Constante en sus entregas'),
(7, 3, 4.6, 1, 'Gran interés por la ciencia'),
(8, 1, 2.0, 1, 'Presenta serias dificultades en multiplicación'),
(8, 2, 3.0, 1, 'Nivel aceptable'),
(9, 3, 4.5, 1, 'Trabajo en equipo destacado'),
(10, 4, 3.2, 1, 'Debe mejorar la atención en clase'),
(11, 5, 4.7, 1, 'Excelente nivel de conversación'),
(12, 1, 2.9, 1, 'Cerca de alcanzar el nivel básico'),
(13, 2, 4.0, 1, 'Ortografía impecable'),
(14, 3, 3.5, 1, 'Desempeño regular'),
(15, 1, 4.8, 1, 'Dominio completo de fraccionarios'),
(15, 2, 4.4, 1, 'Buena argumentación'),
(16, 4, 2.4, 1, 'Incompletos los trabajos del periodo'),
(17, 5, 4.1, 1, 'Buenas habilidades auditivas'),
(18, 3, 3.9, 1, 'Compromiso académico adecuado'),
(19, 1, 4.5, 1, 'Solución rápida de ejercicios'),
(20, 2, 2.7, 1, 'Necesita reforzar la comprensión de lectura'),
(1, 1, 4.9, 2, 'Mantiene el alto nivel en el 2° periodo'),
(2, 1, 3.5, 2, 'Demuestra importante mejoría respecto al periodo 1'),
(4, 4, 3.6, 2, 'Superó las fallas del periodo anterior'),
(8, 1, 3.2, 2, 'Logró aprobar tras las tutorías'),
(16, 4, 3.0, 2, 'Nivel básico alcanzado'),
(20, 2, 3.8, 2, 'Gran avance en el plan de mejoramiento');

-- 7. Observaciones (10 registros para ObservacionesEstudiante.tsx)
INSERT INTO observaciones (estudiante_id, tipo, descripcion) VALUES
(2, 'Académica', 'Se envió nota al acudiente solicitando refuerzo en tablas de multiplicar.'),
(2, 'Convivencial', 'Falta de atención constante durante la segunda hora de clase.'),
(1, 'Reconocimiento', 'Elegida como representante del grupo por su liderazgo y compañerismo.'),
(4, 'Académica', 'Se cita a reunión para fijar compromiso académico en Sociales.'),
(8, 'Convivencial', 'Interrumpe frecuentemente las explicaciones del docente.'),
(15, 'Reconocimiento', 'Felicitación por obtener la puntuación más alta en el concurso de matemáticas.'),
(16, 'Académica', 'Falta de entrega de 3 talleres consecutivos en la asignatura de Sociales.'),
(20, 'Académica', 'Se le asigna cartilla de lectura para reforzar durante el fin de semana.'),
(5, 'Convivencial', 'Muestra excelente empatía y apoyo a sus compañeros de grupo.'),
(12, 'Convivencial', 'Llegó tarde al inicio de la jornada en tres ocasiones esta semana.');

-- 8. Alertas (8 registros para AlertsPanel.tsx)
INSERT INTO alertas (estudiante_id, tipo, mensaje, estado) VALUES
(2, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Matemáticas (Periodo 1)', 'active'),
(2, 'Seguimiento', 'Requiere seguimiento en plan de refuerzo académico', 'active'),
(4, 'Bajo Rendimiento', 'Nota defensiva de 2.2 en Sociales', 'active'),
(8, 'Bajo Rendimiento', 'Nota reprobatoria (2.0) en Matemáticas', 'active'),
(8, 'Inasistencia', 'Registro de 3 faltas sin justificar en el mes', 'active'),
(16, 'Bajo Rendimiento', 'Incumplimiento de tareas asignadas en Sociales', 'active'),
(20, 'Bajo Rendimiento', 'Dificultades en comprensión lectora (Nota: 2.7)', 'active'),
(12, 'Inasistencia', 'Alertas por impuntualidad reiterada al inicio de la jornada', 'active');

-- 9. Asignaciones académicas del colegio demo
INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN user_roles r ON r.id = u.rol_id AND lower(r.nombre) = 'docente'
JOIN materias m ON m.id IN (1, 2, 3, 4, 5)
JOIN grupos g ON g.id IN (1, 2, 3)
WHERE u.email = 'docente@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;

-- Relacionar las calificaciones demo con la primera actividad de cada materia y grupo.
UPDATE calificaciones c
SET actividad_id = source.actividad_id
FROM (
	SELECT c2.id, (
		SELECT a.id FROM actividades a
		JOIN estudiantes e2 ON e2.id = c2.estudiante_id
		WHERE a.materia_id = c2.materia_id AND a.grupo_id = e2.grupo_id
		ORDER BY a.id ASC LIMIT 1
	) AS actividad_id
	FROM calificaciones c2
) source
WHERE c.id = source.id AND source.actividad_id IS NOT NULL;

-- ========================================================
-- AMPLIACIÓN DE DATOS DEMO (solo INSERTs adicionales, no se
-- modifica ni se borra ningún registro sembrado arriba).
-- Cubre de grado 1° a 5°, más docentes y más estudiantes.
-- ========================================================

-- 10. Cada grado (1° a 5°) tiene dos grupos: sección A y sección B.
-- Los de sección A (1A a 3A) ya existían arriba; aquí se completan 4A, 5A y
-- las secciones B de los cinco grados.
INSERT INTO grupos (nombre, grado, turno) VALUES
('Grado 4A', '4°', 'Matutino'),
('Grado 5A', '5°', 'Vespertino'),
('Grado 1B', '1°', 'Vespertino'),
('Grado 2B', '2°', 'Vespertino'),
('Grado 3B', '3°', 'Matutino'),
('Grado 4B', '4°', 'Vespertino'),
('Grado 5B', '5°', 'Matutino');

-- 11. Un docente especializado por cada materia existente, con nombre y
-- apellido separados (mismo criterio que la tabla `estudiantes`). Comparten
-- la misma contraseña demo que docente@classkids.local ("docente123", ver
-- backend/CREDENCIALES_LOCALES.md) porque reutilizan su mismo hash PBKDF2.
INSERT INTO usuarios (email, nombre, apellido, password_hash, rol_id) VALUES
('matematicas@classkids.local', 'Laura', 'Jiménez', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente')),
('espanol@classkids.local', 'Carlos', 'Peña', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente')),
('ciencias@classkids.local', 'Marcela', 'Ospina', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente')),
('sociales@classkids.local', 'Andrés', 'Beltrán', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente')),
('ingles@classkids.local', 'Paula', 'Restrepo', '$pbkdf2-sha256$29000$WkuplTJmLOU8Z6x1rvXeOw$LhP6bY4JkOvbs8Mr2KqxvB2rv.bYZKMVo9U2ieNVors', (SELECT id FROM user_roles WHERE nombre = 'Docente'))
ON CONFLICT (email) DO NOTHING;

-- 12. Estudiantes adicionales: completa 20 por grupo en 1A/2A/3A (tenían 7, 7 y 6)
-- y siembra 20 estudiantes para cada grupo nuevo (4A y 5A).
INSERT INTO estudiantes (documento, nombre, apellido, grupo_id) VALUES
('100121', 'Sofía', 'Hernández', 1), ('100122', 'Mateo', 'Castro', 1), ('100123', 'Valentina', 'Navarro', 1), ('100124', 'Lucas', 'Restrepo', 1), ('100125', 'Isabella', 'Palacios', 1), ('100126', 'Santiago', 'Guerrero', 1), ('100127', 'Camila', 'Quintero', 1), ('100128', 'Alejandro', 'Martínez', 1), ('100129', 'Mariana', 'Acosta', 1), ('100130', 'Diego', 'Rojas', 1), ('100131', 'Gabriela', 'Ospina', 1), ('100132', 'Nicolas', 'Cifuentes', 1), ('100133', 'Daniela', 'Cadena', 1),
('100134', 'Samuel', 'Barrera', 2), ('100135', 'Lucía', 'Rodríguez', 2), ('100136', 'Joaquín', 'Flores', 2), ('100137', 'Victoria', 'Silva', 2), ('100138', 'Martín', 'Beltrán', 2), ('100139', 'Elena', 'Bermúdez', 2), ('100140', 'Tomás', 'Reyes', 2), ('100141', 'Emilia', 'Chaves', 2), ('100142', 'Julián', 'Gómez', 2), ('100143', 'Antonella', 'Ramírez', 2), ('100144', 'Sebastián', 'Mendoza', 2), ('100145', 'Salomé', 'Duarte', 2), ('100146', 'Emmanuel', 'Salazar', 2),
('100147', 'Renata', 'Molina', 3), ('100148', 'David', 'Moreno', 3), ('100149', 'Abril', 'Sarmiento', 3), ('100150', 'Simón', 'Torres', 3), ('100151', 'Ariana', 'Suárez', 3), ('100152', 'Felipe', 'Cárdenas', 3), ('100153', 'Paulina', 'Jiménez', 3), ('100154', 'José', 'Herrera', 3), ('100155', 'Ximena', 'Escobar', 3), ('100156', 'Andrés', 'Contreras', 3), ('100157', 'Valeria', 'Pérez', 3), ('100158', 'Esteban', 'Ríos', 3), ('100159', 'Manuela', 'Gutiérrez', 3), ('100160', 'Cristian', 'Peña', 3),
('100161', 'Natalia', 'Cuervo', 4), ('100162', 'Julian', 'Londoño', 4), ('100163', 'Fernanda', 'Uribe', 4), ('100164', 'Miguel', 'Díaz', 4), ('100165', 'Alejandra', 'Vargas', 4), ('100166', 'Juan', 'Morales', 4), ('100167', 'Melissa', 'Cortés', 4), ('100168', 'Pedro', 'Aguirre', 4), ('100169', 'Catalina', 'Zapata', 4), ('100170', 'Rafael', 'Valencia', 4), ('100171', 'Sofía', 'Beltrán', 4), ('100172', 'Mateo', 'Cifuentes', 4), ('100173', 'Valentina', 'Cadena', 4), ('100174', 'Lucas', 'Barrera', 4), ('100175', 'Isabella', 'Reyes', 4), ('100176', 'Santiago', 'Duarte', 4), ('100177', 'Camila', 'Salazar', 4), ('100178', 'Alejandro', 'Molina', 4), ('100179', 'Mariana', 'Moreno', 4), ('100180', 'Diego', 'Sarmiento', 4),
('100181', 'Gabriela', 'Suárez', 5), ('100182', 'Nicolas', 'Cárdenas', 5), ('100183', 'Daniela', 'Jiménez', 5), ('100184', 'Samuel', 'Herrera', 5), ('100185', 'Lucía', 'Escobar', 5), ('100186', 'Joaquín', 'Contreras', 5), ('100187', 'Victoria', 'Pérez', 5), ('100188', 'Martín', 'Ríos', 5), ('100189', 'Elena', 'Gutiérrez', 5), ('100190', 'Tomás', 'Peña', 5), ('100191', 'Emilia', 'Cuervo', 5), ('100192', 'Julián', 'Londoño', 5), ('100193', 'Antonella', 'Uribe', 5), ('100194', 'Sebastián', 'Díaz', 5), ('100195', 'Salomé', 'Vargas', 5), ('100196', 'Emmanuel', 'Morales', 5), ('100197', 'Renata', 'Cortés', 5), ('100198', 'David', 'Aguirre', 5), ('100199', 'Abril', 'Zapata', 5), ('100200', 'Simón', 'Valencia', 5);

-- 13. 20 estudiantes para cada uno de los grupos sección B (1B a 5B), para
-- que todos los cursos (A y B) queden parejos con 20 estudiantes.
INSERT INTO estudiantes (documento, nombre, apellido, grupo_id) VALUES
('100201', 'Sofía', 'Morales', 6), ('100202', 'Mateo', 'Gómez', 6), ('100203', 'Valentina', 'Jiménez', 6), ('100204', 'Lucas', 'Bermúdez', 6), ('100205', 'Isabella', 'Hernández', 6), ('100206', 'Santiago', 'Beltrán', 6), ('100207', 'Camila', 'Molina', 6), ('100208', 'Alejandro', 'Ríos', 6), ('100209', 'Mariana', 'Martínez', 6), ('100210', 'Diego', 'Vargas', 6), ('100211', 'Gabriela', 'Chaves', 6), ('100212', 'Nicolas', 'Cárdenas', 6), ('100213', 'Daniela', 'Silva', 6), ('100214', 'Samuel', 'Castro', 6), ('100215', 'Lucía', 'Valencia', 6), ('100216', 'Joaquín', 'Salazar', 6), ('100217', 'Victoria', 'Pérez', 6), ('100218', 'Martín', 'Quintero', 6), ('100219', 'Elena', 'Díaz', 6), ('100220', 'Tomás', 'Reyes', 6),
('100221', 'Emilia', 'Suárez', 7), ('100222', 'Julián', 'Flores', 7), ('100223', 'Antonella', 'Navarro', 7), ('100224', 'Sebastián', 'Zapata', 7), ('100225', 'Salomé', 'Duarte', 7), ('100226', 'Emmanuel', 'Contreras', 7), ('100227', 'Renata', 'Guerrero', 7), ('100228', 'David', 'Uribe', 7), ('100229', 'Abril', 'Barrera', 7), ('100230', 'Simón', 'Torres', 7), ('100231', 'Ariana', 'Rodríguez', 7), ('100232', 'Felipe', 'Restrepo', 7), ('100233', 'Paulina', 'Aguirre', 7), ('100234', 'José', 'Mendoza', 7), ('100235', 'Ximena', 'Escobar', 7), ('100236', 'Andrés', 'Palacios', 7), ('100237', 'Valeria', 'Londoño', 7), ('100238', 'Esteban', 'Cadena', 7), ('100239', 'Manuela', 'Sarmiento', 7), ('100240', 'Cristian', 'Peña', 7),
('100241', 'Natalia', 'Rojas', 8), ('100242', 'Julian', 'Cortés', 8), ('100243', 'Fernanda', 'Ramírez', 8), ('100244', 'Miguel', 'Herrera', 8), ('100245', 'Alejandra', 'Ospina', 8), ('100246', 'Juan', 'Cuervo', 8), ('100247', 'Melissa', 'Cifuentes', 8), ('100248', 'Pedro', 'Moreno', 8), ('100249', 'Catalina', 'Gutiérrez', 8), ('100250', 'Rafael', 'Acosta', 8), ('100251', 'Sofía', 'Rincón', 8), ('100252', 'Mateo', 'Delgado', 8), ('100253', 'Valentina', 'Cuellar', 8), ('100254', 'Lucas', 'Trujillo', 8), ('100255', 'Isabella', 'Vega', 8), ('100256', 'Santiago', 'Franco', 8), ('100257', 'Camila', 'Serrano', 8), ('100258', 'Alejandro', 'Correa', 8), ('100259', 'Mariana', 'Arias', 8), ('100260', 'Diego', 'Cabrera', 8),
('100261', 'Gabriela', 'Chaves', 9), ('100262', 'Nicolas', 'Cárdenas', 9), ('100263', 'Daniela', 'Silva', 9), ('100264', 'Samuel', 'Castro', 9), ('100265', 'Lucía', 'Valencia', 9), ('100266', 'Joaquín', 'Salazar', 9), ('100267', 'Victoria', 'Pérez', 9), ('100268', 'Martín', 'Quintero', 9), ('100269', 'Elena', 'Díaz', 9), ('100270', 'Tomás', 'Reyes', 9), ('100271', 'Emilia', 'Suárez', 9), ('100272', 'Julián', 'Flores', 9), ('100273', 'Antonella', 'Navarro', 9), ('100274', 'Sebastián', 'Zapata', 9), ('100275', 'Salomé', 'Duarte', 9), ('100276', 'Emmanuel', 'Contreras', 9), ('100277', 'Renata', 'Guerrero', 9), ('100278', 'David', 'Uribe', 9), ('100279', 'Abril', 'Barrera', 9), ('100280', 'Simón', 'Torres', 9),
('100281', 'Ariana', 'Rodríguez', 10), ('100282', 'Felipe', 'Restrepo', 10), ('100283', 'Paulina', 'Aguirre', 10), ('100284', 'José', 'Mendoza', 10), ('100285', 'Ximena', 'Escobar', 10), ('100286', 'Andrés', 'Palacios', 10), ('100287', 'Valeria', 'Londoño', 10), ('100288', 'Esteban', 'Cadena', 10), ('100289', 'Manuela', 'Sarmiento', 10), ('100290', 'Cristian', 'Peña', 10), ('100291', 'Natalia', 'Rojas', 10), ('100292', 'Julian', 'Cortés', 10), ('100293', 'Fernanda', 'Ramírez', 10), ('100294', 'Miguel', 'Herrera', 10), ('100295', 'Alejandra', 'Ospina', 10), ('100296', 'Juan', 'Cuervo', 10), ('100297', 'Melissa', 'Cifuentes', 10), ('100298', 'Pedro', 'Moreno', 10), ('100299', 'Catalina', 'Gutiérrez', 10), ('100300', 'Rafael', 'Acosta', 10);

-- 14. Cada materia queda con un docente especializado asignado en los diez
-- cursos (secciones A y B de 1° a 5°). En 1A/2A/3A ya hay un docente por
-- materia (visto en el punto 9), así que el índice único (materia_id,
-- grupo_id) descarta esas combinaciones y solo se completan las nuevas:
-- 4A, 5A y las seis secciones B restantes.
INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN materias m ON m.nombre = 'Matemáticas'
JOIN grupos g ON g.grado IN ('1°', '2°', '3°', '4°', '5°')
WHERE u.email = 'matematicas@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;

INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN materias m ON m.nombre = 'Español y Literatura'
JOIN grupos g ON g.grado IN ('1°', '2°', '3°', '4°', '5°')
WHERE u.email = 'espanol@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;

INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN materias m ON m.nombre = 'Ciencias Naturales'
JOIN grupos g ON g.grado IN ('1°', '2°', '3°', '4°', '5°')
WHERE u.email = 'ciencias@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;

INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN materias m ON m.nombre = 'Sociales'
JOIN grupos g ON g.grado IN ('1°', '2°', '3°', '4°', '5°')
WHERE u.email = 'sociales@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;

INSERT INTO asignaciones (docente_id, materia_id, grupo_id)
SELECT u.id, m.id, g.id
FROM usuarios u
JOIN materias m ON m.nombre = 'Inglés'
JOIN grupos g ON g.grado IN ('1°', '2°', '3°', '4°', '5°')
WHERE u.email = 'ingles@classkids.local'
ON CONFLICT (materia_id, grupo_id) DO NOTHING;
-- 15. Actividades para las materias/grupos que aún no tenían ninguna:
-- completa Sociales e Inglés en 1A, y siembra las 5 materias en 4A, 5A y
-- las cinco secciones B (1B a 5B) — así todos los 10 grupos quedan con
-- al menos una actividad por materia.
INSERT INTO actividades (materia_id, grupo_id, titulo, descripcion, fecha_entrega) VALUES
(4, 1, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-08'),
(5, 1, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-09'),
(1, 4, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-10'),
(2, 4, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-11'),
(3, 4, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-12'),
(4, 4, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-13'),
(5, 4, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-14'),
(1, 5, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-15'),
(2, 5, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-16'),
(3, 5, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-17'),
(4, 5, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-18'),
(5, 5, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-19'),
(1, 6, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-20'),
(2, 6, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-21'),
(3, 6, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-22'),
(4, 6, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-23'),
(5, 6, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-24'),
(1, 7, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-25'),
(2, 7, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-26'),
(3, 7, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-27'),
(4, 7, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-28'),
(5, 7, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-08'),
(1, 8, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-09'),
(2, 8, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-10'),
(3, 8, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-11'),
(4, 8, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-12'),
(5, 8, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-13'),
(1, 9, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-14'),
(2, 9, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-15'),
(3, 9, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-16'),
(4, 9, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-17'),
(5, 9, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-18'),
(1, 10, 'Taller de refuerzo numérico', 'Ejercicios de práctica para reforzar los temas del periodo', '2026-09-19'),
(2, 10, 'Comprensión de lectura', 'Guía de lectura con preguntas de comprensión', '2026-09-20'),
(3, 10, 'Exploración del entorno natural', 'Actividad de observación y registro sobre el entorno', '2026-09-21'),
(4, 10, 'Mi comunidad y mi territorio', 'Trabajo sobre la comunidad, el territorio y la convivencia', '2026-09-22'),
(5, 10, 'Vocabulario y expresiones básicas', 'Práctica de vocabulario y frases de uso cotidiano', '2026-09-23');

-- 16. Una calificación por cada uno de los 180 estudiantes nuevos (los
-- 20 originales ya tenían calificaciones). Distribución realista: la
-- gran mayoría aprueba, y una proporción minoritaria queda por debajo
-- de 3.0 para activar la misma regla de alerta automática que usa
-- POST /calificaciones (ver backend/main.py).
INSERT INTO calificaciones (estudiante_id, materia_id, nota, periodo, observacion) VALUES
(21, 2, 4.9, 1, 'Buen desempeño en el periodo'),
(22, 3, 3.7, 1, 'Entrega puntual de los talleres'),
(23, 4, 3.0, 1, 'Participación activa en clase'),
(24, 5, 3.8, 1, 'Cumple con las metas del periodo'),
(25, 1, 4.2, 1, 'Buen desempeño en el periodo'),
(26, 2, 2.9, 1, 'Requiere refuerzo y acompañamiento'),
(27, 3, 3.5, 1, 'Participación activa en clase'),
(28, 4, 4.9, 1, 'Entrega puntual de los talleres'),
(29, 5, 4.6, 1, 'Cumple con las metas del periodo'),
(30, 1, 4.0, 1, 'Buen desempeño en el periodo'),
(31, 2, 4.5, 1, 'Buen manejo de los temas vistos'),
(32, 3, 4.0, 1, 'Participación activa en clase'),
(33, 4, 4.2, 1, 'Buen desempeño en el periodo'),
(34, 5, 3.9, 1, 'Cumple con las metas del periodo'),
(35, 1, 4.4, 1, 'Participación activa en clase'),
(36, 2, 3.5, 1, 'Entrega puntual de los talleres'),
(37, 3, 5.0, 1, 'Participación activa en clase'),
(38, 4, 3.7, 1, 'Entrega puntual de los talleres'),
(39, 5, 4.5, 1, 'Buen manejo de los temas vistos'),
(40, 1, 3.2, 1, 'Participación activa en clase'),
(41, 2, 3.7, 1, 'Participación activa en clase'),
(42, 3, 4.1, 1, 'Cumple con las metas del periodo'),
(43, 4, 1.8, 1, 'Necesita apoyo adicional en el tema'),
(44, 5, 2.6, 1, 'Se recomienda plan de mejoramiento'),
(45, 1, 2.4, 1, 'Requiere refuerzo y acompañamiento'),
(46, 2, 3.9, 1, 'Entrega puntual de los talleres'),
(47, 3, 3.9, 1, 'Participación activa en clase'),
(48, 4, 4.3, 1, 'Buen manejo de los temas vistos'),
(49, 5, 3.3, 1, 'Cumple con las metas del periodo'),
(50, 1, 3.1, 1, 'Buen desempeño en el periodo'),
(51, 2, 4.4, 1, 'Buen manejo de los temas vistos'),
(52, 3, 4.5, 1, 'Entrega puntual de los talleres'),
(53, 4, 3.0, 1, 'Entrega puntual de los talleres'),
(54, 5, 3.5, 1, 'Entrega puntual de los talleres'),
(55, 1, 3.8, 1, 'Buen desempeño en el periodo'),
(56, 2, 2.2, 1, 'Necesita apoyo adicional en el tema'),
(57, 3, 5.0, 1, 'Entrega puntual de los talleres'),
(58, 4, 4.9, 1, 'Participación activa en clase'),
(59, 5, 3.0, 1, 'Buen desempeño en el periodo'),
(60, 1, 3.4, 1, 'Entrega puntual de los talleres'),
(61, 2, 3.9, 1, 'Cumple con las metas del periodo'),
(62, 3, 3.3, 1, 'Participación activa en clase'),
(63, 4, 3.5, 1, 'Buen desempeño en el periodo'),
(64, 5, 3.7, 1, 'Buen manejo de los temas vistos'),
(65, 1, 4.5, 1, 'Buen manejo de los temas vistos'),
(66, 2, 4.8, 1, 'Participación activa en clase'),
(67, 3, 2.7, 1, 'Requiere refuerzo y acompañamiento'),
(68, 4, 3.2, 1, 'Buen desempeño en el periodo'),
(69, 5, 4.9, 1, 'Buen desempeño en el periodo'),
(70, 1, 3.8, 1, 'Buen manejo de los temas vistos'),
(71, 2, 3.0, 1, 'Entrega puntual de los talleres'),
(72, 3, 3.4, 1, 'Buen desempeño en el periodo'),
(73, 4, 4.9, 1, 'Buen manejo de los temas vistos'),
(74, 5, 1.9, 1, 'Requiere refuerzo y acompañamiento'),
(75, 1, 3.9, 1, 'Entrega puntual de los talleres'),
(76, 2, 4.5, 1, 'Participación activa en clase'),
(77, 3, 3.2, 1, 'Participación activa en clase'),
(78, 4, 4.4, 1, 'Entrega puntual de los talleres'),
(79, 5, 4.3, 1, 'Entrega puntual de los talleres'),
(80, 1, 2.7, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(81, 2, 3.6, 1, 'Buen desempeño en el periodo'),
(82, 3, 3.5, 1, 'Participación activa en clase'),
(83, 4, 4.6, 1, 'Buen manejo de los temas vistos'),
(84, 5, 4.1, 1, 'Entrega puntual de los talleres'),
(85, 1, 3.3, 1, 'Participación activa en clase'),
(86, 2, 4.6, 1, 'Buen manejo de los temas vistos'),
(87, 3, 4.0, 1, 'Buen manejo de los temas vistos'),
(88, 4, 1.9, 1, 'Se recomienda plan de mejoramiento'),
(89, 5, 4.7, 1, 'Cumple con las metas del periodo'),
(90, 1, 3.9, 1, 'Participación activa en clase'),
(91, 2, 2.2, 1, 'Necesita apoyo adicional en el tema'),
(92, 3, 4.1, 1, 'Buen manejo de los temas vistos'),
(93, 4, 2.8, 1, 'Se recomienda plan de mejoramiento'),
(94, 5, 4.8, 1, 'Buen manejo de los temas vistos'),
(95, 1, 4.3, 1, 'Buen manejo de los temas vistos'),
(96, 2, 4.4, 1, 'Buen manejo de los temas vistos'),
(97, 3, 2.8, 1, 'Requiere refuerzo y acompañamiento'),
(98, 4, 2.0, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(99, 5, 4.1, 1, 'Cumple con las metas del periodo'),
(100, 1, 2.9, 1, 'Requiere refuerzo y acompañamiento'),
(101, 2, 4.2, 1, 'Buen desempeño en el periodo'),
(102, 3, 4.5, 1, 'Cumple con las metas del periodo'),
(103, 4, 3.1, 1, 'Entrega puntual de los talleres'),
(104, 5, 4.2, 1, 'Buen manejo de los temas vistos'),
(105, 1, 3.3, 1, 'Cumple con las metas del periodo'),
(106, 2, 4.3, 1, 'Buen manejo de los temas vistos'),
(107, 3, 4.1, 1, 'Cumple con las metas del periodo'),
(108, 4, 4.3, 1, 'Cumple con las metas del periodo'),
(109, 5, 3.1, 1, 'Participación activa en clase'),
(110, 1, 3.3, 1, 'Buen desempeño en el periodo'),
(111, 2, 4.2, 1, 'Cumple con las metas del periodo'),
(112, 3, 4.4, 1, 'Buen manejo de los temas vistos'),
(113, 4, 3.7, 1, 'Entrega puntual de los talleres'),
(114, 5, 4.1, 1, 'Entrega puntual de los talleres'),
(115, 1, 5.0, 1, 'Participación activa en clase'),
(116, 2, 4.5, 1, 'Entrega puntual de los talleres'),
(117, 3, 3.6, 1, 'Buen manejo de los temas vistos'),
(118, 4, 3.0, 1, 'Participación activa en clase'),
(119, 5, 4.9, 1, 'Cumple con las metas del periodo'),
(120, 1, 4.5, 1, 'Entrega puntual de los talleres'),
(121, 2, 4.1, 1, 'Participación activa en clase'),
(122, 3, 3.8, 1, 'Buen manejo de los temas vistos'),
(123, 4, 4.7, 1, 'Entrega puntual de los talleres'),
(124, 5, 3.9, 1, 'Entrega puntual de los talleres'),
(125, 1, 4.7, 1, 'Cumple con las metas del periodo'),
(126, 2, 4.4, 1, 'Cumple con las metas del periodo'),
(127, 3, 4.9, 1, 'Buen desempeño en el periodo'),
(128, 4, 4.7, 1, 'Participación activa en clase'),
(129, 5, 2.5, 1, 'Se recomienda plan de mejoramiento'),
(130, 1, 3.6, 1, 'Cumple con las metas del periodo'),
(131, 2, 3.2, 1, 'Buen desempeño en el periodo'),
(132, 3, 3.9, 1, 'Cumple con las metas del periodo'),
(133, 4, 1.9, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(134, 5, 2.4, 1, 'Se recomienda plan de mejoramiento'),
(135, 1, 4.9, 1, 'Entrega puntual de los talleres'),
(136, 2, 3.1, 1, 'Participación activa en clase'),
(137, 3, 4.3, 1, 'Buen desempeño en el periodo'),
(138, 4, 3.8, 1, 'Buen desempeño en el periodo'),
(139, 5, 4.9, 1, 'Entrega puntual de los talleres'),
(140, 1, 4.6, 1, 'Buen manejo de los temas vistos'),
(141, 2, 3.1, 1, 'Buen desempeño en el periodo'),
(142, 3, 2.9, 1, 'Necesita apoyo adicional en el tema'),
(143, 4, 4.0, 1, 'Entrega puntual de los talleres'),
(144, 5, 4.1, 1, 'Entrega puntual de los talleres'),
(145, 1, 3.0, 1, 'Participación activa en clase'),
(146, 2, 3.9, 1, 'Participación activa en clase'),
(147, 3, 5.0, 1, 'Buen manejo de los temas vistos'),
(148, 4, 3.4, 1, 'Buen manejo de los temas vistos'),
(149, 5, 4.2, 1, 'Cumple con las metas del periodo'),
(150, 1, 4.2, 1, 'Buen manejo de los temas vistos'),
(151, 2, 5.0, 1, 'Participación activa en clase'),
(152, 3, 3.9, 1, 'Participación activa en clase'),
(153, 4, 3.1, 1, 'Participación activa en clase'),
(154, 5, 4.4, 1, 'Buen manejo de los temas vistos'),
(155, 1, 2.4, 1, 'Necesita apoyo adicional en el tema'),
(156, 2, 4.2, 1, 'Buen desempeño en el periodo'),
(157, 3, 3.1, 1, 'Buen desempeño en el periodo'),
(158, 4, 3.7, 1, 'Buen desempeño en el periodo'),
(159, 5, 3.4, 1, 'Buen desempeño en el periodo'),
(160, 1, 4.6, 1, 'Buen desempeño en el periodo'),
(161, 2, 4.2, 1, 'Cumple con las metas del periodo'),
(162, 3, 3.7, 1, 'Entrega puntual de los talleres'),
(163, 4, 3.9, 1, 'Cumple con las metas del periodo'),
(164, 5, 4.0, 1, 'Entrega puntual de los talleres'),
(165, 1, 3.5, 1, 'Buen manejo de los temas vistos'),
(166, 2, 3.3, 1, 'Participación activa en clase'),
(167, 3, 3.6, 1, 'Participación activa en clase'),
(168, 4, 4.2, 1, 'Entrega puntual de los talleres'),
(169, 5, 4.2, 1, 'Cumple con las metas del periodo'),
(170, 1, 4.9, 1, 'Cumple con las metas del periodo'),
(171, 2, 3.1, 1, 'Buen desempeño en el periodo'),
(172, 3, 3.2, 1, 'Buen manejo de los temas vistos'),
(173, 4, 4.5, 1, 'Buen desempeño en el periodo'),
(174, 5, 3.8, 1, 'Buen manejo de los temas vistos'),
(175, 1, 3.2, 1, 'Cumple con las metas del periodo'),
(176, 2, 3.2, 1, 'Cumple con las metas del periodo'),
(177, 3, 4.1, 1, 'Cumple con las metas del periodo'),
(178, 4, 3.3, 1, 'Buen desempeño en el periodo'),
(179, 5, 4.0, 1, 'Entrega puntual de los talleres'),
(180, 1, 4.1, 1, 'Participación activa en clase'),
(181, 2, 2.3, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(182, 3, 3.1, 1, 'Entrega puntual de los talleres'),
(183, 4, 3.9, 1, 'Buen manejo de los temas vistos'),
(184, 5, 5.0, 1, 'Cumple con las metas del periodo'),
(185, 1, 4.5, 1, 'Buen manejo de los temas vistos'),
(186, 2, 3.8, 1, 'Buen manejo de los temas vistos'),
(187, 3, 2.5, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(188, 4, 2.2, 1, 'Requiere refuerzo y acompañamiento'),
(189, 5, 4.0, 1, 'Cumple con las metas del periodo'),
(190, 1, 4.6, 1, 'Buen manejo de los temas vistos'),
(191, 2, 2.4, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(192, 3, 1.8, 1, 'Presenta dificultades para alcanzar el nivel básico'),
(193, 4, 3.0, 1, 'Buen manejo de los temas vistos'),
(194, 5, 4.9, 1, 'Buen desempeño en el periodo'),
(195, 1, 3.7, 1, 'Buen manejo de los temas vistos'),
(196, 2, 4.5, 1, 'Buen manejo de los temas vistos'),
(197, 3, 4.4, 1, 'Participación activa en clase'),
(198, 4, 4.5, 1, 'Cumple con las metas del periodo'),
(199, 5, 3.6, 1, 'Buen desempeño en el periodo'),
(200, 1, 3.0, 1, 'Cumple con las metas del periodo');

-- 17. Alertas de bajo rendimiento para los estudiantes nuevos cuyo
-- promedio (con la calificación insertada arriba) quedó por debajo de
-- 3.0 — mismo criterio y formato de mensaje que generaría la app.
INSERT INTO alertas (estudiante_id, tipo, mensaje, estado) VALUES
(26, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Español y Literatura (Periodo 1)', 'active'),
(43, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(44, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Inglés (Periodo 1)', 'active'),
(45, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Matemáticas (Periodo 1)', 'active'),
(56, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Español y Literatura (Periodo 1)', 'active'),
(67, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Ciencias Naturales (Periodo 1)', 'active'),
(74, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Inglés (Periodo 1)', 'active'),
(80, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Matemáticas (Periodo 1)', 'active'),
(88, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(91, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Español y Literatura (Periodo 1)', 'active'),
(93, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(97, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Ciencias Naturales (Periodo 1)', 'active'),
(98, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(100, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Matemáticas (Periodo 1)', 'active'),
(129, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Inglés (Periodo 1)', 'active'),
(133, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(134, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Inglés (Periodo 1)', 'active'),
(142, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Ciencias Naturales (Periodo 1)', 'active'),
(155, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Matemáticas (Periodo 1)', 'active'),
(181, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Español y Literatura (Periodo 1)', 'active'),
(187, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Ciencias Naturales (Periodo 1)', 'active'),
(188, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Sociales (Periodo 1)', 'active'),
(191, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Español y Literatura (Periodo 1)', 'active'),
(192, 'Bajo Rendimiento', 'Promedio acumulado inferior a 3.0 en Ciencias Naturales (Periodo 1)', 'active');
