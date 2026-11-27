import { z } from 'zod';
import { initialRules } from '@/mocks/fixtures/rules';

/**
 * Rule-content CRUD is not part of the deployed backend contract. The rules
 * manager uses this in-memory store only when the explicit mock API is on.
 */
export const ruleScopeSchema = z.enum(['GENERAL', 'SECTOR']);

export const ruleSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  scope: ruleScopeSchema,
  scopeId: z.string().nullable(),
  mustAccept: z.boolean(),
  version: z.number(),
  published: z.boolean(),
  updatedAt: z.string(),
});

const unavailableMessage = 'Rule management is unavailable because the backend rule-content API is not deployed.';
const storageKey = 'unipod.rules.v1';
let mockRules = initialRules.map((rule) => ({ ...rule }));

function assertMockMode() {
  if (import.meta.env.MODE !== 'test' && import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    throw new Error(unavailableMessage);
  }
}

function currentMockRules() {
  if (import.meta.env.MODE === 'test' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return z.array(ruleSchema).parse(JSON.parse(raw));
    } catch {
      // Test fixtures may seed invalid or stale data; use the in-memory mock instead.
    }
  }
  return mockRules;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function resetMockRules() {
  mockRules = initialRules.map((rule) => ({ ...rule }));
}

export const rulesApi = {
  async list() {
    assertMockMode();
    return currentMockRules().map((rule) => ({ ...rule }));
  },

  async create(body) {
    assertMockMode();
    const newRule = ruleSchema.parse({
      id: `rule-${Date.now()}`,
      scope: 'GENERAL',
      scopeId: null,
      mustAccept: false,
      published: false,
      version: 1,
      updatedAt: today(),
      ...body,
    });
    mockRules = [...mockRules, newRule];
    return newRule;
  },

  async update(id, body) {
    assertMockMode();
    const index = mockRules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new Error('This rule no longer exists.');
    const updatedRule = ruleSchema.parse({
      ...mockRules[index],
      ...body,
      version: mockRules[index].version + 1,
      updatedAt: today(),
    });
    mockRules = mockRules.map((rule, currentIndex) => currentIndex === index ? updatedRule : rule);
    return updatedRule;
  },

  async retire(id) {
    assertMockMode();
    const index = mockRules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new Error('This rule no longer exists.');
    const updatedRule = { ...mockRules[index], published: false, updatedAt: today() };
    mockRules = mockRules.map((rule, currentIndex) => currentIndex === index ? updatedRule : rule);
    return updatedRule;
  },
};
