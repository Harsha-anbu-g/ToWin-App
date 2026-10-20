// A scripted axios adapter: records every request, answers from a queue.
// Replies default to 200 {} when the queue is empty.
import { AxiosError } from 'axios';

export function fakeAdapter() {
  const calls = [];
  const replies = [];
  const adapter = async (config) => {
    calls.push(config);
    const r = replies.shift() ?? { status: 200, data: {} };
    const response = { status: r.status, statusText: '', headers: {}, config, data: r.data };
    if (r.status >= 400) throw new AxiosError(`HTTP ${r.status}`, 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  return { adapter, calls, reply: (status, data) => replies.push({ status, data }) };
}

/** Point the bundle's axios instance at a fake. Returns the fake. */
export function wireFake(bundle) {
  const fake = fakeAdapter();
  bundle.client.default.defaults.adapter = fake.adapter;
  return fake;
}
