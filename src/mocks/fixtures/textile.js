import { addDays, startOfWeek, toIsoDate } from '@/lib/textile';

/**
 * Sample Textile Operations data, taken from the Textile Domain Owner screen
 * designs (TXO-2026-011 … 015, the stock list, the machine list). Bookings are
 * placed relative to the current week so the calendar always has content.
 */

export const defaultQualityChecklist = () => [
  { id: 'stitching', label: 'Stitching even, no loose threads', checked: false },
  { id: 'design', label: 'Design and measurements match the approved order', checked: false },
  { id: 'press', label: 'Final press and fold', checked: false },
];

const emptyProduction = () => ({ materialUsed: '', machineId: null, staff: '', notes: '' });
const noPayment = () => ({ status: 'NOT_REQUESTED', reference: null, confirmedAt: null });

export const priceList = [
  { id: 'price-curtain', label: 'Curtain set — 3 lined panels', unit: 'set', unitPrice: 185000, leadDays: 7 },
  { id: 'price-sash', label: 'Graduation sash, embroidered', unit: 'piece', unitPrice: 25000, leadDays: 5 },
  { id: 'price-tote', label: 'Canvas tote bag, woven label', unit: 'bag', unitPrice: 12000, leadDays: 10 },
  { id: 'price-workwear', label: 'Branded workwear set', unit: 'set', unitPrice: 65000, leadDays: 14 },
  { id: 'price-apron', label: 'Market vendor apron', unit: 'piece', unitPrice: 18000, leadDays: 3 },
  { id: 'price-alteration', label: 'Alteration / repair (per hour)', unit: 'hour', unitPrice: 15000, leadDays: 2 },
];

export const stockItems = [
  { id: 'stk-cotton', name: 'Cotton fabric (metres)', unit: 'metres', quantity: 86, minimum: 30, location: 'Textile Workshop store' },
  { id: 'stk-lining', name: 'Blackout lining (metres)', unit: 'metres', quantity: 24, minimum: 10, location: 'Textile Workshop store' },
  { id: 'stk-thread', name: 'Polyester thread (spools)', unit: 'spools', quantity: 14, minimum: 20, location: 'Textile Workshop store' },
  { id: 'stk-labels', name: 'Branded woven labels', unit: 'pcs', quantity: 220, minimum: 100, location: 'Textile Workshop store' },
  { id: 'stk-zips', name: 'Zips — assorted (pcs)', unit: 'pcs', quantity: 9, minimum: 15, location: 'Textile Workshop store' },
  { id: 'stk-canvas', name: 'Canvas (metres)', unit: 'metres', quantity: 42, minimum: 20, location: 'Textile Workshop store' },
];

export const machines = [
  { id: 'mch-sew-1', name: 'Industrial Sewing Machine #1', state: 'WORKING', note: 'Serviced 3 Oct', updatedAt: '2026-10-03' },
  { id: 'mch-sew-2', name: 'Industrial Sewing Machine #2', state: 'WORKING', note: '', updatedAt: '2026-09-21' },
  { id: 'mch-overlock', name: 'Overlock Machine', state: 'BEING_REPAIRED', note: 'Timing belt replacement, ETA 14 Nov', updatedAt: '2026-11-02' },
  { id: 'mch-cutting', name: 'Fabric Cutting Table', state: 'WORKING', note: '', updatedAt: '2026-08-14' },
  { id: 'mch-embroidery', name: 'Embroidery Machine', state: 'WORKING', note: '', updatedAt: '2026-10-28' },
];

export const textileManagers = ['Workshop Manager — Daniel Okello', 'Operations Manager — Sarah Namubiru'];

function history(entries) {
  return entries.map(([status, by, at, note = null]) => ({ status, by, at, note }));
}

export const orders = [
  {
    id: 'TXO-2026-015',
    code: 'TXO-2026-015',
    customerName: 'Robert Ssali',
    customerType: 'Public',
    whatIsWanted: 'Custom curtain set, living room',
    quantity: '1 set (3 panels)',
    sizeDesign: 'Standard window, navy blue, blackout lining',
    dateNeeded: '2026-11-24',
    photo: { name: 'design-reference.jpg', url: null },
    rulesAccepted: true,
    status: 'NEW',
    createdAt: '2026-11-10T09:12:00Z',
    updatedAt: '2026-11-10T09:12:00Z',
    estimate: {
      materials: [
        { itemId: 'stk-cotton', quantity: 9 },
        { itemId: 'stk-lining', quantity: 3 },
        { itemId: 'stk-thread', quantity: 1 },
      ],
      priceListItemId: 'price-curtain',
      priceQuantity: 1,
    },
    quote: null,
    payment: noPayment(),
    production: emptyProduction(),
    qualityChecklist: defaultQualityChecklist(),
    collection: null,
    history: history([['NEW', 'Reception — Agnes Kirabo', '2026-11-10T09:12:00Z', 'Checked and forwarded by reception']]),
  },
  {
    id: 'TXO-2026-016',
    code: 'TXO-2026-016',
    customerName: 'Makerere Drama Society',
    customerType: 'Student',
    whatIsWanted: 'Stage costume alterations',
    quantity: '6 hours',
    sizeDesign: 'Hem and take in 8 costumes per fitting notes',
    dateNeeded: '2026-11-20',
    photo: null,
    rulesAccepted: true,
    status: 'QUOTED',
    createdAt: '2026-11-04T11:00:00Z',
    updatedAt: '2026-11-09T15:40:00Z',
    estimate: { materials: [{ itemId: 'stk-thread', quantity: 2 }], priceListItemId: 'price-alteration', priceQuantity: 6 },
    quote: {
      amount: 90000, currency: 'UGX', priceListItemId: 'price-alteration', priceQuantity: 6,
      expectedCompletion: '2026-11-18', sentAt: '2026-11-05T10:20:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'CONFIRMED', reference: 'FIN-PAY-0412', confirmedAt: '2026-11-09T15:40:00Z' },
    production: emptyProduction(),
    qualityChecklist: defaultQualityChecklist(),
    collection: null,
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-11-04T11:00:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-11-05T10:20:00Z', 'Quote UGX 90,000 sent'],
    ]),
  },
  {
    id: 'TXO-2026-017',
    code: 'TXO-2026-017',
    customerName: 'Kampala Bakers Co-op',
    customerType: 'Company',
    whatIsWanted: 'Branded aprons for bakery staff',
    quantity: '12 aprons',
    sizeDesign: 'Adjustable neck, logo on chest pocket',
    dateNeeded: '2026-12-01',
    photo: { name: 'logo.png', url: null },
    rulesAccepted: true,
    status: 'QUOTED',
    createdAt: '2026-11-06T08:30:00Z',
    updatedAt: '2026-11-07T09:00:00Z',
    estimate: { materials: [{ itemId: 'stk-cotton', quantity: 12 }, { itemId: 'stk-labels', quantity: 12 }], priceListItemId: 'price-apron', priceQuantity: 12 },
    quote: {
      amount: 216000, currency: 'UGX', priceListItemId: 'price-apron', priceQuantity: 12,
      expectedCompletion: '2026-11-21', sentAt: '2026-11-07T09:00:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'AWAITING_PROOF', reference: null, confirmedAt: null },
    production: emptyProduction(),
    qualityChecklist: defaultQualityChecklist(),
    collection: null,
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-11-06T08:30:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-11-07T09:00:00Z', 'Quote UGX 216,000 sent'],
    ]),
  },
  {
    id: 'TXO-2026-013',
    code: 'TXO-2026-013',
    customerName: 'Esther Achieng',
    customerType: 'Student',
    whatIsWanted: 'Graduation sash set',
    quantity: '4 sashes',
    sizeDesign: 'CoCIS colours, embroidered names',
    dateNeeded: '2026-11-19',
    photo: null,
    rulesAccepted: true,
    status: 'SCHEDULED',
    createdAt: '2026-10-29T10:00:00Z',
    updatedAt: '2026-11-06T12:00:00Z',
    estimate: { materials: [{ itemId: 'stk-cotton', quantity: 2 }], priceListItemId: 'price-sash', priceQuantity: 4 },
    quote: {
      amount: 100000, currency: 'UGX', priceListItemId: 'price-sash', priceQuantity: 4,
      expectedCompletion: '2026-11-14', sentAt: '2026-10-30T09:00:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'CONFIRMED', reference: 'FIN-PAY-0398', confirmedAt: '2026-11-06T11:45:00Z' },
    production: { materialUsed: '', machineId: 'mch-embroidery', staff: 'Grace the tailor', notes: '' },
    qualityChecklist: defaultQualityChecklist(),
    collection: null,
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-10-29T10:00:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-10-30T09:00:00Z'],
      ['SCHEDULED', 'Faith Nabwire', '2026-11-06T12:00:00Z', 'Payment FIN-PAY-0398 confirmed'],
    ]),
  },
  {
    id: 'TXO-2026-014',
    code: 'TXO-2026-014',
    customerName: 'Innovation Hub Craft Shop',
    customerType: 'Internal',
    whatIsWanted: 'Branded tote bags ×50',
    quantity: '50 bags',
    sizeDesign: '38 × 42 cm canvas, woven label on front',
    dateNeeded: '2026-11-17',
    photo: { name: 'tote-mockup.jpg', url: null },
    rulesAccepted: true,
    status: 'BEING_MADE',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-11-08T14:30:00Z',
    estimate: { materials: [{ itemId: 'stk-canvas', quantity: 18 }, { itemId: 'stk-labels', quantity: 50 }], priceListItemId: 'price-tote', priceQuantity: 50 },
    quote: {
      amount: 600000, currency: 'UGX', priceListItemId: 'price-tote', priceQuantity: 50,
      expectedCompletion: '2026-11-15', sentAt: '2026-10-21T09:00:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'CONFIRMED', reference: 'FIN-PAY-0377', confirmedAt: '2026-10-24T16:00:00Z' },
    production: {
      materialUsed: '18 metres canvas, 50 woven labels',
      machineId: 'mch-sew-1',
      staff: 'Grace the tailor',
      notes: 'Customer confirmed logo placement by WhatsApp',
    },
    qualityChecklist: [
      { id: 'stitching', label: 'Stitching even, no loose threads', checked: true },
      { id: 'design', label: 'Logo placement matches approved design', checked: true },
      { id: 'press', label: 'Final press and fold', checked: false },
    ],
    collection: null,
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-10-20T10:00:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-10-21T09:00:00Z'],
      ['SCHEDULED', 'Faith Nabwire', '2026-10-24T16:30:00Z'],
      ['BEING_MADE', 'Faith Nabwire', '2026-11-08T14:30:00Z'],
    ]),
  },
  {
    id: 'TXO-2026-012',
    code: 'TXO-2026-012',
    customerName: 'EcoBuild Uganda Ltd',
    customerType: 'Company',
    whatIsWanted: 'Branded workwear ×20',
    quantity: '20 sets',
    sizeDesign: 'Mixed sizes per attached list, reflective strip',
    dateNeeded: '2026-11-12',
    photo: null,
    rulesAccepted: true,
    status: 'READY',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-11-09T17:00:00Z',
    estimate: { materials: [{ itemId: 'stk-cotton', quantity: 40 }], priceListItemId: 'price-workwear', priceQuantity: 20 },
    quote: {
      amount: 1300000, currency: 'UGX', priceListItemId: 'price-workwear', priceQuantity: 20,
      expectedCompletion: '2026-11-10', sentAt: '2026-10-11T09:00:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'CONFIRMED', reference: 'FIN-PAY-0351', confirmedAt: '2026-10-14T10:00:00Z' },
    production: { materialUsed: '40 metres cotton drill, 20 reflective strips', machineId: 'mch-sew-2', staff: 'Grace the tailor, Peter M.', notes: '' },
    qualityChecklist: defaultQualityChecklist().map((item) => ({ ...item, checked: true })),
    collection: null,
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-10-10T10:00:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-10-11T09:00:00Z'],
      ['SCHEDULED', 'Faith Nabwire', '2026-10-14T10:30:00Z'],
      ['BEING_MADE', 'Faith Nabwire', '2026-10-20T08:00:00Z'],
      ['READY', 'Faith Nabwire', '2026-11-09T17:00:00Z'],
    ]),
  },
  {
    id: 'TXO-2026-011',
    code: 'TXO-2026-011',
    customerName: 'Night Namata',
    customerType: 'Public',
    whatIsWanted: 'Market vendor apron',
    quantity: '1 apron',
    sizeDesign: 'Two front pockets, kitenge print',
    dateNeeded: '2026-11-05',
    photo: null,
    rulesAccepted: true,
    status: 'COLLECTED',
    createdAt: '2026-10-27T10:00:00Z',
    updatedAt: '2026-11-05T11:20:00Z',
    estimate: { materials: [{ itemId: 'stk-cotton', quantity: 1.5 }], priceListItemId: 'price-apron', priceQuantity: 1 },
    quote: {
      amount: 18000, currency: 'UGX', priceListItemId: 'price-apron', priceQuantity: 1,
      expectedCompletion: '2026-11-03', sentAt: '2026-10-27T15:00:00Z', sentBy: 'Faith Nabwire',
    },
    payment: { status: 'CONFIRMED', reference: 'FIN-PAY-0369', confirmedAt: '2026-10-28T09:00:00Z' },
    production: { materialUsed: '1.5 metres kitenge cotton', machineId: 'mch-sew-2', staff: 'Peter M.', notes: '' },
    qualityChecklist: defaultQualityChecklist().map((item) => ({ ...item, checked: true })),
    collection: { collectedBy: 'Night Namata', collectedAt: '2026-11-05T11:20:00Z', recordedBy: 'Faith Nabwire' },
    history: history([
      ['NEW', 'Reception — Agnes Kirabo', '2026-10-27T10:00:00Z'],
      ['QUOTED', 'Faith Nabwire', '2026-10-27T15:00:00Z'],
      ['SCHEDULED', 'Faith Nabwire', '2026-10-28T09:30:00Z'],
      ['BEING_MADE', 'Faith Nabwire', '2026-10-30T08:00:00Z'],
      ['READY', 'Faith Nabwire', '2026-11-03T16:00:00Z'],
      ['COLLECTED', 'Faith Nabwire', '2026-11-05T11:20:00Z', 'Collected by Night Namata'],
    ]),
  },
];

const today = toIsoDate(new Date());
const monday = startOfWeek(today);

export const stockMovements = [
  { id: 'mv-11', itemId: 'stk-canvas', itemName: 'Canvas (metres)', type: 'USED_ON_ORDER', quantity: 18, balanceAfter: 42, orderId: 'TXO-2026-014', orderCode: 'TXO-2026-014', note: '', by: 'Faith Nabwire', at: `${addDays(monday, 0)}T09:10:00Z` },
  { id: 'mv-10', itemId: 'stk-labels', itemName: 'Branded woven labels', type: 'USED_ON_ORDER', quantity: 50, balanceAfter: 220, orderId: 'TXO-2026-014', orderCode: 'TXO-2026-014', note: '', by: 'Faith Nabwire', at: `${addDays(monday, 0)}T09:05:00Z` },
  { id: 'mv-09', itemId: 'stk-cotton', itemName: 'Cotton fabric (metres)', type: 'RECEIVED', quantity: 60, balanceAfter: 86, orderId: null, orderCode: null, note: 'Delivery note DN-2231', by: 'Faith Nabwire', at: `${addDays(monday, -3)}T14:00:00Z` },
  { id: 'mv-08', itemId: 'stk-zips', itemName: 'Zips — assorted (pcs)', type: 'CORRECTION', quantity: -3, balanceAfter: 9, orderId: null, orderCode: null, note: 'Recount — 3 damaged zips discarded', by: 'Faith Nabwire', at: `${addDays(monday, -4)}T16:30:00Z` },
];

export const classTimetable = [
  { id: 'tt-1', weekday: 1, start: '09:00', end: '12:00', label: 'BSc Fashion Design — Pattern Cutting I' },
  { id: 'tt-2', weekday: 3, start: '14:00', end: '17:00', label: 'Diploma Textiles — Garment Construction' },
  { id: 'tt-3', weekday: 4, start: '08:00', end: '10:00', label: 'BSc Fashion Design — Textile Science lab' },
];

export const bookings = [
  {
    id: 'bk-1', kind: 'TRAINING', date: addDays(monday, 4), start: '09:00', end: '12:00',
    purpose: 'Pattern-cutting class', machineId: 'mch-cutting', capacity: 16, bookedBy: 'Faith Nabwire', status: 'APPROVED',
    attendees: [
      { id: 'at-1', name: 'Brian Kato', attended: false },
      { id: 'at-2', name: 'Aisha Nalwoga', attended: false },
      { id: 'at-3', name: 'Moses Tumusiime', attended: false },
    ],
  },
  {
    id: 'bk-2', kind: 'WORKSHOP', date: addDays(monday, 1), start: '13:00', end: '16:00',
    purpose: 'TXO-2026-014 tote bag production', machineId: 'mch-sew-1', capacity: null, bookedBy: 'Faith Nabwire', status: 'APPROVED',
    attendees: [],
  },
];
