/** Local-only AMIS cache path for a CRS term_id (gitignored). */
export function defaultAmisExportPath(termId: number): string {
  const label =
    termId === 1251
      ? "1st-sem"
      : termId === 1252
        ? "midyear"
        : termId === 1253
          ? "2nd-sem"
          : `term-${termId}`;
  return `data/amis-${label}-${termId}.json`;
}
