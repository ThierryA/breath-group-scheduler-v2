/** Turn "name.surname", "name_surname", "nameSurname" → "Name Surname" */
export function beautifyName(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
