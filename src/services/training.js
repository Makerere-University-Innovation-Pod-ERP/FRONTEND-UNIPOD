import { z } from 'zod';
import { request } from './api-client';

export const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  regNumber: z.string(),
  department: z.string(),
  attendance: z.enum(['Present', 'Absent', 'Excused', 'Unmarked', 'PRESENT', 'ABSENT', 'EXCUSED']).default('Unmarked'),
  registeredAt: z.string(),
  contactEmail: z.string().optional(),
  safetyPass: z.boolean().default(false),
  paymentStatus: z.enum(['Paid', 'Pending', 'Waived', 'PAID', 'PENDING', 'WAIVED']).default('Paid'),
});

export const trainingSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  facilitator: z.string(),
  date: z.string(),
  enrolledCount: z.number(),
  capacity: z.number(),
  venue: z.string(),
  status: z.enum(['Upcoming', 'In Progress', 'Completed', 'Draft', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED']).default('Upcoming'),
  description: z.string(),
  participants: z.array(participantSchema).default([]),
});

export const mentorshipFollowUpSchema = z.object({
  id: z.string(),
  title: z.string(),
  mentee: z.string(),
  mentor: z.string(),
  scheduledDate: z.string(),
  focus: z.string(),
  status: z.enum(['Pending Follow-up', 'Action Required', 'Scheduled', 'Completed', 'PENDING', 'ACTION_REQUIRED', 'SCHEDULED', 'COMPLETED']),
  notes: z.string().default(''),
  priority: z.enum(['Normal', 'High', 'Urgent']).default('Normal'),
});

export const trainingOverviewSchema = z.object({
  upcomingSessions: z.number(),
  seatsFilled: z.number(),
  totalSeats: z.number(),
  mentorshipFollowUps: z.number(),
  sessions: z.array(trainingSessionSchema),
  followUps: z.array(mentorshipFollowUpSchema),
});

export const trainingApi = {
  async getOverview(token, signal) {
    const data = await request('/operations/training/overview', { token, signal });
    return trainingOverviewSchema.parse(data);
  },

  async getSessions(token, signal) {
    const data = await request('/operations/training/sessions', { token, signal });
    return z.array(trainingSessionSchema).parse(data);
  },

  async getSession(id, token, signal) {
    const data = await request(`/operations/training/sessions/${id}`, { token, signal });
    return trainingSessionSchema.parse(data);
  },

  async registerParticipant(sessionId, participant, token, signal) {
    const data = await request(`/operations/training/sessions/${sessionId}/registrations`, {
      method: 'POST',
      body: participant,
      token,
      signal,
    });
    return participantSchema.parse(data);
  },

  async markAttendance(sessionId, participantId, attendance, token, signal) {
    const data = await request(`/operations/training/sessions/${sessionId}/attendance`, {
      method: 'POST',
      body: { participantId, attendance },
      token,
      signal,
    });
    return trainingSessionSchema.parse(data);
  },

  async recordPayment(sessionId, participantId, paymentData, token, signal) {
    const data = await request('/operations/training/payments', {
      method: 'POST',
      body: { sessionId, participantId, ...paymentData },
      token,
      signal,
    });
    return data;
  },

  async recordSafetyPass(sessionId, participantId, token, signal) {
    const data = await request('/operations/training/safety-passes', {
      method: 'POST',
      body: { sessionId, participantId, passed: true },
      token,
      signal,
    });
    return data;
  },

  async getMentorshipFollowUps(token, signal) {
    const data = await request('/operations/training/mentorship-followups', { token, signal });
    return z.array(mentorshipFollowUpSchema).parse(data);
  },

  async updateMentorshipFollowUp(id, body, token, signal) {
    const data = await request(`/operations/training/mentorship-followups/${id}`, {
      method: 'PATCH',
      body,
      token,
      signal,
    });
    return mentorshipFollowUpSchema.parse(data);
  },
};
