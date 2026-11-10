// src/types/index.ts

export interface Grupo {
  id: number;
  nombre: string;
  grado?: string;
  turno?: string;
  año_lectivo?: number;
}

export interface Estudiante {
  id: number;
  documento: string;
  nombre: string;
  apellido: string;
  grupo_id?: number;
  nombre_grupo?: string;
  activo: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  codigo?: string;
}

export interface Actividad {
  id: number;
  materia_id: number;
  grupo_id: number;
  materia_nombre?: string;
  grupo_nombre?: string;
  titulo: string;
  descripcion?: string;
  fecha_entrega?: string;
}

export interface Calificacion {
  id: number;
  estudiante_id: number;
  materia_id: number;
  actividad_id?: number;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  materia_nombre?: string;
  nota: number;
  periodo?: number;
  observacion?: string;
  fecha_registro?: string;
}

export interface Observacion {
  id: number;
  estudiante_id: number;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  tipo?: string;
  descripcion: string;
  fecha?: string;
}

export interface Alerta {
  id: number;
  estudiante_id: number;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  tipo: string;
  mensaje: string;
  estado: string;
  fecha_creacion?: string;
}