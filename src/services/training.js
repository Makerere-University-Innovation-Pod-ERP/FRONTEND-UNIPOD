import { z } from 'zod';
import { request } from './api-client';

export const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  regNumber: z.string(),
  department: z.string(),
  attendance: z.enum(['Present', 'Absent', 'Excused', 'Unmarked']),
  registeredAt: z.string(),
  contactEmail: z.string().optional(),
});

export const trainingSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  facilitator: z.string(),
  date: z.string(),
  enrolledCount: z.number(),
  capacity: z.number(),
  venue: z.string(),
  status: z.enum(['Upcoming', 'In Progress', 'Completed', 'Draft']),
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
  status: z.enum(['Pending Follow-up', 'Action Required', 'Scheduled', 'Completed']),
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

  async getSession(id, token, signal) {
    const data = await request(`/operations/training/sessions/${id}`, { token, signal });
    return trainingSessionSchema.parse(data);
  },
};

