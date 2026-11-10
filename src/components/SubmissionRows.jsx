import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatStage } from '@/lib/presentation';

export function SubmissionRows({ rows }) {
  return rows.length ? (
    <div className="live-table-wrap"><table className="live-table">
      <thead><tr><th>Case</th><th>Type</th><th>Stage</th><th>Sector</th><th>Received</th><th /></tr></thead>
      <tbody>{rows.map((row) => (
        <tr key={row.id}>
          <td><Link to={`/submissions/${row.id}`} className="case-title"><b>{row.title}</b><small>{row.code || 'Draft · no reference yet'}</small></Link></td>
          <td>{row.category === 'student' ? 'Student project' : 'General innovation'}</td>
          <td><span className={`stage-pill stage-${row.stage.toLowerCase()}`}>{formatStage(row.stage)}</span></td>
          <td>{row.responsibleSectorName || '—'}</td>
          <td>{row.receivedAt ? formatDate(row.receivedAt) : 'Not received'}</td>
          <td><Link aria-label={`Open ${row.title}`} className="icon-button" to={`/submissions/${row.id}`}><ArrowUpRight size={15} /></Link></td>
        </tr>
      ))}</tbody>
    </table></div>
  ) : <p className="live-empty">No submissions are visible to this account.</p>;
}
