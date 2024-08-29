export const getNameServiceLawyer = (data: any, dataServiceType: any) => {
  if (data) {
    const filtertypes = data.map((item: any) => {
      const matchingLabel: any = dataServiceType.find(
        (res: any) => res.id === item.service_type_id
      );
      return matchingLabel
        ? { ...matchingLabel, max_leads: item.max_leads }
        : null;
    });
    return filtertypes;
  }
  return [];
};
