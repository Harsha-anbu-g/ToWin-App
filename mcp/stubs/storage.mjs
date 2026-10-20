// i18n requires ../lib/storage lazily to read a saved language choice. The
// server has no saved choice, so every read answers null. Same three names
// as src/lib/storage.js.
export const getItemAsync = async () => null;
export const setItemAsync = async () => {};
export const deleteItemAsync = async () => {};
export default { getItemAsync, setItemAsync, deleteItemAsync };
