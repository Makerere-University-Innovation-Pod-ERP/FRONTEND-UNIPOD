import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CircleAlert,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { ApiError, backendApi } from '@/services/backend-api';
import './AdminManagementPage.css';

const FALLBACK_ROLES = [
  { id: 'INNOVATION_COORDINATOR', name: 'Innovation Coordinator' },
  { id: 'DEPARTMENT_COORDINATOR', name: 'Department Coordinator' },
  { id: 'DEPARTMENT_HEAD', name: 'Department Head' },
  { id: 'FINANCE_OFFICER', name: 'Finance Officer' },
  { id: 'RECEPTIONIST', name: 'Receptionist' },
  { id: 'FACT_FINDING_OFFICER', name: 'Fact-finding Officer' },
  { id: 'REVIEWER', name: 'Reviewer' },
  { id: 'SECTOR_OFFICER', name: 'Sector Officer' },
  { id: 'IP_LIAISON', name: 'IP Liaison' },
  { id: 'TEXTILE_DOMAIN_OWNER', name: 'Textile Domain Owner' },
  { id: 'SUBMITTER', name: 'Submitter' },
  { id: 'OBSERVER', name: 'Observer' },
];

function formatRole(role) {
  return role.replace(/^ROLE_/, '').replaceAll('_', ' ');
}

export function AdminManagementPage({
  token,
  onUnauthorized,
}) {
  const [users, setUsers] = useState([]);
  const [userDrafts, setUserDrafts] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [userFilter, setUserFilter] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('REVIEWER');
  const [accountDepartmentId, setAccountDepartmentId] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
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
  const roleOptions = roles.length > 0 ? roles : FALLBACK_ROLES;
  const filteredUsers = useMemo(() => {
    const query = userFilter.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(query));
  }, [users, userFilter]);

  const loadAdminData = useCallback(async () => {
    try {
      const [currentUsers, currentDepartments, currentRoles, currentPermissions] = await Promise.all([
        backendApi.adminUsers(token),
        backendApi.adminDepartments(token),
        backendApi.adminRoles(token),
        backendApi.adminPermissions(token),
      ]);
      setUsers(currentUsers);
      setDepartments(currentDepartments);
      setRoles(currentRoles);
      setPermissions(currentPermissions);
      setUserDrafts(Object.fromEntries(currentUsers.map((user) => [user.id, {
        role: user.role,
        departmentId: user.departmentId ?? '',
      }])));
      setRoleDrafts(Object.fromEntries(currentRoles.map((item) => [item.id, [...item.permissions]])));
      setRole((current) => current || currentRoles.find((item) => item.id !== 'ADMINISTRATOR')?.id || '');
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

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setCreatedUser(null);
    try {
      const created = await backendApi.createUser(token, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        departmentId: accountDepartmentId,
      });
      setUsers((current) => [created, ...current]);
      setUserDrafts((current) => ({
        ...current,
        [created.id]: { role: created.role, departmentId: created.departmentId ?? '' },
      }));
      setCreatedUser(created);
      setFullName('');
      setEmail('');
      setPassword('');
      setAccountDepartmentId('');
      setNotice('The account was created. Share its initial password securely with the account holder.');
    } catch (reason) {
      reportFailure(reason, 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(user) {
    const draft = userDrafts[user.id] ?? { role: user.role, departmentId: user.departmentId ?? '' };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await backendApi.updateAdminUser(token, user.id, {
        ...draft,
        version: user.version,
      });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setUserDrafts((current) => ({
        ...current,
        [updated.id]: { role: updated.role, departmentId: updated.departmentId ?? '' },
      }));
      setNotice(`Access settings updated for ${updated.email}.`);
    } catch (reason) {
      reportFailure(reason, 'Could not update the account.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserActive(user) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await backendApi.setAdminUserActive(token, user.id, !user.active, user.version);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`${updated.email} is now ${updated.active ? 'active' : 'deactivated'}.`);
    } catch (reason) {
      reportFailure(reason, 'Could not update account status.');
    } finally {
      setBusy(false);
    }
  }

  function selectDepartment(id) {
    setDepartmentId(id);
    const department = departments.find((item) => item.id === id);
    setDepartmentName(department?.name ?? '');
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
    <div className="live-page page-enter">
      <div className="live-page-heading">
        <div><p className="eyebrow">ADMINISTRATION · ACCESS & ROUTING</p><h1>Workspace management</h1><p>Manage staff access, departments, system roles, and submission sectors.</p></div>
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
        <div className="live-panel-heading"><div><p className="eyebrow">IDENTITY</p><h2>Create staff account</h2></div><UserPlus size={19} /></div>
        <p className="management-help">Create an active staff account and assign its initial role and department. Passwords are never returned by the API.</p>
        <form className="management-form" onSubmit={createUser}>
          <label className="form-field">Full name<input required maxLength={160} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
          <label className="form-field">Email address<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="form-field">Initial password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><small className="field-note">Use at least 12 characters. Do not reuse your own password.</small></label>
          <label className="form-field">Role<select required value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.filter((item) => item.id !== 'ADMINISTRATOR').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field">Department<select value={accountDepartmentId} onChange={(event) => setAccountDepartmentId(event.target.value)}><option value="">No department</option>{departments.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy || loadingAdmin || !role}>{busy ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}Create account</button></div>
        </form>
        {createdUser && <p className="management-success">Created {createdUser.email} as {formatRole(createdUser.role)}.</p>}
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">STAFF DIRECTORY</p><h2>Users and account lifecycle</h2></div><Users size={19} /></div>
        <p className="management-help">Change a staff member’s role or department, or deactivate/reactivate their account. Deactivation preserves account history.</p>
        <label className="form-field management-search">Search staff<input type="search" value={userFilter} onChange={(event) => setUserFilter(event.target.value)} placeholder="Name, email, or role" /></label>
        {loadingAdmin
          ? <div className="live-loading"><LoaderCircle className="spin" size={18} />Loading staff and access settings…</div>
          : <div className="live-table-wrap">
            <table className="live-table management-table">
              <thead><tr><th>Staff member</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const draft = userDrafts[user.id] ?? { role: user.role, departmentId: user.departmentId ?? '' };
                  const changed = draft.role !== user.role || draft.departmentId !== (user.departmentId ?? '');
                  const protectedUser = user.role === 'ADMINISTRATOR';
                  return <tr key={user.id}>
                    <td><span className="management-staff-name">{user.fullName}</span><small>{user.email}</small></td>
                    <td><select aria-label={`Role for ${user.email}`} disabled={busy || protectedUser} value={draft.role} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, role: event.target.value } }))}>{roleOptions.filter((item) => item.id !== 'ADMINISTRATOR').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                    <td><select aria-label={`Department for ${user.email}`} disabled={busy || protectedUser} value={draft.departmentId} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, departmentId: event.target.value } }))}><option value="">No department</option>{departments.filter((item) => item.active || item.id === draft.departmentId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inactive)'}</option>)}</select></td>
                    <td><span className={`stage-pill ${user.active ? 'stage-completed' : 'stage-draft'}`}>{user.active ? 'Active' : 'Deactivated'}</span></td>
                    <td><div className="management-row-actions">
                      <button className="btn btn-outline" type="button" disabled={busy || protectedUser || !changed} onClick={() => void saveUser(user)}>{busy ? <LoaderCircle size={14} className="spin" /> : <Save size={14} />}Save</button>
                      <button className="btn btn-outline" type="button" disabled={busy || protectedUser} onClick={() => void toggleUserActive(user)}>{user.active ? 'Deactivate' : 'Reactivate'}</button>
                      {protectedUser && <small className="field-note">Protected</small>}
                    </div></td>
                  </tr>;
                })}
                {filteredUsers.length === 0 && <tr><td colSpan="5" className="management-empty">No staff accounts match this search.</td></tr>}
              </tbody>
            </table>
          </div>}
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">ORGANIZATION</p><h2>Manage departments</h2></div><Building2 size={19} /></div>
        <p className="management-help">Departments can be deactivated without deleting staff or historical records.</p>
        <label className="form-field">Existing department<select value={departmentId} onChange={(event) => selectDepartment(event.target.value)}><option value="">Create a new department…</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (inactive)'}</option>)}</select></label>
        <form className="management-form" onSubmit={saveDepartment}>
          <label className="form-field">Department name<input required maxLength={120} value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} /></label>
          <label className="management-checkbox"><input type="checkbox" checked={departmentActive} onChange={(event) => setDepartmentActive(event.target.checked)} />Active and available for staff assignments</label>
          <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}{selectedDepartment ? 'Save department' : 'Create department'}</button></div>
        </form>
      </section>

      <section className="live-panel management-panel">
        <div className="live-panel-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>System roles and permissions</h2></div><ShieldCheck size={19} /></div>
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
        <div className="live-panel-heading"><div><p className="eyebrow">SECTOR ROUTING</p><h2>Manage sectors</h2></div><button className="btn btn-outline" onClick={startNewSector}><Plus size={14} />New sector</button></div>
        {loadingSectors && <div className="live-loading"><LoaderCircle className="spin" size={18} />Loading sectors…</div>}
        {!loadingSectors && sectorCatalogLoaded && sectors.length === 0 && <p className="management-help">No sectors are configured yet. Create one to enable forwarding submissions to a sector.</p>}
        {sectors.length > 0 && <label className="form-field">Existing sector<select value={selectedId} onChange={(event) => void selectSector(event.target.value)}><option value="">Create a new sector…</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}{sector.active ? '' : ' (inactive)'}</option>)}</select></label>}
        <form className="management-form" onSubmit={saveSector}>
          <label className="form-field">Sector name<input required maxLength={120} value={sectorName} onChange={(event) => setSectorName(event.target.value)} /></label>
          <label className="form-field">Notification email<input required type="email" maxLength={320} value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} /></label>
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
