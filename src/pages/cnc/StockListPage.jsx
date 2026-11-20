import { Boxes } from 'lucide-react';
import { PageHeading } from './shared';

export function StockListPage() {
  return (
    <div className="live-page page-enter">
      <PageHeading title="Stock List" intro="Wood, sheets, blades and consumables, with low-stock flags and received / used / correction movements." />
      <section className="live-panel not-found-live">
        <p className="eyebrow"><Boxes size={14} /> NOT AVAILABLE YET</p>
        <h1>The stock service is not live on the backend yet.</h1>
        <p>This page will list CNC & Carpentry stock once the backend publishes stock endpoints. Materials used on each job are already recorded on the job page.</p>
      </section>
    </div>
  );
}
