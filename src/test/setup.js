if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
if (!Map.groupBy) {
  Map.groupBy = function (items, keySelector) {
    const map = new Map();
    for (const item of items) {
      const key = keySelector(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  };
}
if (!Object.groupBy) {
  Object.groupBy = function (items, keySelector) {
    const obj = {};
    for (const item of items) {
      const key = keySelector(item);
      if (!obj[key]) obj[key] = [];
      obj[key].push(item);
    }
    return obj;
  };
}
if (!Set.prototype.intersection) {
  Set.prototype.intersection = function (other) {
    const result = new Set();
    for (const elem of other) {
      if (this.has(elem)) result.add(elem);
    }
    return result;
  };
}
if (!Set.prototype.union) {
  Set.prototype.union = function (other) {
    const result = new Set(this);
    for (const elem of other) result.add(elem);
    return result;
  };
}
if (!Set.prototype.difference) {
  Set.prototype.difference = function (other) {
    const result = new Set();
    for (const elem of this) {
      if (!other.has(elem)) result.add(elem);
    }
    return result;
  };
}

import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/server';

configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
