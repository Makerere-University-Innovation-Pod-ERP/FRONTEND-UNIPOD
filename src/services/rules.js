import { z } from 'zod';
import { initialRules } from '@/mocks/fixtures/rules';

/**
 * Department Rules Manager (Assignment 12). Per the integration guide
 * (§5.12): an exhaustive search of the backend's OpenAPI contract and Java
 * source found zero /rules endpoints, controllers, services, or DTOs
 * anywhere — the backend's entire concept of "rules" is an opaque version
 * string submitted alongside a request (acceptedRulesVersion / rulesVersion),
 * never rule content. Of the two paths the guide lays out, this resolves on
 * Path 1: rule content stays entirely frontend-managed, persisted in the
 * browser, rather than pretending a backend endpoint exists — calling
 * request('/rules', ...) against the real deployed backend would 404 on
 * every operation. Building real rule-content CRUD (Path 2) is a
 * backend-team decision to revisit, not something to fake from here.
 */
const STORAGE_KEY = 'unipod.rules.v1';

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...initialRules];
    return z.array(ruleSchema).parse(JSON.parse(raw));
  } catch {
    return [...initialRules];
  }
}

function save(rules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Storage can be unavailable (private browsing, quota) — the in-memory
    // result still reaches the caller; it just won't persist a reload.
  }
}

export const rulesApi = {
  async list() {
    return load();
  },

  async create(body) {
    const rules = load();
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
    save([...rules, newRule]);
    return newRule;
  },

  async update(id, body) {
    const rules = load();
    const index = rules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new Error('This rule no longer exists.');
    const updatedRule = ruleSchema.parse({
      ...rules[index],
      ...body,
      version: rules[index].version + 1,
      updatedAt: today(),
    });
    const updated = [...rules];
    updated[index] = updatedRule;
    save(updated);
    return updatedRule;
  },

  async retire(id) {
    const rules = load();
    const index = rules.findIndex((rule) => rule.id === id);
    if (index === -1) throw new Error('This rule no longer exists.');
    const updatedRule = { ...rules[index], published: false, updatedAt: today() };
    const updated = [...rules];
    updated[index] = updatedRule;
    save(updated);
    return updatedRule;
  },
};
