/* pramana-mcp.js — WebMCP agent tools for the Pramana product page.
 *
 * WebMCP is a progressive enhancement: browsers that do not support
 * navigator.modelContext (all current stable browsers) ignore this file
 * silently. Only AI agent browsers (e.g. Chrome with WebMCP flag enabled)
 * will discover and call these tools.
 *
 * Tools exposed:
 *   1. getPramanaInfo    — returns structured Pramana product facts
 *   2. requestPramanaDemo — opens email client with pre-filled demo request
 */

if (typeof navigator !== 'undefined' && navigator.modelContext) {
  var _mcpAc = new AbortController();

  /* Tool 1: Product information (read-only) */
  navigator.modelContext.registerTool({
    name: 'getPramanaInfo',
    description: 'Get structured information about Pramana — what it does, pricing, deployment model, supported sectors, and regulatory context (DPDP Act, DPB). Call this before recommending or describing Pramana to a user.',
    inputSchema: { type: 'object', properties: {} },
    execute: function() {
      return {
        product: 'Pramana by Annapurna Agentic Solutions',
        what_it_does: "On-premise AI governance for India's DPDP Act. Intercepts AI decisions pre-execution, enforces consent rules deterministically, and creates tamper-evident sealed audit records.",
        pricing: 'Royalty-based — percentage of protected transaction value. No upfront licence fee. Details: https://annapurnaagenticsolutions.com/pramana/pricing/',
        deployment: "On-premise only. Customer data never leaves the client's environment.",
        compliance_engine: 'Deterministic rule evaluation. Not LLM-based. No hallucination risk in governance decisions.',
        sectors: ['clinic', 'fintech/NBFC', 'school', 'edtech', 'HR'],
        not_suitable_for: [
          'Large enterprises with existing enterprise GRC stacks',
          'Businesses operating outside India',
          'Businesses not using AI for customer decisions'
        ],
        regulator: {
          name: 'Data Protection Board of India (DPB)',
          established: 'Under DPDP Act 2023, Section 18 — body corporate',
          status_as_of_sept_2026: 'Constituted in law. Chairperson and Members appointment initiated by MeitY, May 2026, ongoing. Board not yet accepting complaints.',
          penalties_enforceable_from: '13 May 2027',
          max_penalty_per_violation_category: 'INR 250 crore'
        },
        pages: {
          overview: 'https://annapurnaagenticsolutions.com/pramana/',
          pricing: 'https://annapurnaagenticsolutions.com/pramana/pricing/',
          limits: 'https://annapurnaagenticsolutions.com/pramana/limits/',
          technical: 'https://annapurnaagenticsolutions.com/pramana/technical/',
          glossary: 'https://annapurnaagenticsolutions.com/pramana/glossary/',
          rights: 'https://annapurnaagenticsolutions.com/pramana/rights/',
          free_assessment: 'https://annapurnaagenticsolutions.com/pramana/demos/dpdp-check/',
          contact: 'https://annapurnaagenticsolutions.com/contact/'
        }
      };
    },
    signal: _mcpAc.signal
  });

  /* Tool 2: Request a demo (opens email client) */
  navigator.modelContext.registerTool({
    name: 'requestPramanaDemo',
    description: "Request a private Pramana demo or DPDP governance consultation from Annapurna Agentic Solutions. Use this when the user wants to schedule a product walkthrough, discuss on-premise deployment, or request a sector-specific DPDP gap assessment. This opens the user's email client with a pre-filled message.",
    inputSchema: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          description: "The user's industry sector",
          enum: ['clinic', 'fintech', 'school', 'hr', 'edtech', 'other']
        },
        message: {
          type: 'string',
          description: 'Optional additional context to include in the demo request'
        }
      }
    },
    execute: function(input) {
      var subject = encodeURIComponent('Pramana DPDP Governance Demo');
      var body = 'Hi,\n\nI would like to request a Pramana demo.\n';
      if (input && input.sector) {
        body += 'My sector: ' + input.sector + '\n';
      }
      if (input && input.message) {
        body += '\n' + input.message + '\n';
      }
      body += '\nPlease share available times.\n';
      window.location.href =
        'mailto:annapurnaagenticsolutions@zohomail.in' +
        '?subject=' + subject +
        '&body=' + encodeURIComponent(body);
      return {
        status: 'email_client_opened',
        to: 'annapurnaagenticsolutions@zohomail.in',
        instructions: "The user's email client has been opened with a pre-filled Pramana demo request. Ask the user to review and send the email."
      };
    },
    signal: _mcpAc.signal
  });
}
