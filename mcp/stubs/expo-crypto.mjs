// idempotency.js asks for this only when Web Crypto is missing; Node has it,
// but the import must still resolve at bundle time.
export { randomUUID } from 'node:crypto';
