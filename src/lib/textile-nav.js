import { ClipboardList, Columns2, Folder, Grid2x2, Lightbulb, ListChecks, Mail, RefreshCcw, Route } from 'lucide-react';

/**
 * Textile-only mode (`npm run dev:textile`) shows the full sidebar from the
 * Textile design. Links outside Textile Operations open a placeholder page
 * (OtherModulePage in App.jsx); pipeline badges show live stage counts.
 */
export const TEXTILE_MODE_WORKSPACE_LINKS = [
  { label: 'Overview', href: '/overview', icon: Grid2x2 },
  { label: 'All Submissions', href: '/submissions', icon: Folder },
  { label: 'Student Projects', href: '/submissions/student', icon: Columns2 },
  { label: 'General Innovations', href: '/submissions/general', icon: Lightbulb },
];
export const TEXTILE_MODE_PIPELINE_LINKS = [
  { label: 'Reception', href: '/reception', icon: Mail, stages: ['RECEIVED'] },
  { label: 'Fact-Finding', href: '/fact-finding/queue', icon: ClipboardList, stages: ['FACT_FINDING'] },
  { label: 'Reviews', href: '/reviewer/workspace', icon: ListChecks, stages: ['UNDER_REVIEW'] },
  { label: 'Routing & IP', href: '/routing-ip', icon: Route, stages: ['FORWARDED'] },
  { label: 'Refinement', href: '/refinement', icon: RefreshCcw, stages: ['REFINEMENT_REQUESTED'] },
];

export function stageCount(overview, stages) {
  const byStage = overview?.byStage ?? overview?.pipelineAtAGlance ?? {};
  return stages.reduce((total, stage) => total + (Number(byStage[stage]) || 0), 0);
}
