export function appendSelectedPhotos(current: File[], selected: File[]): File[] {
  if (selected.length === 0) return current;
  return [...current, ...selected];
}
