/** Root-relative asset URL. Honors Vite `base` so GitHub Pages (`/farshore/`) still loads art. */
export function asset(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const rel = path.replace(/^\//, "");
  return `${base}${rel}`;
}
