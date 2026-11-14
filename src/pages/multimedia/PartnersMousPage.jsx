import React, { useState } from 'react';
import { Handshake, AlertTriangle, X, Calendar as CalendarIcon, Mail, User, FileText, CheckCircle2, Search, Plus } from 'lucide-react';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePartner, usePartnersOverview, useRenewPartnerMOU } from '@/hooks/usePartners';
import { normalizePartnerStatus } from '@/services/partners';

function getStatusStyle(rawStatus) {
  const status = normalizePartnerStatus(rawStatus);
  switch (status) {
    case 'Active':
      return {
        bg: '#e3f0e6',
        color: '#215f43',
        dotColor: '#215f43',
      };
    case 'Renewal due':
      return {
        bg: '#fff4da',
        color: '#b46a24',
        dotColor: '#b46a24',
      };
    case 'Expiring soon':
      return {
        bg: '#fcedce',
        color: '#b45d22',
        dotColor: '#b45d22',
      };
    case 'Expired':
      return {
        bg: '#fee2e2',
        color: '#991b1b',
        dotColor: '#991b1b',
      };
    default:
      return {
        bg: '#eff0eb',
        color: '#555e56',
        dotColor: '#7a847b',
      };
  }
}

function formatPartnerDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function PartnerDatePicker({ id, label, value, onChange, open, onOpenChange, required = false }) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="form-field">
      <span id={`${id}-label`}>{label}</span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-labelledby={`${id}-label`}
            aria-required={required}
            className="partners-date-trigger"
          >
            <CalendarIcon size={16} aria-hidden="true" />
            <span>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Choose a date'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="partners-date-popover"
          style={{
            zIndex: 10001,
            width: 'auto',
            padding: '8px',
            border: '1px solid #d5dad3',
            borderRadius: '16px',
            background: '#ffffff',
            boxShadow: '0 12px 30px rgba(20, 32, 24, 0.16)',
          }}
        >
          <DateCalendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              onChange(date ? formatPartnerDate(date) : '');
              onOpenChange(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function PartnersMousPage({ token, roles = [] }) {
  const { data: overview, isPending, isError, error, refetch } = usePartnersOverview(token);
  const createPartnerMutation = useCreatePartner(token);
  const renewMutation = useRenewPartnerMOU(token);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateDateOpen, setIsCreateDateOpen] = useState(false);
  const [isRenewalDateOpen, setIsRenewalDateOpen] = useState(false);
  const [renewalFormDate, setRenewalFormDate] = useState('');
  const [renewalDocumentReference, setRenewalDocumentReference] = useState('');
  const [renewalFormAttempted, setRenewalFormAttempted] = useState(false);
  const [createPartnerForm, setCreatePartnerForm] = useState({
    name: '',
    type: 'INDUSTRY_PARTNER',
    renewalDate: '',
    contactPerson: '',
    contactEmail: '',
    notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const canCreatePartner = roles.some((role) =>
    ['ROLE_ADMINISTRATOR', 'ROLE_DEPARTMENT_COORDINATOR'].includes(role),
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPartners = overview?.partners.filter((partner) => {
    if (!normalizedSearch) return true;
    return [
      partner.name,
      partner.type,
      normalizePartnerStatus(partner.status),
      partner.renewalDate,
      partner.contactPerson,
      partner.contactEmail,
      partner.notes,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch));
  }) ?? [];
  const submitCreatePartner = (event) => {
    event.preventDefault();
    createPartnerMutation.mutate(
      {
        name: createPartnerForm.name.trim(),
        type: createPartnerForm.type,
        renewalDate: createPartnerForm.renewalDate || null,
        contactPerson: createPartnerForm.contactPerson.trim() || null,
        contactEmail: createPartnerForm.contactEmail.trim() || null,
        notes: createPartnerForm.notes.trim() || null,
      },
      {
        onSuccess: () => {
          setCreatePartnerForm({
            name: '',
            type: 'INDUSTRY_PARTNER',
            renewalDate: '',
            contactPerson: '',
            contactEmail: '',
            notes: '',
          });
          setIsCreateOpen(false);
        },
      },
    );
  };
  const submitRenewal = (event, partnerId) => {
    event.preventDefault();
    if (!renewalFormDate) {
      setRenewalFormAttempted(true);
      return;
    }

    renewMutation.mutate(
      {
        id: partnerId,
        renewalDate: renewalFormDate,
        documentReference: renewalDocumentReference.trim() || null,
      },
      {
        onSuccess: (updatedPartner) => {
          setSelectedPartner(updatedPartner);
          setRenewalFormDate('');
          setRenewalDocumentReference('');
          setRenewalFormAttempted(false);
          setIsRenewalDateOpen(false);
        },
      },
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Eyebrow & Title Area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: '#1b5e43',
              textTransform: 'uppercase',
              margin: '0 0 8px 0',
            }}
          >
            OPERATIONS
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 3.5vw, 34px)',
              lineHeight: 1.15,
              fontWeight: 600,
              color: '#16221a',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Partners & MOUs
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: '#7a847b',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Partner organisations, MOU renewal dates and relationship status.
          </p>
        </div>
        {canCreatePartner && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              createPartnerMutation.reset();
              setIsCreateOpen(true);
            }}
          >
            <Plus size={16} />
            Add partner
          </button>
        )}
      </div>

      {isPending && <p role="status">Loading partners…</p>}
      {isError && (
        <div className="api-error api-error-banner" role="alert">
          <span>{error instanceof Error ? error.message : 'Could not load partners.'}</span>
          <button type="button" className="btn btn-outline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}
      {overview && !isError && (
        <>
      {/* 2 KPI Metric Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
        aria-label="Partners KPI metrics"
      >
        {/* Card 1: PARTNERS */}
        <article
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e3e7df',
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#7a847b',
                textTransform: 'uppercase',
              }}
            >
              PARTNERS
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#eef5eb',
                color: '#1b5e43',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Handshake size={15} />
            </div>
          </div>
          <strong
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: '#16221a',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {overview.totalPartners}
          </strong>
        </article>

        {/* Card 2: RENEWAL DUE (Dark rich mahogany #4d2317) */}
        <article
          style={{
            background: '#4d2317',
            borderRadius: '16px',
            border: '1px solid #431f15',
            padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#c99b8f',
                textTransform: 'uppercase',
              }}
            >
              RENEWAL DUE
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#e89e90',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={15} />
            </div>
          </div>
          <strong
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 500,
              color: '#ffffff',
              display: 'block',
              lineHeight: 1,
            }}
          >
            {overview.renewalDueCount}
          </strong>
        </article>
      </section>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          className="live-search partners-search"
          style={{
            height: '44px',
            flex: '1 1 280px',
            maxWidth: '480px',
            minWidth: 0,
            padding: '0 14px',
            borderRadius: '12px',
            borderColor: '#e3e7df',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search partners"
            placeholder="Search partners, contacts, type, or status"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="partners-search-clear"
              aria-label="Clear partner search"
              onClick={() => setSearchTerm('')}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '28px',
                height: '28px',
                flexShrink: 0,
                border: 0,
                borderRadius: '50%',
                background: 'transparent',
                color: '#758078',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <span
          role="status"
          style={{ color: '#7a847b', fontSize: '11px', fontWeight: 600 }}
        >
          {filteredPartners.length === overview.partners.length
            ? `${overview.partners.length} ${overview.partners.length === 1 ? 'partner' : 'partners'}`
            : `${filteredPartners.length} of ${overview.partners.length} partners`}
        </span>
      </div>

      {/* Partners & MOUs Data Table Container */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e3e7df',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: '640px',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e8eae3' }}>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '35%',
                  }}
                >
                  PARTNER
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '25%',
                  }}
                >
                  TYPE
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '20%',
                  }}
                >
                  RENEWAL
                </th>
                <th
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#7a847b',
                    textTransform: 'uppercase',
                    padding: '16px 24px',
                    width: '20%',
                  }}
                >
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '32px 24px',
                      color: '#7a847b',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    {normalizedSearch
                      ? `No partners match “${searchTerm.trim()}”.`
                      : 'No partners are recorded yet.'}
                  </td>
                </tr>
              ) : filteredPartners.map((partner, index) => {
                const statusStyle = getStatusStyle(partner.status);
                const isLast = index === filteredPartners.length - 1;

                return (
                  <tr
                    key={partner.id}
                    data-testid={`partner-row-${partner.id}`}
                    onClick={() => {
                      setSelectedPartner(partner);
                      setRenewalFormDate('');
                      setRenewalDocumentReference('');
                      setRenewalFormAttempted(false);
                      setIsRenewalDateOpen(false);
                      renewMutation.reset();
                    }}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid #eff0eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafbfa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#16221a',
                      }}
                    >
                      {partner.name}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '12px',
                        color: '#7a847b',
                      }}
                    >
                      {partner.type}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '12px',
                        color: '#7a847b',
                      }}
                    >
                      {partner.renewalDate ?? '—'}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          borderRadius: '9999px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: statusStyle.dotColor,
                            display: 'inline-block',
                          }}
                        />
                        {normalizePartnerStatus(partner.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSelectedPartner(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#1b5e43',
                    marginBottom: '4px',
                    letterSpacing: '0.08em',
                  }}
                >
                  {selectedPartner.type}
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '22px',
                    fontWeight: 600,
                    margin: 0,
                    color: '#16221a',
                  }}
                >
                  {selectedPartner.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                style={{
                  border: 'none',
                  background: '#f2f4ee',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#414842',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span
                style={{
                  ...getStatusStyle(selectedPartner.status),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: getStatusStyle(selectedPartner.status).dotColor,
                  }}
                />
                {normalizePartnerStatus(selectedPartner.status)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f5f0',
                  color: '#414842',
                  borderRadius: '9999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                }}
              >
                <CalendarIcon size={12} />
                Renewal: {selectedPartner.renewalDate ?? '—'}
              </span>
            </div>

            <div
              style={{
                background: '#fafbfa',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #eef0eb',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {selectedPartner.contactPerson && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#333e35' }}>
                  <User size={14} color="#7a847b" />
                  <span>
                    <strong>Contact:</strong> {selectedPartner.contactPerson}
                  </span>
                </div>
              )}
              {selectedPartner.contactEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#333e35' }}>
                  <Mail size={14} color="#7a847b" />
                  <span>
                    <strong>Email:</strong> {selectedPartner.contactEmail}
                  </span>
                </div>
              )}
              {selectedPartner.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#333e35' }}>
                  <FileText size={14} color="#7a847b" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>MOU Scope:</strong> {selectedPartner.notes}
                  </span>
                </div>
              )}
            </div>

            {normalizePartnerStatus(selectedPartner.status) !== 'Active' ? (
              <form
                className="partners-renewal-form"
                onSubmit={(event) => submitRenewal(event, selectedPartner.id)}
              >
                <div className="form-grid">
                  <PartnerDatePicker
                    id="partner-mou-renewal-date"
                    label="New renewal date *"
                    value={renewalFormDate}
                    onChange={(date) => {
                      setRenewalFormDate(date);
                      setRenewalFormAttempted(false);
                    }}
                    open={isRenewalDateOpen}
                    onOpenChange={setIsRenewalDateOpen}
                    required
                  />
                  <label className="form-field">
                    Signed MOU reference
                    <input
                      name="documentReference"
                      maxLength={500}
                      value={renewalDocumentReference}
                      placeholder="Reference or document ID"
                      onChange={(event) => setRenewalDocumentReference(event.target.value)}
                    />
                    <small className="field-note">
                      Leave blank to clear any saved reference.
                    </small>
                  </label>
                </div>

                {renewalFormAttempted && !renewalFormDate && (
                  <p className="api-error" role="alert">
                    Choose a new renewal date before submitting.
                  </p>
                )}
                {renewMutation.isError && (
                  <p className="api-error" role="alert">
                    {renewMutation.error instanceof Error
                      ? renewMutation.error.message
                      : 'Could not renew the MOU.'}
                  </p>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setSelectedPartner(null)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={renewMutation.isPending}
                  >
                    <CheckCircle2 size={13} />
                    {renewMutation.isPending ? 'Renewing…' : 'Renew MOU'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedPartner(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
      {isCreateOpen && canCreatePartner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-partner-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.45)',
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div>
                <p
                  style={{
                    margin: '0 0 5px',
                    color: '#1b5e43',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Partner directory
                </p>
                <h2
                  id="create-partner-title"
                  style={{
                    margin: 0,
                    color: '#16221a',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '24px',
                    fontWeight: 600,
                  }}
                >
                  Add a partner
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close add partner form"
                onClick={() => setIsCreateOpen(false)}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '34px',
                  height: '34px',
                  flexShrink: 0,
                  border: 0,
                  borderRadius: '50%',
                  background: '#f2f4ee',
                  color: '#414842',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form className="partners-create-form" onSubmit={submitCreatePartner}>
              <label className="form-field">
                Partner name *
                <input
                  name="name"
                  autoFocus
                  required
                  maxLength={255}
                  value={createPartnerForm.name}
                  onChange={(event) =>
                    setCreatePartnerForm((form) => ({ ...form, name: event.target.value }))
                  }
                />
              </label>

              <div className="form-grid">
                <div className="form-field">
                  <span id="partner-type-label">Partner type *</span>
                  <Select
                    value={createPartnerForm.type}
                    onValueChange={(type) =>
                      setCreatePartnerForm((form) => ({ ...form, type }))
                    }
                  >
                    <SelectTrigger
                      aria-labelledby="partner-type-label"
                      className="partners-create-select-trigger"
                    >
                      <SelectValue placeholder="Choose a partner type" />
                    </SelectTrigger>
                    <SelectContent
                      className="partners-create-select-menu"
                      style={{
                        zIndex: 10001,
                        border: '1px solid #d5dad3',
                        borderRadius: '14px',
                        background: '#ffffff',
                        padding: '5px',
                        boxShadow: '0 12px 30px rgba(20, 32, 24, 0.16)',
                      }}
                    >
                      <SelectItem value="INDUSTRY_PARTNER">Industry partner</SelectItem>
                      <SelectItem value="FUNDER">Funder</SelectItem>
                      <SelectItem value="ACADEMIC_PARTNER">Academic partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <PartnerDatePicker
                  id="partner-create-renewal-date"
                  label="Renewal date"
                  value={createPartnerForm.renewalDate}
                  onChange={(renewalDate) =>
                    setCreatePartnerForm((form) => ({ ...form, renewalDate }))
                  }
                  open={isCreateDateOpen}
                  onOpenChange={setIsCreateDateOpen}
                />
              </div>

              <div className="form-grid">
                <label className="form-field">
                  Contact person
                  <input
                    name="contactPerson"
                    maxLength={255}
                    value={createPartnerForm.contactPerson}
                    onChange={(event) =>
                      setCreatePartnerForm((form) => ({ ...form, contactPerson: event.target.value }))
                    }
                  />
                </label>
                <label className="form-field">
                  Contact email
                  <input
                    name="contactEmail"
                    type="email"
                    maxLength={254}
                    value={createPartnerForm.contactEmail}
                    onChange={(event) =>
                      setCreatePartnerForm((form) => ({ ...form, contactEmail: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="form-field partners-notes-field">
                <span>
                  Notes <span className="partners-notes-optional">Optional</span>
                </span>
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={2000}
                  value={createPartnerForm.notes}
                  placeholder="Add agreement scope, collaboration details, or other important context…"
                  onChange={(event) =>
                    setCreatePartnerForm((form) => ({ ...form, notes: event.target.value }))
                  }
                />
                <small className="partners-notes-count">
                  {createPartnerForm.notes.length}/2000 characters
                </small>
              </label>

              {createPartnerMutation.isError && (
                <p className="api-error" role="alert">
                  {createPartnerMutation.error instanceof Error
                    ? createPartnerMutation.error.message
                    : 'Could not create partner.'}
                </p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPartnerMutation.isPending}
                >
                  {createPartnerMutation.isPending ? 'Adding…' : 'Create partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

