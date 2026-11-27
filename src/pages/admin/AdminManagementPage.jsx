import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CircleAlert,
  LoaderCircle,
  Plus,
  RefreshCw,
  Route,
  Save,
  Trash2,
} from 'lucide-react';
import { ApiError, backendApi } from '@/services/backend-api';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import './AdminManagementPage.css';

export function AdminManagementPage({
  token,
  onUnauthorized,
}) {
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [departmentNotificationEmail, setDepartmentNotificationEmail] = useState('');
  const [departmentActive, setDepartmentActive] = useState(true);
  const [sectors, setSectors] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState([]);
  const [memberSubject, setMemberSubject] = useState('');
  const [sectorName, setSectorName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [sectorActive, setSectorActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [sectorCatalogLoaded, setSectorCatalogLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSector = sectors.find((sector) => sector.id === selectedId) ?? null;
  const selectedDepartment = departments.find((department) => department.id === departmentId) ?? null;
  const loadAdminData = useCallback(async () => {
    try {
      const [currentDepartments, currentRoles, currentPermissions] = await Promise.all([
        backendApi.adminDepartments(token),
        backendApi.adminPermissionRoles(token),
        backendApi.adminPermissions(token),
      ]);
      setDepartments(currentDepartments);
      setRoles(currentRoles);
      setPermissions(currentPermissions);
      setRoleDrafts(Object.fromEntries(currentRoles.map((item) => [item.id, [...item.permissions]])));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
      else setError(reason instanceof Error ? reason.message : 'Could not load user and access settings.');
    } finally {
      setLoadingAdmin(false);
    }
  }, [token, onUnauthorized]);

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
    void loadAdminData();
    void loadSectors();
  }, [loadAdminData, loadSectors]);

  function reportFailure(reason, fallback) {
    if (reason instanceof ApiError && reason.status === 401) onUnauthorized();
    else setError(reason instanceof Error ? reason.message : fallback);
  }

  async function saveRolePermissions(item) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await backendApi.updateRolePermissions(token, item.id, {
        permissions: roleDrafts[item.id] ?? item.permissions,
        version: item.version,
      });
      setRoles((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
      setRoleDrafts((current) => ({ ...current, [updated.id]: [...updated.permissions] }));
      setNotice(`${updated.name} permissions saved.`);
    } catch (reason) {
      reportFailure(reason, 'Could not save role permissions.');
    } finally {
      setBusy(false);
    }
  }

  function selectDepartment(id) {
    setDepartmentId(id);
    const department = departments.find((item) => item.id === id);
    setDepartmentName(department?.name ?? '');
    setDepartmentNotificationEmail(department?.notificationEmail ?? '');
    setDepartmentActive(department?.active ?? true);
  }

  async function saveDepartment(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = {
        name: departmentName.trim(),
        notificationEmail: departmentNotificationEmail.trim(),
        active: departmentActive,
        ...(selectedDepartment ? { version: selectedDepartment.version } : {}),
      };
      const updated = selectedDepartment
        ? await backendApi.updateDepartment(token, selectedDepartment.id, body)
        : await backendApi.createDepartment(token, body);
      setDepartments((current) => selectedDepartment
        ? current.map((item) => item.id === updated.id ? updated : item)
        : [...current, updated].sort((a, b) => a.name.localeCompare(b.name)));
      setDepartmentId(updated.id);
      setNotice(selectedDepartment ? 'Department settings saved.' : 'Department created.');
    } catch (reason) {
      reportFailure(reason, 'Could not save the department.');
    } finally {
      setBusy(false);
    }
  }

  async function selectSector(id) {
    setSelectedId(id);
    setError('');
    setNotice('');
    const sector = sectors.find((item) => item.id === id);
    if (!sector) {
      setMembers([]);
      setSectorName('');
      setNotificationEmail('');
      setSectorActive(true);
      return;
    }
    setSectorName(sector.name);
    setNotificationEmail(sector.notificationEmail);
    setSectorActive(sector.active);
    try {
      setMembers(await backendApi.sectorMembers(token, sector.id));
    } catch (reason) {
      reportFailure(reason, 'Could not load sector members.');
    }
  }

  async function saveSector(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = selectedSector
        ? await backendApi.updateSector(token, selectedSector.id, {
            name: sectorName.trim(),
            notificationEmail: notificationEmail.trim(),
            active: sectorActive,
            version: selectedSector.version,
          })
        : await backendApi.createSector(token, {
            name: sectorName.trim(),
            notificationEmail: notificationEmail.trim(),
            active: sectorActive,
          });
      setSectors((current) => selectedSector
        ? current.map((sector) => sector.id === updated.id ? updated : sector)
        : [...current, updated].sort((a, b) => a.name.localeCompare(b.name)));
      setDepartments((current) => {
        const remaining = current.filter((department) => department.id !== updated.id);
        if (updated.active) remaining.push({ id: updated.id, name: updated.name, active: true });
        return remaining.sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedId(updated.id);
      setNotice(selectedSector ? 'Sector settings saved.' : 'Sector created.');
    } catch (reason) {
      reportFailure(reason, 'Could not save the sector.');
    } finally {
      setBusy(false);
    }
  }

  function startNewSector() {
    setSelectedId('');
    setSectorName('');
    setNotificationEmail('');
    setSectorActive(true);
    setMembers([]);
    setError('');
    setNotice('');
  }

  async function addMember(event) {
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
      reportFailure(reason, 'Could not add the sector member.');
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(subject) {
    if (!selectedSector) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await backendApi.removeSectorMember(token, selectedSector.id, subject);
      setMembers((current) => current.filter((member) => member !== subject));
      setNotice('Sector member removed.');
    } catch (reason) {
      reportFailure(reason, 'Could not remove the sector member.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-page page-enter management-page">
      <div className="live-page-heading">
        <div><p className="eyebrow">ADMINISTRATION · SYSTEM CONFIGURATION</p><h1>Settings</h1><p>Manage departments, system roles and permissions, and submission sectors.</p></div>
        <button className="btn btn-outline" disabled={loadingAdmin || loadingSectors} onClick={() => {
          setLoadingAdmin(true);
          void loadAdminData();
          setLoadingSectors(true);
          void loadSectors();
        }}>
          <RefreshCw size={15} className={loadingAdmin || loadingSectors ? 'spin' : ''} />Refresh
        </button>
      </div>
      {error && <div className="api-error api-error-banner" role="alert"><CircleAlert size={17} />{error}</div>}
      {notice && <p className="management-notice" role="status">{notice}</p>}

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div className="management-panel-title"><span className="management-panel-icon"><Building2 size={19} /></span><div><p className="eyebrow">ORGANIZATION</p><h2>Manage departments</h2></div></div></div>
        <p className="management-help">Departments can be deactivated without deleting staff or historical records.</p>
        <label className="form-field">Existing department<select value={departmentId} onChange={(event) => selectDepartment(event.target.value)}><option value="">Create a new department…</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inactive)'}</option>)}</select></label>
        <form className="management-form" onSubmit={saveDepartment}>
          <label className="form-field">Department name<input required maxLength={120} placeholder="e.g. Community Health" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} /></label>
          <label className="form-field">Department notification email<input required type="email" maxLength={320} placeholder="department@unipod.mak.ac.ug" value={departmentNotificationEmail} onChange={(event) => setDepartmentNotificationEmail(event.target.value)} /></label>
          <label className="management-checkbox"><input type="checkbox" checked={departmentActive} onChange={(event) => setDepartmentActive(event.target.checked)} />Active and available for staff assignments</label>
          <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}{selectedDepartment ? 'Save department' : 'Create department'}</button></div>
        </form>
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">ORGANIZATION</p><h2>Staff assignment areas</h2></div></div>
        <p className="management-help">Assign one or more active sectors to staff in the directory. Create or update assignment areas in Sector Routing below.</p>
        {loadingAdmin
          ? <div className="live-loading"><LoaderCircle className="spin" size={18} />Loading assignment areas…</div>
          : departments.length
            ? <div className="management-assignment-areas">{departments.map((item) => <span key={item.id}>{item.name}</span>)}</div>
            : <p className="live-empty">No active assignment areas are available.</p>}
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>System roles and permissions</h2></div></div>
        <p className="management-help">Configure permissions for each role. Administrator access is protected. The backend must enforce every permission on each request.</p>
        {loadingAdmin
          ? <div className="live-loading"><LoaderCircle className="spin" size={18} />Loading roles…</div>
          : roles.map((item) => {
            const selected = roleDrafts[item.id] ?? item.permissions;
            const changed = selected.length !== item.permissions.length || selected.some((permission) => !item.permissions.includes(permission));
            return <div className="management-role" key={item.id}>
              <div className="management-role-heading"><div><h3>{item.name}</h3><small>{item.id === 'ADMINISTRATOR' ? 'Protected system role' : 'Role permissions'}</small></div>
                <button className="btn btn-outline" type="button" disabled={busy || !item.editable || !changed} onClick={() => void saveRolePermissions(item)}>{busy ? <LoaderCircle size={14} className="spin" /> : <Save size={14} />}Save permissions</button>
              </div>
              {item.editable
                ? <div className="management-permissions">{permissions.map((permission) => <label key={permission.id} title={permission.description}><input type="checkbox" checked={selected.includes(permission.id)} disabled={busy} onChange={(event) => setRoleDrafts((current) => {
                    const currentPermissions = current[item.id] ?? item.permissions;
                    const next = event.target.checked
                      ? [...currentPermissions, permission.id]
                      : currentPermissions.filter((id) => id !== permission.id);
                    return { ...current, [item.id]: next };
                  })} />{permission.name}</label>)}</div>
                : <div className="management-permissions">{permissions.filter((permission) => selected.includes(permission.id)).map((permission) => <span key={permission.id}>{permission.name}</span>)}</div>}
            </div>;
          })}
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div className="management-panel-title"><span className="management-panel-icon"><Route size={19} /></span><div><p className="eyebrow">SECTOR ROUTING</p><h2>Manage sectors</h2></div></div><button className="btn btn-outline" onClick={startNewSector}><Plus size={14} />New sector</button></div>
        {loadingSectors && <LoadingSkeleton label="Loading sectors…" variant="list" />}
        {!loadingSectors && sectorCatalogLoaded && sectors.length === 0 && <p className="management-help">No sectors are configured yet. Create one to enable forwarding submissions to a sector.</p>}
        {sectors.length > 0 && <label className="form-field">Existing sector<select value={selectedId} onChange={(event) => void selectSector(event.target.value)}><option value="">Create a new sector…</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}{sector.active ? '' : ' (inactive)'}</option>)}</select></label>}
        <form className="management-form" onSubmit={saveSector}>
          <label className="form-field">Sector name<input required maxLength={120} placeholder="e.g. Health Sciences" value={sectorName} onChange={(event) => setSectorName(event.target.value)} /></label>
          <label className="form-field">Notification email<input required type="email" maxLength={320} placeholder="sector@unipod.mak.ac.ug" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} /></label>
          <label className="management-checkbox"><input type="checkbox" checked={sectorActive} onChange={(event) => setSectorActive(event.target.checked)} />Active and available for case routing</label>
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
