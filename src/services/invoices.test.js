import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './api-client';
import { invoicesApi } from './invoices';
import { initialSubmitterInvoices } from '@/mocks/fixtures/invoices';
import { makeMockToken } from '@/mocks/jwt';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitter invoice API', () => {
  it('lists only the requested submitter invoice status and reads an owned invoice', async () => {
    const token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');
    const page = await invoicesApi.listMyInvoices(token, {
      page: 0,
      size: 25,
      status: 'WAITING_FOR_CHECK',
    });

    expect(page.items.map((invoice) => invoice.number)).toEqual(['INV-2026-198']);
    expect((await invoicesApi.myInvoice(page.items[0].id, token)).paymentProof.reference)
      .toBe('BANK-REF-2026-114');

    const anotherSubmitter = makeMockToken(['ROLE_SUBMITTER'], 'another.user', 'another@unipod.test');
    expect((await invoicesApi.listMyInvoices(anotherSubmitter)).totalElements).toBe(0);
    await expect(invoicesApi.myInvoice(page.items[0].id, anotherSubmitter))
      .rejects.toMatchObject({ status: 404 });
  });

  it('uploads payment evidence as the OpenAPI multipart form', async () => {
    const invoice = initialSubmitterInvoices[0];
    const uploadedInvoice = {
      ...invoice,
      status: 'WAITING_FOR_CHECK',
      statusLabel: 'Payment evidence under review',
      paymentProof: {
        id: '00000000-0000-4000-8000-000000000304',
        reference: 'BANK-REF-TEST',
        amount: invoice.amount,
        paidOn: '2026-11-18',
        status: 'PENDING',
        uploadedBy: invoice.customerEmail,
        uploadedAt: '2026-11-18T12:00:00Z',
      },
    };
    const fetchMock = vi.fn(async (_url, options) => {
      expect(_url).toBe(`${API_BASE_URL}/me/invoices/${invoice.id}/proof`);
      expect(options.method).toBe('POST');
      expect(options.headers.get('Authorization')).toBe('Bearer submitter-token');
      expect(options.headers.has('Content-Type')).toBe(false);
      expect(options.body.get('reference')).toBe('BANK-REF-TEST');
      expect(options.body.get('amount')).toBe(String(invoice.amount));
      expect(options.body.get('paidOn')).toBe('2026-11-18');
      expect(options.body.get('file').name).toBe('proof.pdf');
      return {
        ok: true,
        status: 201,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => uploadedInvoice,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await invoicesApi.uploadMyPaymentProof(invoice.id, {
      reference: 'BANK-REF-TEST',
      amount: invoice.amount,
      paidOn: '2026-11-18',
      file: new File(['proof'], 'proof.pdf', { type: 'application/pdf' }),
    }, 'submitter-token');

    expect(result.status).toBe('WAITING_FOR_CHECK');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('downloads invoice PDFs, payment proof, and both receipt formats through submitter routes', async () => {
    const [invoice, proofInvoice, receiptedInvoice] = initialSubmitterInvoices;
    const token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');

    expect((await invoicesApi.downloadMyInvoicePdf(invoice.id, token)).size).toBeGreaterThan(0);
    expect((await invoicesApi.downloadMyPaymentProof(proofInvoice.id, token)).size).toBeGreaterThan(0);
    expect((await invoicesApi.downloadMyReceiptPdf(receiptedInvoice.id, token)).size).toBeGreaterThan(0);
    expect((await invoicesApi.downloadMyReceipt(receiptedInvoice.id, token)).size).toBeGreaterThan(0);
  });
});
