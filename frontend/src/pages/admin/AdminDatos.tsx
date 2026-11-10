import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";

const useAll = (endpoint: string) => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api.get(endpoint)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.items || data?.data || [];
        setRows(list);
      })
      .catch((err) => {
        console.error(`Error al cargar ${endpoint}:`, err);
        setRows([]);
      });
  }, [endpoint]);
  return rows;
};

const AdminDatos = () => {
  const grupos = useAll("/grupos");
  const estudiantes = useAll("/estudiantes");
  const alertas = useAll("/alertas");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administración" title="Datos globales" description="Vista de solo lectura sobre la información de toda la plataforma" />

      <Tabs defaultValue="grupos">
        <TabsList>
          <TabsTrigger value="grupos">Grupos ({grupos.length})</TabsTrigger>
          <TabsTrigger value="estudiantes">Estudiantes ({estudiantes.length})</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({alertas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Grado</TableHead><TableHead>Turno</TableHead><TableHead>Creado</TableHead></TableRow></TableHeader>
              <TableBody>
                {grupos.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.nombre}</TableCell>
                    <TableCell>{g.grado}</TableCell>
                    <TableCell>{g.turno}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.created_at ? new Date(g.created_at).toLocaleDateString("es") : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="estudiantes">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Apellido</TableHead><TableHead>Documento</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {estudiantes.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nombre}</TableCell>
                    <TableCell>{e.apellido}</TableCell>
                    <TableCell>{e.documento}</TableCell>
                    <TableCell>{e.activo ? "Activo" : "Inactivo"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Mensaje</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {alertas.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tipo}</TableCell>
                    <TableCell className="text-sm">{a.mensaje}</TableCell>
                    <TableCell>{a.estado}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDatos;