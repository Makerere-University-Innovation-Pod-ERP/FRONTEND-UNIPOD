import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

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

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
