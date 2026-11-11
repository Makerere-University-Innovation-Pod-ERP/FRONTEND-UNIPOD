import React, { useState } from 'react';
import { Handshake, AlertTriangle, X, Calendar, Mail, User, FileText } from 'lucide-react';
import { usePartnersOverview } from '@/hooks/usePartners';

const FALLBACK_PARTNERS = [
  {
    id: 'partner-1',
    name: 'Kampala AgriTech Collective',
    type: 'Industry partner',
    renewalDate: '12 Nov 2026',
    status: 'Renewal due',
    contactPerson: 'David Kintu',
    contactEmail: 'partnerships@agritech.co.ug',
    notes: 'Joint incubation and testbed deployment for precision agriculture prototypes.',
  },
  {
    id: 'partner-2',
    name: 'Ministry of ICT Innovation Fund',
    type: 'Funder',
    renewalDate: '4 Mar 2027',
    status: 'Active',
    contactPerson: 'Sarah Nabatanzi',
    contactEmail: 'innovations@ict.go.ug',
    notes: 'Government funding framework supporting university technology commercialisation.',
  },
  {
    id: 'partner-3',
    name: 'Makerere Health Sciences',
    type: 'Academic partner',
    renewalDate: '—',
    status: 'Active',
    contactPerson: 'Prof. Peter Byarugaba',
    contactEmail: 'research@chs.mak.ac.ug',
    notes: 'Cross-faculty collaboration on medical devices and health innovations.',
  },
  {
    id: 'partner-4',
    name: 'EcoBuild Uganda Ltd',
    type: 'Industry partner',
    renewalDate: '30 Oct 2026',
    status: 'Expiring soon',
    contactPerson: 'Amina Nakazzi',
    contactEmail: 'contact@ecobuild.ug',
    notes: 'Sustainable construction material testing and student internship host partner.',
  },
];

function getStatusStyle(status) {
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
    default:
      return {
        bg: '#eff0eb',
        color: '#555e56',
        dotColor: '#7a847b',
      };
  }
}

export function PartnersMousPage({ token }) {
  const { data: overview } = usePartnersOverview(token);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const partners = overview?.partners ?? FALLBACK_PARTNERS;
  const totalCount = overview?.totalPartners ?? 4;
  const renewalDueCount = overview?.renewalDueCount ?? 2;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Eyebrow & Title Area */}
      <div style={{ marginBottom: '28px' }}>
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
            {totalCount}
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
            {renewalDueCount}
          </strong>
        </article>
      </section>

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
              {partners.map((partner, index) => {
                const statusStyle = getStatusStyle(partner.status);
                const isLast = index === partners.length - 1;

                return (
                  <tr
                    key={partner.id}
                    data-testid={`partner-row-${partner.id}`}
                    onClick={() => setSelectedPartner(partner)}
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
                      {partner.renewalDate}
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
                        {partner.status}
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
                {selectedPartner.status}
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
                <Calendar size={12} />
                Renewal: {selectedPartner.renewalDate}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                style={{
                  background: '#eef0ea',
                  color: '#414842',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

