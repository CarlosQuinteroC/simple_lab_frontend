export function validateTaskTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'El título de la tarea es obligatorio.';
  }
  if (trimmed.length > 200) {
    return 'El título no puede superar los 200 caracteres.';
  }
  return null;
}
