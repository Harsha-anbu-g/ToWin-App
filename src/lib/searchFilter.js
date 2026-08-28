// Search inside a list you already have: Messages, Posted Help and the two
// hub panels each carry a WhatsApp-style search field (owner call
// 2026-08-28) and all of them narrow their rows through these two functions,
// so "does this row match" means one thing everywhere. Case, accents and
// stray spaces never decide a match: an elder typing "priya" must find
// "Priya Sharma", and "Jose" must find "José".

const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Whether any of the fields contains the query (case- and accent-insensitive
 * substring). A blank query matches everything.
 * @param {string} query   what the person typed
 * @param {Array<string|null|undefined>} fields  the texts a row can be found by
 * @returns {boolean}
 */
export function matchesQuery(query, fields) {
  const needle = fold(query);
  if (!needle) return true;
  return fields.some((field) => fold(field).includes(needle));
}

/**
 * The rows that match the query, in their original order.
 * @template T
 * @param {T[]} items
 * @param {string} query
 * @param {(item: T) => Array<string|null|undefined>} fieldsOf  which texts each row can be found by
 * @returns {T[]}
 */
export function filterByQuery(items, query, fieldsOf) {
  if (!fold(query)) return items;
  return items.filter((item) => matchesQuery(query, fieldsOf(item)));
}
