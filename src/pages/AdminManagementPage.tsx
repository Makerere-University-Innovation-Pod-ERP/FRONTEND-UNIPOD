import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CircleAlert, LoaderCircle, Plus, RefreshCw, Save, Trash2, UserPlus } from 'lucide-react';
import { ApiError, backendApi, type ApiUser, type ApiUserRole, type Sector } from '@/services/backend-api';

const ROLES: ApiUserRole[] = [
  'ADMINISTRATOR',
  'INNOVATION_COORDINATOR',
  'RECEPTIONIST',
  'FACT_FINDING_OFFICER',
  'REVIEWER',
  'SECTOR_OFFICER',
  'SUBMITTER',
  'OBSERVER',
];

export function AdminManagementPage({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [memberSubject, setMemberSubject] = useState('');
  const [name, setName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [active, setActive] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ApiUserRole>('REVIEWER');
  const [createdUser, setCreatedUser] = useState<ApiUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [sectorCatalogLoaded, setSectorCatalogLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSector = sectors.find((sector) => sector.id === selectedId) ?? null;

  const loadSectors = useCallback(async () => {
    try {
      const current = await backendApi.sectorCatalog(token);
      setSectors(current);
      setSectorCatalogLoaded(true);
      setSelectedId((previous) => current.some((sector) => sector.id === previous) ? previous : '');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not load sectors.');
    } finally {
      setLoadingSectors(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    void loadSectors();
  }, [loadSectors]);

  async function selectSector(id: string) {
    setSelectedId(id);
    setError('');
    setNotice('');
    const sector = sectors.find((item) => item.id === id);
    if (!sector) {
      setMembers([]);
      setName('');
      setNotificationEmail('');
      setActive(true);
      return;
    }
    setName(sector.name);
    setNotificationEmail(sector.notificationEmail);
    setActive(sector.active);
    try {
      setMembers(await backendApi.sectorMembers(token, sector.id));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not load sector members.');
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setCreatedUser(null);
    try {
      const created = await backendApi.createUser(token, { email: email.trim(), password, role });
      setCreatedUser(created);
      setEmail('');
      setPassword('');
      setNotice('The account was created. Share its initial password securely with the account holder.');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = selectedSector
        ? await backendApi.updateSector(token, selectedSector.id, {
            name: name.trim(),
            notificationEmail: notificationEmail.trim(),
            active,
            version: selectedSector.version,
          })
        : await backendApi.createSector(token, {
            name: name.trim(),
            notificationEmail: notificationEmail.trim(),
            active,
          });
      setSectors((current) => selectedSector
        ? current.map((sector) => sector.id === updated.id ? updated : sector)
        : [...current, updated].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(updated.id);
      setNotice(selectedSector ? 'Sector settings saved.' : 'Sector created.');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not save the sector.');
    } finally {
      setBusy(false);
    }
  }

  function startNewSector() {
    setSelectedId('');
    setName('');
    setNotificationEmail('');
    setActive(true);
    setMembers([]);
    setError('');
    setNotice('');
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSector || !memberSubject.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const added = await backendApi.addSectorMember(token, selectedSector.id, memberSubject.trim());
      setMembers((current) => current.includes(added) ? current : [...current, added]);
      setMemberSubject('');
      setNotice('Sector member added.');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not add the sector member.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(subject: string) {
    if (!selectedSector) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await backendApi.removeSectorMember(token, selectedSector.id, subject);
      setMembers((current) => current.filter((member) => member !== subject));
      setNotice('Sector member removed.');
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not remove the sector member.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">ADMINISTRATION · ACCESS & ROUTING</p><h1>Workspace management</h1><p>Provision API accounts and configure submission sectors.</p></div>
        <button className="btn btn-outline" disabled={loadingSectors} onClick={() => { setLoadingSectors(true); void loadSectors(); }}>
          <RefreshCw size={15} className={loadingSectors ? 'spin' : ''} />Refresh sectors
        </button>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {notice && <p className="management-notice" role="status">{notice}</p>}
      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">IDENTITY</p><h2>Provision account</h2></div><UserPlus size={19} /></div>
        <p className="management-help">The backend stores a password hash and returns the new account’s public details only.</p>
        <form className="management-form" onSubmit={createUser}>
          <label className="form-field">Email address<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="form-field">Initial password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><small className="field-note">Use at least 12 characters. Do not reuse your own password.</small></label>
          <label className="form-field">Role<select value={role} onChange={(event) => setRole(event.target.value as ApiUserRole)}>{ROLES.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}Create account</button></div>
        </form>
        {createdUser && <p className="management-success">Created {createdUser.email} as {createdUser.role.replaceAll('_', ' ')}.</p>}
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">SECTOR ROUTING</p><h2>Manage sectors</h2></div><button className="btn btn-outline" onClick={startNewSector}><Plus size={14} />New sector</button></div>
        {loadingSectors && <div className="live-loading"><LoaderCircle className="spin" size={18} />Loading sectors…</div>}
        {!loadingSectors && sectorCatalogLoaded && sectors.length === 0 && <p className="management-help">No sectors are configured yet. Create one to enable forwarding submissions to a sector.</p>}
        {sectors.length > 0 && <label className="form-field">Existing sector<select value={selectedId} onChange={(event) => void selectSector(event.target.value)}><option value="">Create a new sector…</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}{sector.active ? '' : ' (inactive)'}</option>)}</select></label>}
        <form className="management-form" onSubmit={saveSector}>
          <label className="form-field">Sector name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="form-field">Notification email<input required type="email" maxLength={320} value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} /></label>
          <label className="management-checkbox"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Active and available for case routing</label>
          <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}{selectedSector ? 'Save sector' : 'Create sector'}</button></div>
        </form>
        {selectedSector && <div className="management-members">
          <h3>Sector officers</h3>
          <form className="management-member-form" onSubmit={addMember}>
            <label className="form-field">Officer account identifier<input required maxLength={255} value={memberSubject} onChange={(event) => setMemberSubject(event.target.value)} placeholder="Email or JWT subject" /></label>
            <button className="btn btn-outline" type="submit" disabled={busy}><Plus size={14} />Add member</button>
          </form>
          {members.length
            ? <ul className="management-member-list">{members.map((subject) => <li key={subject}><span>{subject}</span><button className="icon-button" disabled={busy} onClick={() => void removeMember(subject)} aria-label={`Remove ${subject}`}><Trash2 size={15} /></button></li>)}</ul>
            : <p className="live-empty">No officers are assigned to this sector.</p>}
        </div>}
      </section>
    </div>
  );
}
