export const getNameServiceLawyer = (data: any, dataServiceType: any) => {
  if (data) {
    const filtertypes = data
      .map((item: any) => {
        const matchingLabel: any = dataServiceType.find(
          (res: any) => res.id === item.service_type_id
        );
        return matchingLabel
          ? { ...matchingLabel, max_leads: item.max_leads }
          : null;
      })
      // Obs 47 — sin esto quedaban `null` en el arreglo cuando /service_types
      // aún no había llegado, y el dashboard leía `.max_leads` de un null.
      .filter(Boolean);
    return filtertypes;
  }
  return [];
};

// Obs 37/50 — en BD hay áreas repetidas (filas que creó el guardado viejo).
// Una sola fila por área: la de menor id (la original). NUNCA sumar las
// repetidas: esa suma es justo la capacidad inflada (p. ej. 130).
export const dedupeServicesCapacity = <
  T extends { id: number; service_type_id: number }
>(
  rows: unknown
): T[] => {
  if (!Array.isArray(rows)) return [];
  const byArea = new Map<number, T>();
  for (const row of rows as T[]) {
    const stId = Number(row?.service_type_id);
    if (!Number.isFinite(stId)) continue;
    const prev = byArea.get(stId);
    if (!prev || Number(row.id) < Number(prev.id)) byArea.set(stId, row);
  }
  return Array.from(byArea.values()).sort(
    (a, b) => Number(a.id) - Number(b.id)
  );
};

// Obs 47 — áreas del abogado con su capacidad. `services_capacity` (GET
// /lawyers/:id) ya trae el nombre del área, así que no depende de que
// /service_types llegue antes (la carrera que tumbaba el dashboard al entrar).
// El cruce manual con /service_types queda solo como respaldo.
export const getServicesLawyer = (lawyer: any, dataServiceType: any) => {
  if (Array.isArray(lawyer?.services_capacity)) {
    return dedupeServicesCapacity<any>(lawyer.services_capacity).map((item: any) => ({
      id: item.service_type_id,
      name: item.name,
      max_leads: item.max_leads,
    }));
  }
  return getNameServiceLawyer(lawyer?.lawyersServices, dataServiceType);
};
