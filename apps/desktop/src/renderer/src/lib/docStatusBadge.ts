export function docStatusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("error") || s.includes("fail")) return "badge badge-warn";
  if (s.includes("ready") || s.includes("done") || s.includes("indexed") || s.includes("ok"))
    return "badge badge-success";
  return "badge badge-muted";
}
