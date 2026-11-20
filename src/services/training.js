import { z } from 'zod';
import { request } from './api-client';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'EXCUSED', 'UNMARKED'];
export const REGISTRATION_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'];
export const TRAINING_STATUSES = ['DRAFT', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED'];
export const FOLLOW_UP_STATUSES = ['PENDING_FOLLOW_UP', 'ACTION_REQUIRED', 'SCHEDULED', 'COMPLETED'];
export const FOLLOW_UP_PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'];

export const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  regNumber: z.string(),
  department: z.string(),
  contactEmail: z.string().nullish(),
  userId: z.string().nullish(),
  status: z.enum(REGISTRATION_STATUSES),
  attendance: z.enum(ATTENDANCE_STATUSES).nullish().transform((value) => value ?? 'UNMARKED'),
  passed: z.boolean(),
  passedAt: z.string().nullish(),
  registeredAt: z.string(),
});

export const trainingSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  facilitator: z.string(),
  date: z.string(),
  endsAt: z.string().nullish(),
  enrolledCount: z.number(),
  capacity: z.number(),
  venue: z.string(),
  status: z.enum(TRAINING_STATUSES),
  description: z.string().nullish(),
  participants: z.array(participantSchema).default([]),
  departmentId: z.string().nullish(),
  fee: z.number().default(0),
  safetyCourse: z.boolean().default(false),
  published: z.boolean().default(true),
});

export const mentorshipFollowUpSchema = z.object({
  id: z.string(),
  title: z.string(),
  mentee: z.string(),
  mentor: z.string(),
  scheduledDate: z.string(),
  focus: z.string(),
  status: z.enum(FOLLOW_UP_STATUSES),
  notes: z.string().nullish().transform((value) => value ?? ''),
  priority: z.enum(FOLLOW_UP_PRIORITIES).nullish().transform((value) => value ?? 'NORMAL'),
  version: z.number(),
});

export const trainingOverviewSchema = z.object({
  upcomingSessions: z.number(),
  seatsFilled: z.number(),
  totalSeats: z.number(),
  mentorshipFollowUps: z.number(),
  sessions: z.array(trainingSessionSchema),
  followUps: z.array(mentorshipFollowUpSchema),
});

export const departmentOptionSchema = z.object({ id: z.string(), name: z.string() });

const base = '/operations/training';

export const trainingApi = {
  async getOverview(token, signal) {
    return trainingOverviewSchema.parse(await request(`${base}/overview`, { token, signal }));
  },

  async getSession(id, token, signal) {
    return trainingSessionSchema.parse(
      await request(`${base}/sessions/${encodeURIComponent(id)}`, { token, signal }),
    );
  },

  /**
   * @param {{title: string, facilitator: string, date: string, endsAt?: string, capacity: number,
   *   venue: string, description?: string, departmentId: string, fee?: number,
   *   safetyCourse?: boolean, publish?: boolean}} body
   */
  async createSession(body, token, signal) {
    return trainingSessionSchema.parse(
      await request(`${base}/sessions`, { method: 'POST', body, token, signal }),
    );
  },

  async registerParticipant(sessionId, participant, token, signal) {
    return trainingSessionSchema.parse(
      await request(`${base}/sessions/${encodeURIComponent(sessionId)}/participants`, {
        method: 'POST',
        body: participant,
        token,
        signal,
      }),
    );
  },

  async removeParticipant(sessionId, participantId, token, signal) {
    await request(
      `${base}/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}`,
      { method: 'DELETE', token, signal },
    );
  },

  async markAttendance(sessionId, participantId, attendance, token, signal) {
    return trainingSessionSchema.parse(
      await request(`${base}/sessions/${encodeURIComponent(sessionId)}/attendance`, {
        method: 'PATCH',
        body: { participantId, attendance },
        token,
        signal,
      }),
    );
  },

  async confirmPayment(sessionId, participantId, token, signal) {
    return trainingSessionSchema.parse(
      await request(
        `${base}/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/confirm-payment`,
        { method: 'POST', token, signal },
      ),
    );
  },

  async markPassed(sessionId, participantId, token, signal) {
    return trainingSessionSchema.parse(
      await request(
        `${base}/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/pass`,
        { method: 'POST', token, signal },
      ),
    );
  },

  /**
   * @param {{title: string, mentee: string, mentor: string, scheduledDate: string, focus: string,
   *   priority?: string, notes?: string}} body
   */
  async createFollowUp(body, token, signal) {
    return mentorshipFollowUpSchema.parse(
      await request(`${base}/mentorship`, { method: 'POST', body, token, signal }),
    );
  },

  async updateFollowUp(id, { status, notes, version }, token, signal) {
    return mentorshipFollowUpSchema.parse(
      await request(`${base}/mentorship/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { status, notes, version },
        token,
        signal,
      }),
    );
  },

  async departments(token, signal) {
    return z.array(departmentOptionSchema).parse(await request('/departments', { token, signal }));
  },
};
