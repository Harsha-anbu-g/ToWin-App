// The Agent Card: what another agent reads to learn what Towinly's helper can do
// and where to send messages (A2A protocol 1.0, JSON-RPC binding).
const DEFAULT_URL = 'http://localhost:7421/a2a/v1';

export function agentCard(env = process.env) {
  return {
    name: 'Towinly helper',
    description:
      'Answers questions about Towinly, the community that brings older people and younger helpers '
      + 'together: how trust grows, how help requests work, how family links work. Text in, text out. '
      + 'It can propose an action for the signed-in person (a check-in, a help request) but never '
      + 'performs one; the proposal is returned as task metadata for the person to confirm in the app.',
    supportedInterfaces: [
      { url: env.A2A_PUBLIC_URL || DEFAULT_URL, protocolBinding: 'JSONRPC', protocolVersion: '1.0' },
    ],
    provider: { organization: 'Towinly', url: 'https://www.towinly.com' },
    version: '0.1.0',
    capabilities: { streaming: false, pushNotifications: false, extendedAgentCard: false },
    securitySchemes: { bearer: { httpAuthSecurityScheme: { scheme: 'bearer', description: 'The A2A_SERVER_KEY the operator set' } } },
    securityRequirements: [{ schemes: { bearer: { list: [] } } }],
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [
      {
        id: 'ask-towinly',
        name: 'Ask Towinly',
        description:
          'Ask anything about using Towinly. Signed in through the server\'s own account, the helper '
          + 'can also answer about that account\'s connections, help requests and family.',
        tags: ['towinly', 'elders', 'helpers', 'trust', 'support'],
        examples: ['How many stages does the trust journey have?', 'Which of my friendships is waiting on me?'],
        inputModes: ['text/plain'],
        outputModes: ['text/plain'],
      },
    ],
  };
}
