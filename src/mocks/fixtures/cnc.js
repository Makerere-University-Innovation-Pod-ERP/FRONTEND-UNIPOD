const at = (stage, by, notes, when) => ({ stage, by, notes, at: when });

const job = (overrides) => ({
  department: 'CNC',
  customerId: 'cnc@unipod.test',
  quantity: 1,
  dateNeeded: '2027-02-15',
  acceptedRulesVersion: null,
  quote: null,
  quoteSubmittedAt: null,
  quotedBy: null,
  invoiceId: null,
  invoiceStatus: null,
  materialsUsed: null,
  paymentConfirmedAt: null,
  machineTimeUsed: null,
  qualityChecklist: null,
  collectionSignature: null,
  createdBy: 'cnc@unipod.test',
  createdAt: '2026-11-10T08:00:00Z',
  updatedAt: '2026-11-10T08:00:00Z',
  ...overrides,
});

export const initialCncJobs = [
  job({
    id: 'cnc-1',
    code: 'ORD-CNC-2026-000001',
    title: 'Laser-cut display stand',
    stage: 'NEW',
    specs: { whatIsMade: 'Laser-cut display stand', customerName: 'Joan Nakazzi', customerType: 'Student', material: 'Plywood', size: '600 × 400 × 6 mm', designLink: 'https://example.org/stand.dxf' },
    stageHistory: [at('NEW', 'cnc@unipod.test', 'Order created', '2026-11-10T08:00:00Z')],
  }),
  job({
    id: 'cnc-2',
    code: 'ORD-CNC-2026-000002',
    title: 'Harvesting-kit frame',
    stage: 'PAYMENT_GATE',
    specs: { whatIsMade: 'Harvesting-kit frame', customerName: 'Allan Tumwesigye', customerType: 'Business', material: 'Hardwood', size: '1200 × 800 mm' },
    quote: { amount: 450000, description: 'Frame' },
    invoiceId: 'inv-cnc-2',
    invoiceStatus: 'PAID',
    stageHistory: [at('NEW', 'cnc@unipod.test', 'Order created', '2026-11-09T08:00:00Z'), at('PAYMENT_GATE', 'cnc@unipod.test', 'Quote sent to the customer.', '2026-11-09T10:00:00Z')],
  }),
  job({
    id: 'cnc-3',
    code: 'ORD-CNC-2026-000003',
    title: 'Acrylic name plates',
    stage: 'PAYMENT_GATE',
    quantity: 20,
    specs: { whatIsMade: 'Acrylic name plates', customerName: 'Grace Namuli', customerType: 'Member of the public', material: 'Acrylic', size: '200 × 60 mm' },
    quote: { amount: 120000, description: 'Name plates' },
    invoiceId: 'inv-cnc-3',
    invoiceStatus: 'WAITING_FOR_PROOF',
    stageHistory: [at('NEW', 'cnc@unipod.test', 'Order created', '2026-11-08T08:00:00Z')],
  }),
  job({
    id: 'cnc-4',
    code: 'ORD-CNC-2026-000004',
    title: 'Workshop stool set',
    stage: 'IN_PRODUCTION',
    quantity: 4,
    specs: { whatIsMade: 'Workshop stool set', customerName: 'Daniel Kato', customerType: 'Student', material: 'Softwood', size: '450 mm high' },
    quote: { amount: 300000 },
    invoiceId: 'inv-cnc-4',
    invoiceStatus: 'PAID',
    stageHistory: [at('NEW', 'cnc@unipod.test', 'Order created', '2026-11-05T08:00:00Z'), at('IN_PRODUCTION', 'cnc@unipod.test', 'Production started.', '2026-11-07T08:00:00Z')],
  }),
];

export const initialCncPrices = [
  { id: 'price-cnc-router', departmentId: 'd1a7c6f0-0000-4000-8000-000000000002', service: 'CNC router time', unit: 'PER_HOUR', priceUgx: 15000, effectiveFrom: '2026-10-01', status: 'ACTIVE', proposedBy: 'robinson@unipod.test', updatedAt: '2026-10-01T08:00:00Z' },
  { id: 'price-laser', departmentId: 'd1a7c6f0-0000-4000-8000-000000000002', service: 'Laser cutting', unit: 'PER_ITEM', priceUgx: 25000, effectiveFrom: '2026-10-01', status: 'ACTIVE', proposedBy: 'robinson@unipod.test', updatedAt: '2026-10-01T08:00:00Z' },
];
