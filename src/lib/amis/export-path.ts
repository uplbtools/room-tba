/** Local-only AMIS cache path for a CRS term_id (gitignored). */
export function defaultAmisExportPath(termId: number): string {
  const label =
    termId === 1251
      ? "1st-sem"
      : termId === 1252
        ? "2nd-sem"
        : termId === 1253
          ? "midyear"
          : `term-${termId}`;
  return `data/amis-${label}-${termId}.json`;
}
