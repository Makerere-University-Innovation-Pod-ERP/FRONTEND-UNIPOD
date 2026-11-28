import { z } from 'zod';
import { initialRules } from '@/mocks/fixtures/rules';
import { request } from './api-client';

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

const storageKey = 'unipod.rules.v1';
let mockRules = initialRules.map((rule) => ({ ...rule }));

function shouldUseBackend() {
  return import.meta.env.MODE !== 'test' && import.meta.env.VITE_ENABLE_MOCKS !== 'true';
}

function currentMockRules() {
  if (import.meta.env.MODE === 'test' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return z.array(ruleSchema).parse(JSON.parse(raw));
    } catch {
      return mockRules;
    }
  }
  return mockRules;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseList(value) {
  return z.array(ruleSchema).parse(value);
}

function parseOne(value) {
  return ruleSchema.parse(value);
}

export function resetMockRules() {
  mockRules = initialRules.map((rule) => ({ ...rule }));
}

export const rulesApi = {
  async list(token) {
    if (shouldUseBackend()) return parseList(await request('/rules', { token }));
    return currentMockRules().map((rule) => ({ ...rule }));
  },

  async create(token, body) {
    if (shouldUseBackend()) {
      return parseOne(await request('/rules', { token, body }));
    }
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

  async update(token, id, body) {
    if (shouldUseBackend()) {
      return parseOne(await request(`/rules/${encodeURIComponent(id)}`, { token, method: 'PATCH', body }));
    }
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

  async retire(token, id) {
    if (shouldUseBackend()) {
      return parseOne(await request(`/rules/${encodeURIComponent(id)}/retire`, { token, body: {} }));
    }
    const index = mockRules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new Error('This rule no longer exists.');
    const updatedRule = { ...mockRules[index], published: false, updatedAt: today() };
    mockRules = mockRules.map((rule, currentIndex) => currentIndex === index ? updatedRule : rule);
    return updatedRule;
  },
};
