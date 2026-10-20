// Registers every catalog entry on an McpServer. The only file that knows
// the MCP SDK. Owns the confirm guard, the safety notes, and the shape of
// every result and error.
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { inputSchemaFor } from './schema.mjs';

export const SERVER_NAME = 'towinly-mcp-server';

// The two actions nothing can take back. They refuse without confirm: true.
export const CONFIRM_REQUIRED = new Set(['towinly_delete_my_account', 'towinly_send_sos']);
const CONFIRM_FIELD = z
  .boolean()
  .optional()
  .describe('Must be true. This cannot be undone; pass true only after the person has agreed.');
const CONFIRM_REFUSAL = 'This cannot be undone. Call again with confirm: true after the person has agreed.';

// Lines the doc comments do not carry (trust-and-safety review, 2026-10-19).
const REPORT_NOTE = 'A human reads every report. Promise a process, never an outcome.';
export const DESCRIPTION_NOTES = Object.freeze({
  towinly_send_sos:
    "Danger right now: call emergency services first (911 in Canada and the US, 112 in India). This alerts the person's emergency contacts; it does not call them.",
  towinly_report_user: REPORT_NOTE,
  towinly_report_pass_on_story: REPORT_NOTE,
});

/** The description the assistant reads: the doc sentence, the prose field list if any, the safety note if any. */
export function describeTool(entry) {
  return [entry.description, entry.argNote, DESCRIPTION_NOTES[entry.tool]].filter(Boolean).join(' ');
}

/** Call the bundled function the way its signature expects. */
export function callEntry(entry, bundle, input = {}) {
  const fn = bundle[entry.fn];
  if (typeof fn !== 'function') throw new Error(`${entry.fn} is missing from the api bundle`);
  if (entry.shape === 'none') return fn();
  if (entry.shape === 'object') {
    const { confirm, ...rest } = input;
    return fn(rest);
  }
  return fn(...entry.params.map((p) => input[p.name]));
}

export function formatResult(result) {
  if (result === undefined || result === null || result === '') {
    return { content: [{ type: 'text', text: 'Done.' }] };
  }
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const structured = Array.isArray(result) ? { items: result } : typeof result === 'object' ? result : null;
  return structured ? { content: [{ type: 'text', text }], structuredContent: structured } : { content: [{ type: 'text', text }] };
}

/** One plain sentence per failure, with the next step. Never a stack trace. */
export function errorText(error) {
  if (error?.isSessionError) return error.message;
  // The api functions refuse bad input with a plain Error ("sendMessage needs content").
  if (error instanceof Error && !error.isAxiosError && !error.response) return error.message;
  const res = error?.response;
  if (!res) return 'Towinly could not be reached. Check the connection and try again.';
  if (res.status === 401) return 'Sign-in failed. Check TOWINLY_IDENTIFIER and TOWINLY_PASSWORD.';
  if (res.status === 403) return 'Please verify your email first. Check your inbox for the link, then try again.';
  if (res.status >= 500) return "Something is wrong on Towinly's side. Please try again in a minute.";
  return res.data?.message || `Towinly refused the request (${res.status}).`;
}

const refuse = (text) => ({ isError: true, content: [{ type: 'text', text }] });

/**
 * @param {object} deps
 * @param {Array} deps.catalog   from buildCatalog()
 * @param {object} deps.bundle   from buildApiBundle()
 * @param {object} deps.session  from createSession()
 * @param {string} [deps.version]
 * @param {Function} [deps.log]  one line per call: tool, status, elapsed. Never arguments or bodies.
 */
export function buildServer({ catalog, bundle, session, version = '0.1.0', log = (line) => process.stderr.write(line + '\n') }) {
  const server = new McpServer({ name: SERVER_NAME, version });
  for (const entry of catalog) {
    const needsConfirm = CONFIRM_REQUIRED.has(entry.tool);
    let schema = inputSchemaFor(entry);
    if (needsConfirm) schema = (schema ?? z.object({})).extend({ confirm: CONFIRM_FIELD });
    const config = {
      title: entry.fn,
      description: describeTool(entry),
      annotations: {
        readOnlyHint: entry.readOnly,
        destructiveHint: entry.destructive,
        idempotentHint: entry.readOnly,
        openWorldHint: false,
      },
    };
    if (schema) config.inputSchema = schema;

    server.registerTool(entry.tool, config, async (input = {}) => {
      if (needsConfirm && input.confirm !== true) return refuse(CONFIRM_REFUSAL);
      const started = Date.now();
      try {
        const result = await session.run(() => callEntry(entry, bundle, input));
        log(`${entry.tool} ok ${Date.now() - started}ms`);
        return formatResult(result);
      } catch (error) {
        log(`${entry.tool} ${error?.response?.status ?? 'error'} ${Date.now() - started}ms`);
        return refuse(errorText(error));
      }
    });
  }
  return server;
}
