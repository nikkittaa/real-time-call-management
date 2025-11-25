// export function formatDateForClickHouse(
//   date: Date | string | null | undefined,
// ) {
//   if (!date) return null;
//   const d = new Date(date);
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, '0');
//   const dd = String(d.getDate()).padStart(2, '0');
//   const hh = String(d.getHours()).padStart(2, '0');
//   const mi = String(d.getMinutes()).padStart(2, '0');
//   const ss = String(d.getSeconds()).padStart(2, '0');
//   return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
// }

export function formatDateForClickHouse(
  date: Date | string | null | undefined,
) {
  if (!date) return null;
  const d = new Date(date);

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
