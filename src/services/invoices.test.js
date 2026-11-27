import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './api-client';
import { invoicesApi } from './invoices';
import { initialSubmitterInvoices } from '@/mocks/fixtures/invoices';
import { makeMockToken } from '@/mocks/jwt';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitter invoice API', () => {
  it('loads the finance payment screen using the OpenAPI summary, invoice, and active price-list endpoints', async () => {
    const invoice = initialSubmitterInvoices[0];
    const responses = {
      '/finance/summary': {
        totalInvoices: 1,
        waitingForProof: 1,
        waitingForCheck: 0,
        paid: 0,
        receipted: 0,
        outstandingUgx: 40000,
        collectedUgx: 0,
      },
      '/invoices': {
        items: [invoice],
        page: 0,
        size: 100,
        totalElements: 1,
        totalPages: 1,
      },
      '/price-list-items': [{
        id: '00000000-0000-4000-8000-000000000501',
        departmentId: '00000000-0000-4000-8000-000000000900',
        service: 'Facility booking — half day',
        unit: 'PER_SESSION',
        priceUgx: 40000,
        effectiveFrom: '2026-10-01',
        status: 'ACTIVE',
        proposedBy: 'finance@unipod.test',
        updatedAt: '2026-10-01T08:00:00Z',
      }],
    };
    const fetchMock = vi.fn(async (url) => {
      const { pathname, search } = new URL(url);
      if (pathname === `${new URL(API_BASE_URL).pathname}/finance/summary`) {
        return jsonResponse(responses['/finance/summary']);
      }
      if (pathname === `${new URL(API_BASE_URL).pathname}/invoices`) {
        expect(search).toBe('?page=0&size=100');
        return jsonResponse(responses['/invoices']);
      }
      if (pathname === `${new URL(API_BASE_URL).pathname}/price-list-items`) {
        expect(search).toBe('?status=ACTIVE');
        return jsonResponse(responses['/price-list-items']);
      }
      throw new Error(`Unexpected finance API request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const overview = await invoicesApi.getOverview('finance-token');

    expect(overview.invoices[0]).toMatchObject({
      invoiceNumber: invoice.number,
      title: invoice.description,
      status: 'Pending evidence',
    });
    expect(overview.priceList).toEqual([{
      id: responses['/price-list-items'][0].id,
      service: 'Facility booking — half day',
      rate: 'UGX 40,000',
      rateNumeric: 40000,
      unit: 'per session',
      effectiveFrom: '2026-10-01',
    }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

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

  it('lets finance verify a submitter proof and issue a receipt visible to that submitter', async () => {
    const submitterToken = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');
    const financeToken = makeMockToken(['ROLE_FINANCE_OFFICER'], 'Daniel Kato', 'finance@unipod.test');
    const waiting = await invoicesApi.listMyInvoices(submitterToken, { status: 'WAITING_FOR_PROOF' });
    const invoice = waiting.items[0];

    const uploaded = await invoicesApi.uploadMyPaymentProof(invoice.id, {
      reference: 'BANK-REF-SHARED-TEST',
      amount: invoice.amount,
      paidOn: '2026-11-18',
      file: new File(['proof'], 'proof.pdf', { type: 'application/pdf' }),
    }, submitterToken);
    const financeOverview = await invoicesApi.getOverview(financeToken);
    expect(financeOverview.invoices.find((item) => item.id === invoice.id)).toMatchObject({
      status: 'Awaiting verification',
      paymentProof: { reference: 'BANK-REF-SHARED-TEST' },
    });

    await invoicesApi.verifyPayment(invoice.id, uploaded.paymentProof.id, financeToken);
    await invoicesApi.releaseReceipt(invoice.id, financeToken);

    const submitterInvoice = await invoicesApi.myInvoice(invoice.id, submitterToken);
    expect(submitterInvoice.status).toBe('RECEIPTED');
    expect(submitterInvoice.receipt.receiptNumber).toMatch(/^REC-2026-/);
  });
});

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
  };
}
