interface Category {
  id: number;
  name: string | null;
}
interface Graduation {
  id: number;
  abbreviation: string | null;
}
interface Section {
  id: number;
  name: string | null;
}

export async function useLookups() {
  const toast = useToast();

  const [
    { data: categories, error: categoriesError },
    { data: graduations, error: graduationsError },
    { data: sections, error: sectionsError },
  ] = await Promise.all([
    useFetch<Category[]>("/api/categories"),
    useFetch<Graduation[]>("/api/graduations"),
    useFetch<Section[]>("/api/sections"),
  ]);

  if (categoriesError.value || graduationsError.value || sectionsError.value) {
    toast.add({
      title: "Erro ao carregar categorias, graduações ou seções.",
      color: "error",
    });
  }

  return { categories, graduations, sections };
}
