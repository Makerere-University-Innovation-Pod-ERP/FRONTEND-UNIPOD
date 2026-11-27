/**
 * Test-only: lets multipart uploads (FormData with files) reach the MSW mock
 * handlers under jsdom. Never loaded by the app — real browsers don't need it.
 *
 * jsdom ships its own Blob/File, which Node's built-in fetch cannot read, so
 * file parts are sent empty. And Node's multipart parser builds parts with the
 * global File (jsdom's here), then rejects them, so `request.formData()` in a
 * handler throws "Premature close". Two small fixes:
 *
 *   1. Before a request leaves fetch, file parts are copied into Node's own
 *      FormData/File (the bytes are read with jsdom's FileReader).
 *   2. While a request body is being parsed, Node's File/Blob are swapped in.
 *
 * Registered after src/test/setup.js (see vitest.config.js) so the fetch
 * wrapper sits outside MSW's interceptor installed by `server.listen()`.
 */
import { afterAll, beforeAll } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

const isJsdom = typeof window !== 'undefined' && typeof FileReader !== 'undefined';

function readBytes(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

async function toNodeFormData(formData, NodeFormData) {
  const copy = new NodeFormData();
  for (const [name, value] of formData.entries()) {
    if (typeof value === 'string') copy.append(name, value);
    else copy.append(name, new NodeFile([await readBytes(value)], value.name ?? 'blob', { type: value.type }));
  }
  return copy;
}

if (isJsdom) {
  let originalFetch;
  let originalFormData;

  beforeAll(async () => {
    // Node's FormData constructor (the global one is jsdom's in this environment).
    const NodeFormData = (await new Response(new URLSearchParams('a=1')).formData()).constructor;

    originalFetch = globalThis.fetch;
    const mswFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (init?.body instanceof FormData) {
        return mswFetch(input, { ...init, body: await toNodeFormData(init.body, NodeFormData) });
      }
      return mswFetch(input, init);
    };

    originalFormData = Request.prototype.formData;
    Request.prototype.formData = async function formData() {
      const saved = [globalThis.File, globalThis.Blob];
      const JsdomFile = globalThis.File;
      globalThis.File = NodeFile;
      globalThis.Blob = NodeBlob;
      try {
        const parsed = await originalFormData.call(this);
        [globalThis.File, globalThis.Blob] = saved;
        const copy = new FormData();
        for (const [name, value] of parsed.entries()) {
          if (typeof value === 'string') {
            copy.append(name, value);
          } else {
            const bytes = await value.arrayBuffer();
            copy.append(name, new JsdomFile([bytes], value.name ?? 'blob', {
              type: value.type,
              lastModified: value.lastModified,
            }));
          }
        }
        return copy;
      } finally {
        [globalThis.File, globalThis.Blob] = saved;
      }
    };
  });

  afterAll(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
    if (originalFormData) Request.prototype.formData = originalFormData;
  });
}
