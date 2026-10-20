// The one thing this agent does with the backend: sign in as the configured
// account and ask the helper. Same environment variables as the MCP server.
import axios from 'axios';

const LIVE = 'https://backend-production-cef3.up.railway.app/api';

export function createTowinly({ env = process.env, http = axios.create({ timeout: 35_000 }) } = {}) {
  const base = env.TOWINLY_API_BASE_URL || LIVE;
  let token = env.TOWINLY_TOKEN || null;

  async function signIn() {
    if (!env.TOWINLY_IDENTIFIER || !env.TOWINLY_PASSWORD) {
      throw new Error('No Towinly login configured. Set TOWINLY_IDENTIFIER and TOWINLY_PASSWORD, or TOWINLY_TOKEN.');
    }
    const res = await http.post(`${base}/auth/login`, { identifier: env.TOWINLY_IDENTIFIER, password: env.TOWINLY_PASSWORD });
    token = res?.data?.token;
    if (!token) throw new Error('Login gave no token.');
  }

  async function chat(text) {
    const res = await http.post(`${base}/assistant/chat`, { message: text, history: [] }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res?.data;
  }

  /** The helper's reply and any proposed action. Signs in first, and once more on a 401. */
  async function ask(text) {
    if (!token) await signIn();
    try {
      return await chat(text);
    } catch (e) {
      if (e?.response?.status !== 401) throw e;
      token = null;
      await signIn();
      return chat(text);
    }
  }

  return { ask };
}
