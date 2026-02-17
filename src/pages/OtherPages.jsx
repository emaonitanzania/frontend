import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsAPI, getSessionId } from '../services/api';

// InboxPage.jsx
export function InboxPage({ dark, isMobile = false }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);
  const rowPadding = isMobile ? '14px 14px' : '18px 28px';

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'inbox', sessionId],
    queryFn: () => complaintsAPI.inbox(sessionId),
    enabled: !!sessionId,
  });

  return (
    <>
      <PageHeader dark={dark} isMobile={isMobile} title="Inbox" subtitle="Replied complaints from different leaders" />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sessionId && <StateBlock dark={dark} label="No active session found. Send a message first." />}
        {sessionId && isLoading && <StateBlock dark={dark} label="Loading inbox..." />}
        {sessionId && isError && <StateBlock dark={dark} label="Unable to load inbox messages." isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && <StateBlock dark={dark} label="No replies yet." />}

        {sessionId && !isLoading && !isError && data.map((m) => (
          <div
            key={m.id}
            style={{
              padding: rowPadding,
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? 8 : 0,
              cursor: 'pointer',
              background: m.unread ? (dark ? '#1e2d45' : '#f0f7ff') : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? '#334155' : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = m.unread ? (dark ? '#1e2d45' : '#f0f7ff') : 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: isMobile ? 34 : 38,
                  height: isMobile ? 34 : 38,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 14 : 15,
                  background: m.badge === 'AI' ? (dark ? '#1e3a8a' : '#dbeafe') : (dark ? '#14532d' : '#dcfce7'),
                  color: m.badge === 'AI' ? '#3b82f6' : '#16a34a',
                }}
              >
                <i className={`fas ${m.badge === 'AI' ? 'fa-robot' : 'fa-user-tie'}`} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: m.unread ? 700 : 500, fontSize: isMobile ? 14 : 14.5 }}>{m.from}</span>
                  <Badge label={m.badge} isAI={m.badge === 'AI'} dark={dark} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: m.unread ? 600 : 400, marginBottom: 2 }}>{m.subject}</div>
                <div style={{ fontSize: 13, color: textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.preview}</div>
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: textSub,
                flexShrink: 0,
                marginLeft: isMobile ? 0 : 16,
                textAlign: isMobile ? 'left' : 'right',
                width: isMobile ? '100%' : 'auto',
                display: isMobile ? 'flex' : 'block',
                justifyContent: isMobile ? 'space-between' : 'initial',
                alignItems: 'center',
              }}
            >
              <span>{m.date}</span>
              {m.unread && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#2563eb',
                    marginLeft: isMobile ? 8 : 'auto',
                    marginTop: isMobile ? 0 : 6,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// UnrepliedPage.jsx
export function UnrepliedPage({ dark, isMobile = false }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);
  const rowPadding = isMobile ? '14px 14px' : '18px 28px';

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'unreplied', sessionId],
    queryFn: () => complaintsAPI.unreplied(sessionId),
    enabled: !!sessionId,
  });

  return (
    <>
      <PageHeader dark={dark} isMobile={isMobile} title="Unreplied" subtitle="Messages awaiting response from leaders" />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sessionId && <StateBlock dark={dark} label="No active session found. Send a message first." />}
        {sessionId && isLoading && <StateBlock dark={dark} label="Loading unreplied messages..." />}
        {sessionId && isError && <StateBlock dark={dark} label="Unable to load unreplied messages." isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && (
          <StateBlock dark={dark} label="No pending complaints. Everything has a response." />
        )}

        {sessionId && !isLoading && !isError && data.map((item) => (
          <div
            key={item.id}
            style={{
              padding: rowPadding,
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? 10 : 0,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? '#334155' : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: isMobile ? 34 : 38,
                  height: isMobile ? 34 : 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.urgent ? (dark ? '#450a0a' : '#fef2f2') : (dark ? '#334155' : '#f1f5f9'),
                  color: item.urgent ? '#ef4444' : textSub,
                  fontSize: isMobile ? 14 : 15,
                  flexShrink: 0,
                }}
              >
                <i className={`fas ${item.urgent ? 'fa-exclamation-circle' : 'fa-envelope'}`} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3 }}>{item.subject}</div>
                <div style={{ fontSize: 13, color: textSub }}>To: {item.to} | Sent: {item.sent}</div>
              </div>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right', flexShrink: 0, marginLeft: isMobile ? 0 : 16 }}>
              <div
                style={{
                  background: item.urgent ? '#ef4444' : (dark ? '#334155' : '#e2e8f0'),
                  color: item.urgent ? '#fff' : textSub,
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                {item.days} days
              </div>
              <button
                style={{
                  marginTop: 8,
                  background: 'transparent',
                  border: '1px solid #2563eb',
                  color: '#2563eb',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                Resend
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// HistoryPage.jsx
export function HistoryPage({ dark, isMobile = false }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);
  const rowPadding = isMobile ? '14px 14px' : '18px 28px';

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'history', sessionId],
    queryFn: () => complaintsAPI.history(sessionId),
    enabled: !!sessionId,
  });

  return (
    <>
      <PageHeader dark={dark} isMobile={isMobile} title="History" subtitle="All messages and letters you have sent" />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sessionId && <StateBlock dark={dark} label="No active session found. Send a message first." />}
        {sessionId && isLoading && <StateBlock dark={dark} label="Loading history..." />}
        {sessionId && isError && <StateBlock dark={dark} label="Unable to load history." isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && <StateBlock dark={dark} label="No history found yet." />}

        {sessionId && !isLoading && !isError && data.map((item) => (
          <div
            key={item.id}
            style={{
              padding: rowPadding,
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? 8 : 0,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? '#334155' : '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: isMobile ? 34 : 38,
                  height: isMobile ? 34 : 38,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 14 : 15,
                  background: item.badge === 'AI' ? (dark ? '#1e3a8a' : '#dbeafe') : (dark ? '#334155' : '#f1f5f9'),
                  color: item.badge === 'AI' ? '#3b82f6' : textSub,
                }}
              >
                <i className={`fas ${item.type === 'letter' ? 'fa-envelope' : (item.badge === 'AI' ? 'fa-robot' : 'fa-user-tie')}`} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>To: {item.to}</span>
                  <Badge label={item.badge} isAI={item.badge === 'AI'} dark={dark} />
                  {item.type === 'letter' && <Badge label="Letter" isLetter dark={dark} />}
                </div>
                <div style={{ fontSize: 13, color: textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.text}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: textSub, flexShrink: 0, marginLeft: isMobile ? 0 : 16 }}>{item.date}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// EscalationPage.jsx
export function EscalationPage({ dark, isMobile = false }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);

  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const complaintsQuery = useQuery({
    queryKey: ['complaints', 'list', sessionId],
    queryFn: () => complaintsAPI.list(sessionId),
    enabled: !!sessionId,
  });

  const complaints = complaintsQuery.data || [];

  useEffect(() => {
    if (!complaints.length) {
      setSelectedComplaintId(null);
      return;
    }

    if (!selectedComplaintId || !complaints.some((item) => item.id === selectedComplaintId)) {
      setSelectedComplaintId(complaints[0].id);
    }
  }, [complaints, selectedComplaintId]);

  const timelineQuery = useQuery({
    queryKey: ['complaints', 'timeline', selectedComplaintId, sessionId],
    queryFn: () => complaintsAPI.timeline(selectedComplaintId, sessionId),
    enabled: !!sessionId && !!selectedComplaintId,
  });

  const levels = timelineQuery.data?.levels || [];

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title="Escalation Tracking"
        subtitle="Track how your complaints escalate through leadership levels"
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 10px' : '24px 30px' }}>
        <div
          style={{
            background: surface,
            borderRadius: 12,
            border: `1px solid ${border}`,
            padding: isMobile ? 14 : 24,
            maxWidth: isMobile ? '100%' : 640,
            margin: '0 auto',
          }}
        >
          {!sessionId && <StateBlock dark={dark} label="No active session found. Send a message first." />}
          {sessionId && complaintsQuery.isLoading && <StateBlock dark={dark} label="Loading complaints..." />}
          {sessionId && complaintsQuery.isError && <StateBlock dark={dark} label="Unable to load complaints." isError />}
          {sessionId && !complaintsQuery.isLoading && !complaintsQuery.isError && complaints.length === 0 && (
            <StateBlock dark={dark} label="No complaints available for escalation tracking." />
          )}

          {sessionId && !complaintsQuery.isLoading && !complaintsQuery.isError && complaints.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 10 : 0,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>Complaint Escalation Timeline</div>
                <select
                  value={selectedComplaintId || ''}
                  onChange={(e) => setSelectedComplaintId(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    background: surface,
                    color: dark ? '#f1f5f9' : '#1e293b',
                    maxWidth: isMobile ? '100%' : 280,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {complaints.map((complaint) => (
                    <option key={complaint.id} value={complaint.id}>
                      {complaint.title}
                    </option>
                  ))}
                </select>
              </div>

              {timelineQuery.isLoading && <StateBlock dark={dark} label="Loading timeline..." />}
              {timelineQuery.isError && <StateBlock dark={dark} label="Unable to load timeline." isError />}

              {!timelineQuery.isLoading && !timelineQuery.isError && (
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 17,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: border,
                    }}
                  />

                  {levels.map((lvl, i) => (
                    <div key={`${lvl.label}_${i}`} style={{ display: 'flex', gap: 14, marginBottom: i < levels.length - 1 ? 22 : 0 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          flexShrink: 0,
                          border: `2px solid ${lvl.color}`,
                          background: lvl.active ? lvl.color : (lvl.done ? `${lvl.color}22` : (dark ? '#334155' : '#f8fafc')),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                          position: 'relative',
                        }}
                      >
                        <i
                          className={`fas ${lvl.done ? 'fa-times' : (lvl.active ? 'fa-spinner fa-spin' : 'fa-circle')}`}
                          style={{ fontSize: 13, color: lvl.active ? '#fff' : lvl.color }}
                        />
                      </div>

                      <div style={{ paddingBottom: 4, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'flex-start' : 'flex-start',
                            gap: isMobile ? 4 : 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 2 }}>{lvl.label}</div>
                            <div style={{ fontSize: 13, color: textSub }}>{lvl.leader}</div>
                          </div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 20,
                                display: 'inline-block',
                                background: lvl.active ? '#fef9c3' : (lvl.done ? '#fee2e2' : (dark ? '#334155' : '#f1f5f9')),
                                color: lvl.active ? '#854d0e' : (lvl.done ? '#991b1b' : textSub),
                              }}
                            >
                              {lvl.status}
                            </div>
                            <div style={{ fontSize: 11, color: textSub, marginTop: 4 }}>{lvl.date}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// FAQsPage.jsx
export function FAQsPage({ dark, isMobile = false }) {
  const [open, setOpen] = useState(null);
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';

  const faqs = [
    {
      q: 'How do I submit a complaint?',
      a: 'Go to the Chats section, type your complaint in the message box and click Send, or use the Barua option to compose a formal letter.',
    },
    {
      q: 'What is the difference between Ujumbe and Barua?',
      a: '"Ujumbe" is for quick messages to AI or specific leaders. "Barua" is for composing formal letters with PO Box details and a proper structure.',
    },
    {
      q: 'How long does it take to get a response?',
      a: 'AI responses are instant. Leader responses should come within 3 working days. If not received, your complaint will be automatically escalated.',
    },
    {
      q: 'What happens if my complaint is ignored?',
      a: 'If a complaint receives no response within 3 days, the system automatically escalates it to a higher authority and tags the non-responsive leader.',
    },
    {
      q: 'Can I submit complaints anonymously?',
      a: 'Yes. You can submit complaints without registering. Registration is optional and only required for leaders.',
    },
    {
      q: 'How does the AI assistant help?',
      a: 'The AI searches thousands of previously resolved complaints to give you instant answers, suggest solutions, and draft formal letters.',
    },
  ];

  return (
    <>
      <PageHeader dark={dark} isMobile={isMobile} title="FAQs" subtitle="Frequently Asked Questions" />
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4px 0' : '8px 0' }}>
        {faqs.map((faq, i) => (
          <div
            key={i}
            style={{
              borderBottom: `1px solid ${border}`,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%',
                padding: isMobile ? '16px 14px' : '18px 28px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'left',
                color: dark ? '#f1f5f9' : '#1e293b',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark ? '#334155' : '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontWeight: 500, fontSize: isMobile ? 14 : 15 }}>{faq.q}</span>
              <i
                className={`fas fa-chevron-${open === i ? 'up' : 'down'}`}
                style={{ fontSize: 13, color: textSub, flexShrink: 0, marginLeft: 12, transition: 'transform 0.2s' }}
              />
            </button>
            {open === i && (
              <div
                style={{
                  padding: isMobile ? '0 14px 14px 14px' : '0 28px 18px 28px',
                  fontSize: 14,
                  color: textSub,
                  lineHeight: 1.7,
                }}
              >
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// Shared Helpers
function PageHeader({ dark, isMobile = false, title, subtitle }) {
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        padding: isMobile ? '14px 14px' : '18px 30px',
        background: surface,
        borderBottom: `1px solid ${border}`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: isMobile ? 20 : 22, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: isMobile ? 13 : 14, color: textSub }}>{subtitle}</div>
    </div>
  );
}

function Badge({ label, isAI, isLetter, dark }) {
  const bg = isAI ? (dark ? '#1e3a8a' : '#dbeafe') : isLetter ? (dark ? '#3b1c6e' : '#f3e8ff') : (dark ? '#14532d' : '#dcfce7');
  const color = isAI ? '#3b82f6' : isLetter ? '#7c3aed' : '#16a34a';

  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 20,
        padding: '2px 9px',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function StateBlock({ dark, label, isError = false }) {
  const textColor = isError ? '#dc2626' : (dark ? '#94a3b8' : '#64748b');

  return (
    <div
      style={{
        padding: '22px 16px',
        fontSize: 14,
        color: textColor,
      }}
    >
      {label}
    </div>
  );
}
