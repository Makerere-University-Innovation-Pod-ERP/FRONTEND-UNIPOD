import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/services/api-client';
import {
  bootcampSessions as initialBootcamps,
  equipment as initialEquipment,
  equipmentLoans as initialLoans,
  labBookings as initialLabBookings,
  labTimetable,
  priceList,
  requests as initialRequests,
  stockItems as initialStock,
} from './fixtures/telecoms';
import {
  evaluateMovement,
  findLabBookingClashes,
  isLoanOverdue,
  PAYMENT_STATUS,
  REQUEST_STATUS,
  SCHEDULE_BLOCKED_REASON,
  todayIso,
} from '@/lib/telecoms';

let requests = [...initialRequests];
let stock = [...initialStock];
let stockMovements = [
  {
    id: 'tl-mov-001',
    itemId: 'tl-stk-sma',
    itemName: 'SMA Female PCB Connectors',
    type: 'RECEIVED',
    quantity: 50,
    balance: 45,
    note: 'Initial batch delivery for lab electronics stock',
    requestId: null,
    by: 'Eng. Kaddu',
    at: '2026-10-15T09:00:00Z',
  },
  {
    id: 'tl-mov-002',
    itemId: 'tl-stk-coax',
    itemName: 'Coaxial RG58 Patch Cables (1m)',
    type: 'USED_ON_REQUEST',
    quantity: 2,
    balance: 12,
    note: 'Used on FM filter harmonic diagnostic bench',
    requestId: 'TL-2026-002',
    by: 'Eng. Kaddu',
    at: '2026-11-07T14:00:00Z',
  },
];
let equipmentList = [...initialEquipment];
let loans = [...initialLoans];
let bookings = [...initialLabBookings];
let bootcamps = [...initialBootcamps];

function findRequest(id) {
  return requests.find((req) => req.id === id);
}

export const telecomsHandlers = [
  // --- Requests (TL1 - TL4) ---
  http.get(`${API_BASE_URL}/telecoms/requests`, () => HttpResponse.json({ items: requests })),

  http.get(`${API_BASE_URL}/telecoms/requests/:id`, ({ params }) => {
    const item = findRequest(params.id);
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(item);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests`, async ({ request }) => {
    const body = await request.json();
    const count = requests.length + 1;
    const code = `TL-2026-${String(count).padStart(3, '0')}`;
    const newReq = {
      id: code,
      code,
      customerName: body.customerName,
      customerType: body.customerType ?? 'Student',
      serviceWanted: body.serviceWanted,
      equipmentInvolved: body.equipmentInvolved ?? '',
      preferredDate: body.preferredDate ?? null,
      rulesAccepted: Boolean(body.rulesAccepted),
      status: REQUEST_STATUS.NEW,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimate: body.estimate ?? null,
      quote: null,
      payment: { status: PAYMENT_STATUS.NOT_REQUESTED, reference: null, confirmedAt: null },
      workDetails: { technician: '', partsUsed: '', timeSpent: '', notes: '' },
      history: [
        {
          status: REQUEST_STATUS.NEW,
          by: body.customerName,
          at: new Date().toISOString(),
          note: 'Submitted request to Telecoms department',
        },
      ],
    };
    requests = [newReq, ...requests];
    return HttpResponse.json(newReq, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/telecoms/requests/:id/draft`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const updated = {
      ...requests[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests/:id/quote`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const existing = requests[index];

    const quote = {
      amount: body.amount,
      currency: 'UGX',
      priceListItemId: body.priceListItemId,
      priceQuantity: body.priceQuantity,
      expectedCompletion: body.expectedCompletion,
      sentAt: new Date().toISOString(),
      sentBy: 'Eng. Kaddu',
    };

    const updated = {
      ...existing,
      status: REQUEST_STATUS.QUOTED,
      quote,
      estimate: body.estimate ?? existing.estimate,
      payment: {
        status: PAYMENT_STATUS.AWAITING_PROOF,
        reference: null,
        confirmedAt: null,
      },
      updatedAt: new Date().toISOString(),
      history: [
        ...existing.history,
        {
          status: REQUEST_STATUS.QUOTED,
          by: 'Eng. Kaddu',
          at: new Date().toISOString(),
          note: `Quote of UGX ${body.amount.toLocaleString()} sent to customer`,
        },
      ],
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests/:id/request-details`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const { message } = await request.json();
    const existing = requests[index];
    const updated = {
      ...existing,
      status: REQUEST_STATUS.AWAITING_DETAILS,
      updatedAt: new Date().toISOString(),
      history: [
        ...existing.history,
        {
          status: REQUEST_STATUS.AWAITING_DETAILS,
          by: 'Eng. Kaddu',
          at: new Date().toISOString(),
          note: message,
        },
      ],
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests/:id/send-back`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const { reason } = await request.json();
    const existing = requests[index];
    const updated = {
      ...existing,
      status: REQUEST_STATUS.RETURNED,
      updatedAt: new Date().toISOString(),
      history: [
        ...existing.history,
        {
          status: REQUEST_STATUS.RETURNED,
          by: 'Eng. Kaddu',
          at: new Date().toISOString(),
          note: reason,
        },
      ],
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests/:id/status`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const { toStatus } = await request.json();
    const existing = requests[index];

    // Check payment gate
    if (toStatus === REQUEST_STATUS.SCHEDULED && existing.payment.status !== PAYMENT_STATUS.CONFIRMED) {
      return HttpResponse.json({ message: SCHEDULE_BLOCKED_REASON }, { status: 409 });
    }

    const updated = {
      ...existing,
      status: toStatus,
      updatedAt: new Date().toISOString(),
      history: [
        ...existing.history,
        {
          status: toStatus,
          by: 'Eng. Kaddu',
          at: new Date().toISOString(),
          note: `Moved to ${toStatus}`,
        },
      ],
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.put(`${API_BASE_URL}/telecoms/requests/:id/work-details`, async ({ params, request }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const body = await request.json();
    const existing = requests[index];
    const updated = {
      ...existing,
      workDetails: {
        ...existing.workDetails,
        ...body,
      },
      updatedAt: new Date().toISOString(),
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/requests/:id/mark-done`, async ({ params }) => {
    const index = requests.findIndex((item) => item.id === params.id);
    if (index === -1) return new HttpResponse(null, { status: 404 });
    const existing = requests[index];
    const updated = {
      ...existing,
      status: REQUEST_STATUS.DONE,
      updatedAt: new Date().toISOString(),
      history: [
        ...existing.history,
        {
          status: REQUEST_STATUS.DONE,
          by: 'Eng. Kaddu',
          at: new Date().toISOString(),
          note: 'Work completed and customer notified',
        },
      ],
    };
    requests[index] = updated;
    return HttpResponse.json(updated);
  }),

  // --- Price List ---
  http.get(`${API_BASE_URL}/telecoms/price-list`, () => HttpResponse.json({ items: priceList })),

  // --- Stock (TL9) ---
  http.get(`${API_BASE_URL}/telecoms/stock`, () => HttpResponse.json({ items: stock })),

  http.get(`${API_BASE_URL}/telecoms/stock/movements`, () => HttpResponse.json({ items: stockMovements })),

  http.post(`${API_BASE_URL}/telecoms/stock/movements`, async ({ request }) => {
    const body = await request.json();
    const item = stock.find((candidate) => candidate.id === body.itemId);
    if (!item) return HttpResponse.json({ message: 'Stock item not found.' }, { status: 404 });

    const check = evaluateMovement(item, body);
    if (check.error) return HttpResponse.json({ message: check.error }, { status: 409 });

    const updatedItem = { ...item, quantity: check.balance };
    stock = stock.map((candidate) => (candidate.id === item.id ? updatedItem : candidate));

    const newMovement = {
      id: `tl-mov-${String(stockMovements.length + 1).padStart(3, '0')}`,
      itemId: item.id,
      itemName: item.name,
      type: body.type,
      quantity: body.quantity,
      balance: check.balance,
      note: body.note ?? null,
      requestId: body.requestId ?? null,
      by: 'Eng. Kaddu',
      at: new Date().toISOString(),
    };
    stockMovements = [newMovement, ...stockMovements];
    return HttpResponse.json({ movement: newMovement, item: updatedItem }, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/telecoms/stock/:id/minimum`, async ({ params, request }) => {
    const item = stock.find((candidate) => candidate.id === params.id);
    if (!item) return HttpResponse.json({ message: 'Stock item not found.' }, { status: 404 });
    const { minimum } = await request.json();
    const updated = { ...item, minimum: Math.max(0, Number(minimum) || 0) };
    stock = stock.map((candidate) => (candidate.id === item.id ? updated : candidate));
    return HttpResponse.json(updated);
  }),

  // --- Equipment & Lending (TL6, TL7) ---
  http.get(`${API_BASE_URL}/telecoms/equipment`, () => HttpResponse.json({ items: equipmentList })),

  http.post(`${API_BASE_URL}/telecoms/equipment/report-fault`, async ({ request }) => {
    const body = await request.json();
    const item = equipmentList.find((candidate) => candidate.id === body.equipmentId);
    if (!item) return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 });
    const updated = {
      ...item,
      state: 'FAULTY',
      note: body.description,
      updatedAt: todayIso(),
    };
    equipmentList = equipmentList.map((candidate) => (candidate.id === item.id ? updated : candidate));
    return HttpResponse.json(updated);
  }),

  http.get(`${API_BASE_URL}/telecoms/equipment/loans`, () => HttpResponse.json({ items: loans })),

  http.post(`${API_BASE_URL}/telecoms/equipment/loans`, async ({ request }) => {
    const body = await request.json();
    const item = equipmentList.find((candidate) => candidate.id === body.equipmentId);
    if (!item) return HttpResponse.json({ message: 'Equipment not found.' }, { status: 404 });

    const newLoan = {
      id: `TL-LOAN-${String(loans.length + 1).padStart(3, '0')}`,
      equipmentId: item.id,
      equipmentName: item.name,
      quantity: body.quantity ?? 1,
      borrowerName: body.borrowerName,
      borrowerType: body.borrowerType ?? 'Student',
      borrowerContact: body.borrowerContact,
      dateOut: body.dateOut,
      dateBack: body.dateBack,
      outgoingCondition: body.outgoingCondition,
      incomingCondition: null,
      status: 'PENDING_APPROVAL',
      managerApproval: null,
      createdAt: new Date().toISOString(),
    };
    loans = [newLoan, ...loans];
    return HttpResponse.json(newLoan, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/telecoms/equipment/loans/:id/approve`, async ({ params, request }) => {
    const loan = loans.find((item) => item.id === params.id);
    if (!loan) return HttpResponse.json({ message: 'Loan not found.' }, { status: 404 });
    const { note } = await request.json();

    const updated = {
      ...loan,
      status: 'ACTIVE',
      managerApproval: {
        approvedBy: 'Dr. Magiete (Admin)',
        approvedAt: new Date().toISOString(),
        note: note || 'Approved for research loan outside lab.',
      },
    };
    loans = loans.map((item) => (item.id === loan.id ? updated : item));

    // Reduce available quantity on equipment
    equipmentList = equipmentList.map((eq) => {
      if (eq.id === loan.equipmentId) {
        return {
          ...eq,
          availableQuantity: Math.max(0, eq.availableQuantity - loan.quantity),
          state: eq.availableQuantity - loan.quantity <= 0 ? 'LOANED' : eq.state,
        };
      }
      return eq;
    });

    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/equipment/loans/:id/decline`, async ({ params, request }) => {
    const loan = loans.find((item) => item.id === params.id);
    if (!loan) return HttpResponse.json({ message: 'Loan not found.' }, { status: 404 });
    const { reason } = await request.json();
    const updated = {
      ...loan,
      status: 'DECLINED',
      managerApproval: {
        approvedBy: 'Prof. Michelle (Admin)',
        approvedAt: new Date().toISOString(),
        note: reason || 'Declined: equipment cannot leave lab during active semester.',
      },
    };
    loans = loans.map((item) => (item.id === loan.id ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/equipment/loans/:id/return`, async ({ params, request }) => {
    const loan = loans.find((item) => item.id === params.id);
    if (!loan) return HttpResponse.json({ message: 'Loan not found.' }, { status: 404 });
    const { condition } = await request.json();

    const updated = {
      ...loan,
      status: 'RETURNED',
      incomingCondition: condition,
    };
    loans = loans.map((item) => (item.id === loan.id ? updated : item));

    // Restore available quantity on equipment
    equipmentList = equipmentList.map((eq) => {
      if (eq.id === loan.equipmentId) {
        return {
          ...eq,
          availableQuantity: Math.min(eq.totalQuantity, eq.availableQuantity + loan.quantity),
          state: 'AVAILABLE',
        };
      }
      return eq;
    });

    return HttpResponse.json(updated);
  }),

  // --- Lab Booking (TL5) ---
  http.get(`${API_BASE_URL}/telecoms/lab-bookings`, () => {
    return HttpResponse.json({
      bookings,
      timetable: labTimetable,
    });
  }),

  http.post(`${API_BASE_URL}/telecoms/lab-bookings`, async ({ request }) => {
    const body = await request.json();
    const clashes = findLabBookingClashes(body, { bookings, timetable: labTimetable });
    if (clashes.length > 0) {
      return HttpResponse.json({ message: clashes.map((c) => c.message).join(' ') }, { status: 409 });
    }

    const newBooking = {
      id: `TL-BK-${String(bookings.length + 1).padStart(3, '0')}`,
      purpose: body.purpose,
      date: body.date,
      start: body.start,
      end: body.end,
      groupSize: Number(body.groupSize) || 1,
      bookedBy: body.bookedBy || 'Eng. Kaddu',
      customerType: body.customerType || 'Student',
      status: 'CONFIRMED',
      paymentStatus: body.paymentStatus || PAYMENT_STATUS.NOT_REQUESTED,
      createdAt: new Date().toISOString(),
    };
    bookings = [newBooking, ...bookings];
    return HttpResponse.json(newBooking, { status: 201 });
  }),

  // --- Bootcamp Sessions (TL8) ---
  http.get(`${API_BASE_URL}/telecoms/bootcamps`, () => HttpResponse.json({ items: bootcamps })),

  http.post(`${API_BASE_URL}/telecoms/bootcamps`, async ({ request }) => {
    const body = await request.json();
    const newSession = {
      id: `TL-BC-${String(bootcamps.length + 1).padStart(3, '0')}`,
      topic: body.topic,
      instructor: body.instructor,
      date: body.date,
      start: body.start,
      end: body.end,
      capacity: Number(body.capacity) || 20,
      fee: Number(body.fee) || 60000,
      enrolled: [],
      attendance: [],
    };
    bootcamps = [newSession, ...bootcamps];
    return HttpResponse.json(newSession, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/telecoms/bootcamps/:id/enroll`, async ({ params, request }) => {
    const session = bootcamps.find((item) => item.id === params.id);
    if (!session) return HttpResponse.json({ message: 'Session not found.' }, { status: 404 });
    if (session.enrolled.length >= session.capacity) {
      return HttpResponse.json({ message: 'Bootcamp session capacity is full.' }, { status: 409 });
    }
    const body = await request.json();
    const newParticipant = {
      id: `part-${Date.now()}`,
      name: body.name,
      email: body.email,
      studentNumber: body.studentNumber || null,
      paymentStatus: PAYMENT_STATUS.CONFIRMED,
      enrolledAt: todayIso(),
    };
    const updated = {
      ...session,
      enrolled: [...session.enrolled, newParticipant],
    };
    bootcamps = bootcamps.map((item) => (item.id === session.id ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.post(`${API_BASE_URL}/telecoms/bootcamps/:id/attendance`, async ({ params, request }) => {
    const session = bootcamps.find((item) => item.id === params.id);
    if (!session) return HttpResponse.json({ message: 'Session not found.' }, { status: 404 });
    const { attendance } = await request.json();
    const updated = {
      ...session,
      attendance,
    };
    bootcamps = bootcamps.map((item) => (item.id === session.id ? updated : item));
    return HttpResponse.json(updated);
  }),
];
