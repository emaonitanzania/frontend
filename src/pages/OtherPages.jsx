import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsAPI, getSessionId } from '../services/api';

const HISTORY_TARGET_OPTIONS = [
  { value: 'ward', label: 'Ward Councillor', labelSw: 'Diwani wa Kata' },
  { value: 'district', label: 'District Commissioner', labelSw: 'Mkuu wa Wilaya' },
  { value: 'regional', label: 'Regional Commissioner', labelSw: 'Mkuu wa Mkoa' },
  { value: 'minister', label: 'Minister', labelSw: 'Waziri' },
  { value: 'president', label: "President's Office", labelSw: 'Ofisi ya Rais' },
];

const HISTORY_CATEGORY_OPTIONS = [
  { value: 'water', label: 'Water Services', labelSw: 'Huduma za Maji' },
  { value: 'electricity', label: 'Electricity', labelSw: 'Umeme' },
  { value: 'roads', label: 'Roads & Infrastructure', labelSw: 'Barabara na Miundombinu' },
  { value: 'health', label: 'Health Services', labelSw: 'Huduma za Afya' },
  { value: 'education', label: 'Education', labelSw: 'Elimu' },
  { value: 'security', label: 'Security', labelSw: 'Usalama' },
  { value: 'corruption', label: 'Corruption', labelSw: 'Rushwa' },
  { value: 'housing', label: 'Housing', labelSw: 'Makazi' },
  { value: 'sanitation', label: 'Sanitation', labelSw: 'Usafi' },
  { value: 'transportation', label: 'Transportation', labelSw: 'Usafiri' },
  { value: 'other', label: 'Other', labelSw: 'Nyingine' },
];

const HISTORY_STATUS_LABELS = {
  submitted: { en: 'Submitted', sw: 'Imewasilishwa' },
  ai_responded: { en: 'AI Responded', sw: 'AI Imejibu' },
  pending: { en: 'Pending', sw: 'Inasubiri' },
  in_progress: { en: 'In Progress', sw: 'Inaendelea' },
  escalated: { en: 'Escalated', sw: 'Imepandishwa' },
  resolved: { en: 'Resolved', sw: 'Imetatuliwa' },
  closed: { en: 'Closed', sw: 'Imefungwa' },
};

// InboxPage.jsx
export function InboxPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const queryClient = useQueryClient();
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);
  const [feedbackState, setFeedbackState] = useState({});
  const rowPadding = isMobile ? '14px 14px' : '18px 28px';

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'inbox', sessionId],
    queryFn: () => complaintsAPI.inbox(sessionId),
    enabled: !!sessionId,
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ complaintId, satisfied }) =>
      complaintsAPI.feedback(
        complaintId,
        { satisfied_with_leader: satisfied },
        sessionId,
      ),
    onSuccess: (_data, variables) => {
      setFeedbackState((prev) => ({
        ...prev,
        [variables.complaintId]: variables.satisfied ? 'positive' : 'negative',
      }));
      queryClient.invalidateQueries({ queryKey: ['complaints', 'list', sessionId] });
    },
  });

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Inbox', 'Ujumbe')}
        subtitle={tr('Replied complaints from different leaders', 'Malalamiko yaliyojibiwa na viongozi mbalimbali')}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sessionId && <StateBlock dark={dark} label={tr('No active session found. Send a message first.', 'Hakuna sesi hai. Tuma ujumbe kwanza.')} />}
        {sessionId && isLoading && <StateBlock dark={dark} label={tr('Loading inbox...', 'Inapakia ujumbe...')} />}
        {sessionId && isError && <StateBlock dark={dark} label={tr('Unable to load inbox messages.', 'Imeshindwa kupakia ujumbe.')} isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && <StateBlock dark={dark} label={tr('No replies yet.', 'Bado hakuna majibu.')} />}

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
                {m.badge !== 'AI' && (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: 12, color: textSub }}>
                      {tr('Was this leader response helpful?', 'Je, jibu la kiongozi limekusaidia?')}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        feedbackMutation.mutate({ complaintId: m.complaint_id, satisfied: true });
                      }}
                      disabled={feedbackMutation.isPending}
                      style={{
                        border: '1px solid #10b981',
                        background: feedbackState[m.complaint_id] === 'positive' ? '#10b981' : surface,
                        color: feedbackState[m.complaint_id] === 'positive' ? '#fff' : '#10b981',
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: feedbackMutation.isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {tr('Helpful', 'Limefaa')}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        feedbackMutation.mutate({ complaintId: m.complaint_id, satisfied: false });
                      }}
                      disabled={feedbackMutation.isPending}
                      style={{
                        border: '1px solid #ef4444',
                        background: feedbackState[m.complaint_id] === 'negative' ? '#ef4444' : surface,
                        color: feedbackState[m.complaint_id] === 'negative' ? '#fff' : '#ef4444',
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: feedbackMutation.isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {tr('Needs work', 'Linahitaji maboresho')}
                    </button>
                  </div>
                )}
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
export function UnrepliedPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
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
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Unreplied', 'Bila Majibu')}
        subtitle={tr('Messages awaiting response from leaders', 'Ujumbe unaosubiri majibu ya viongozi')}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!sessionId && <StateBlock dark={dark} label={tr('No active session found. Send a message first.', 'Hakuna sesi hai. Tuma ujumbe kwanza.')} />}
        {sessionId && isLoading && <StateBlock dark={dark} label={tr('Loading unreplied messages...', 'Inapakia ujumbe usiojibiwa...')} />}
        {sessionId && isError && <StateBlock dark={dark} label={tr('Unable to load unreplied messages.', 'Imeshindwa kupakia ujumbe usiojibiwa.')} isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && (
          <StateBlock dark={dark} label={tr('No pending complaints. Everything has a response.', 'Hakuna malalamiko yanayosubiri. Kila kitu kimejibiwa.')} />
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
                <div style={{ fontSize: 13, color: textSub }}>{tr('To', 'Kwa')}: {item.to} | {tr('Sent', 'Imetumwa')}: {item.sent}</div>
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
                {item.days} {tr('days', 'siku')}
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
                {tr('Resend', 'Tuma Tena')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// HistoryPage.jsx
export function HistoryPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const queryClient = useQueryClient();
  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const sessionId = useMemo(() => getSessionId(), []);
  const rowPadding = isMobile ? '14px 14px' : '18px 28px';
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [historyForm, setHistoryForm] = useState(null);
  const [historyNotice, setHistoryNotice] = useState('');
  const [historyNoticeType, setHistoryNoticeType] = useState('success');

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'history', sessionId],
    queryFn: () => complaintsAPI.history(sessionId),
    enabled: !!sessionId,
  });

  const detailQuery = useQuery({
    queryKey: ['complaints', 'history-detail', selectedHistoryId, sessionId],
    queryFn: () => complaintsAPI.get(selectedHistoryId, sessionId),
    enabled: !!sessionId && !!selectedHistoryId,
  });
  const detailDraft = useMemo(
    () => (detailQuery.data ? buildHistoryDraft(detailQuery.data) : null),
    [detailQuery.data],
  );
  const activeHistoryForm = historyForm || detailDraft;

  const resendMutation = useMutation({
    mutationFn: async (draft) => {
      if (!draft) {
        throw new Error('No history draft available.');
      }
      if (draft.type === 'letter') {
        return complaintsAPI.createLetter(buildLetterResendPayload(draft, sessionId));
      }
      return complaintsAPI.create(buildMessageResendPayload(draft, sessionId));
    },
    onSuccess: (response, draft) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setHistoryNoticeType('success');
      setHistoryNotice(
        tr(
          `${draft.type === 'letter' ? 'Letter' : 'Message'} resent successfully. New reference ID: #${response.id}.`,
          `${draft.type === 'letter' ? 'Barua' : 'Ujumbe'} umetumwa tena kwa mafanikio. Namba mpya ya rejea: #${response.id}.`,
        ),
      );
      setSelectedHistoryId(null);
      setHistoryForm(null);
    },
    onError: () => {
      setHistoryNoticeType('error');
      setHistoryNotice(
        tr(
          'Unable to resend this history item right now. Please review the details and try again.',
          'Imeshindikana kutuma tena item hii ya historia kwa sasa. Tafadhali hakiki taarifa kisha jaribu tena.',
        ),
      );
    },
  });

  const normalizedPostcode = normalizeHistoryPostcode(activeHistoryForm?.postcode || '');
  const hasInvalidPostcode = !!activeHistoryForm?.postcode && normalizedPostcode.length !== 5;
  const canResend = Boolean(
    activeHistoryForm
    && activeHistoryForm.text.trim()
    && (activeHistoryForm.location.trim() || normalizedPostcode)
    && !hasInvalidPostcode
    && (
      activeHistoryForm.type !== 'letter'
      || (
        activeHistoryForm.subject.trim()
        && activeHistoryForm.senderPoBox.trim()
        && parseReceiverPoBoxes(activeHistoryForm.receiverPoBoxes).length > 0
      )
    ),
  );

  const closeHistoryModal = () => {
    setSelectedHistoryId(null);
    setHistoryForm(null);
  };

  const updateHistoryField = (field, value) => {
    setHistoryForm((prev) => ({ ...(prev || detailDraft || {}), [field]: value }));
  };

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('History', 'Historia')}
        subtitle={tr('All messages and letters you have sent', 'Ujumbe na barua zote ulizotuma')}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {historyNotice && (
          <div
            style={{
              margin: isMobile ? '12px 12px 0' : '18px 24px 0',
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${historyNoticeType === 'error' ? '#fecaca' : '#bbf7d0'}`,
              background: historyNoticeType === 'error' ? (dark ? '#3f1d1d' : '#fef2f2') : (dark ? '#142c1f' : '#f0fdf4'),
              color: historyNoticeType === 'error' ? '#ef4444' : '#16a34a',
              fontSize: 13.5,
            }}
          >
            {historyNotice}
          </div>
        )}
        {!sessionId && <StateBlock dark={dark} label={tr('No active session found. Send a message first.', 'Hakuna sesi hai. Tuma ujumbe kwanza.')} />}
        {sessionId && isLoading && <StateBlock dark={dark} label={tr('Loading history...', 'Inapakia historia...')} />}
        {sessionId && isError && <StateBlock dark={dark} label={tr('Unable to load history.', 'Imeshindwa kupakia historia.')} isError />}
        {sessionId && !isLoading && !isError && data.length === 0 && <StateBlock dark={dark} label={tr('No history found yet.', 'Bado hakuna historia.')} />}

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
            onClick={() => {
              setHistoryNotice('');
              setHistoryForm(null);
              setSelectedHistoryId(item.id);
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
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{tr('To', 'Kwa')}: {item.to}</span>
                  <Badge label={item.badge} isAI={item.badge === 'AI'} dark={dark} />
                  {item.type === 'letter' && <Badge label={tr('Letter', 'Barua')} isLetter dark={dark} />}
                </div>
                <div style={{ fontSize: 13, color: textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.text}
                </div>
                <div style={{ fontSize: 12, color: textSub, marginTop: 4 }}>
                  {formatHistoryStatus(item.status, tr)} | {item.location}
                  {item.postcode ? ` • ${item.postcode}` : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: textSub, flexShrink: 0, marginLeft: isMobile ? 0 : 16 }}>{item.date}</div>
          </div>
        ))}
      </div>

      {selectedHistoryId && (
        <div
          onClick={closeHistoryModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 24,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 860,
              height: isMobile ? '100%' : 'min(88vh, 820px)',
              background: surface,
              borderRadius: isMobile ? 0 : 16,
              border: `1px solid ${border}`,
              boxShadow: '0 30px 60px rgba(15, 23, 42, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: isMobile ? '14px 14px 12px' : '18px 24px 16px',
                borderBottom: `1px solid ${border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600 }}>
                  {tr('History Details', 'Maelezo ya Historia')}
                </div>
                <div style={{ fontSize: 13, color: textSub, marginTop: 4 }}>
                  {tr('View, edit, and resend this item without changing the original record.', 'Tazama, hariri, na tuma tena item hii bila kubadilisha kumbukumbu ya mwanzo.')}
                </div>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                style={{
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: dark ? '#f8fafc' : '#1e293b',
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 14 : 24 }}>
              {detailQuery.isLoading && <StateBlock dark={dark} label={tr('Loading history details...', 'Inapakia maelezo ya historia...')} />}
              {detailQuery.isError && <StateBlock dark={dark} label={tr('Unable to load this history item.', 'Imeshindwa kupakia item hii ya historia.')} isError />}

              {!detailQuery.isLoading && !detailQuery.isError && activeHistoryForm && (
                <>
                  {historyNotice && selectedHistoryId && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1px solid ${historyNoticeType === 'error' ? '#fecaca' : '#bbf7d0'}`,
                        background: historyNoticeType === 'error' ? (dark ? '#3f1d1d' : '#fef2f2') : (dark ? '#142c1f' : '#f0fdf4'),
                        color: historyNoticeType === 'error' ? '#ef4444' : '#16a34a',
                        fontSize: 13.5,
                      }}
                    >
                      {historyNotice}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <HistoryStatCard dark={dark} label={tr('Reference', 'Rejea')} value={`#${activeHistoryForm.id}`} />
                    <HistoryStatCard dark={dark} label={tr('Type', 'Aina')} value={activeHistoryForm.type === 'letter' ? tr('Letter', 'Barua') : tr('Message', 'Ujumbe')} />
                    <HistoryStatCard dark={dark} label={tr('Status', 'Hali')} value={formatHistoryStatus(activeHistoryForm.status, tr)} />
                    <HistoryStatCard dark={dark} label={tr('Current Leader', 'Kiongozi wa Sasa')} value={activeHistoryForm.assignedTo || tr('Unassigned', 'Hajatengwa')} />
                  </div>

                  <div
                    style={{
                      background: dark ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: isMobile ? 12 : 16,
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{tr('Original timeline', 'Mfuatano wa asili')}</div>
                    <div style={{ fontSize: 13, color: textSub }}>
                      {tr('Submitted', 'Imetumwa')}: {formatHistoryDateTime(activeHistoryForm.submittedAt)}<br />
                      {tr('Location', 'Eneo')}: {activeHistoryForm.location || tr('Unspecified', 'Haijabainishwa')}
                      {activeHistoryForm.postcode ? ` • ${activeHistoryForm.postcode}` : ''}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    <FormField label={tr('Send To', 'Tuma Kwa')}>
                      <select
                        value={activeHistoryForm.target}
                        onChange={(event) => updateHistoryField('target', event.target.value)}
                        style={buildHistoryInputStyle(dark, border)}
                      >
                        {HISTORY_TARGET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {tr(option.label, option.labelSw)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label={tr('Category', 'Kategoria')}>
                      <select
                        value={activeHistoryForm.category}
                        onChange={(event) => updateHistoryField('category', event.target.value)}
                        style={buildHistoryInputStyle(dark, border)}
                      >
                        {HISTORY_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {tr(option.label, option.labelSw)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label={tr('Location', 'Location')}>
                      <input
                        value={activeHistoryForm.location}
                        onChange={(event) => updateHistoryField('location', event.target.value)}
                        style={buildHistoryInputStyle(dark, border)}
                        placeholder={tr('Example: Ubungo, Dar es Salaam', 'Mfano: Ubungo, Dar es Salaam')}
                      />
                    </FormField>

                    <FormField label={tr('Postcode', 'Postcode')}>
                      <input
                        value={activeHistoryForm.postcode}
                        onChange={(event) => updateHistoryField('postcode', event.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                        style={buildHistoryInputStyle(dark, border)}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="41202"
                      />
                      {hasInvalidPostcode && (
                        <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
                          {tr('Postcode must have 5 digits.', 'Postcode lazima iwe na tarakimu 5.')}
                        </div>
                      )}
                    </FormField>
                  </div>

                  {activeHistoryForm.type === 'letter' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: 14,
                        marginBottom: 14,
                      }}
                    >
                      <FormField label={tr('Sender P.O. Box', 'S.L.P ya Mtumaji')}>
                        <input
                          value={activeHistoryForm.senderPoBox}
                          onChange={(event) => updateHistoryField('senderPoBox', event.target.value)}
                          style={buildHistoryInputStyle(dark, border)}
                        />
                      </FormField>

                      <FormField label={tr('Receiver P.O. Boxes', 'S.L.P za Mpokeaji')}>
                        <textarea
                          value={activeHistoryForm.receiverPoBoxes}
                          onChange={(event) => updateHistoryField('receiverPoBoxes', event.target.value)}
                          style={buildHistoryTextareaStyle(dark, border, 92)}
                          placeholder={tr('One PO Box per line', 'Weka S.L.P moja kwa kila mstari')}
                        />
                      </FormField>
                    </div>
                  )}

                  {activeHistoryForm.type !== 'letter' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: 14,
                        marginBottom: 14,
                      }}
                    >
                      <FormField label={tr('Age Group', 'Rika')}>
                        <input
                          value={activeHistoryForm.ageGroup}
                          onChange={(event) => updateHistoryField('ageGroup', event.target.value)}
                          style={buildHistoryInputStyle(dark, border)}
                          placeholder={tr('Example: 18-25', 'Mfano: 18-25')}
                        />
                      </FormField>

                      <FormField label={tr('Topic', 'Mada')}>
                        <input
                          value={activeHistoryForm.topic}
                          onChange={(event) => updateHistoryField('topic', event.target.value)}
                          style={buildHistoryInputStyle(dark, border)}
                          placeholder={tr('Example: ajira, elimu', 'Mfano: ajira, elimu')}
                        />
                      </FormField>
                    </div>
                  )}

                  <FormField label={activeHistoryForm.type === 'letter' ? tr('Subject', 'Kichwa cha Barua') : tr('Subject / Title', 'Kichwa / Title')}>
                    <input
                      value={activeHistoryForm.subject}
                      onChange={(event) => updateHistoryField('subject', event.target.value)}
                      style={buildHistoryInputStyle(dark, border)}
                      placeholder={tr('Short summary', 'Muhtasari mfupi')}
                    />
                  </FormField>

                  <div style={{ marginTop: 14 }}>
                    <FormField label={activeHistoryForm.type === 'letter' ? tr('Letter Body', 'Mwili wa Barua') : tr('Message / Complaint', 'Ujumbe / Malalamiko')}>
                      <textarea
                        value={activeHistoryForm.text}
                        onChange={(event) => updateHistoryField('text', event.target.value)}
                        style={buildHistoryTextareaStyle(dark, border, isMobile ? 180 : 220)}
                        placeholder={tr('Edit the content before resending', 'Hariri maudhui kabla ya kutuma tena')}
                      />
                    </FormField>
                  </div>

                  {Array.isArray(activeHistoryForm.attachments) && activeHistoryForm.attachments.length > 0 && (
                    <div
                      style={{
                        marginTop: 18,
                        background: dark ? '#0f172a' : '#f8fafc',
                        border: `1px solid ${border}`,
                        borderRadius: 12,
                        padding: isMobile ? 12 : 16,
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>{tr('Attachments', 'Viambatisho')}</div>
                      <div style={{ fontSize: 12.5, color: textSub, marginBottom: 10 }}>
                        {tr('These are shown for reference only. Resend uses the edited text fields above.', 'Hivi vinaonyeshwa kwa marejeo tu. Kutuma tena kutatumia maandishi yaliyohaririwa hapo juu.')}
                      </div>
                      {activeHistoryForm.attachments.map((attachment) => (
                        <div key={attachment.id} style={{ fontSize: 13, color: dark ? '#e2e8f0' : '#334155', marginBottom: 6 }}>
                          {attachment.filename}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 18,
                      background: dark ? '#0f172a' : '#f8fafc',
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: isMobile ? 12 : 16,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>{tr('Responses', 'Majibu')}</div>
                    {activeHistoryForm.responses.length === 0 && (
                      <div style={{ fontSize: 13, color: textSub }}>
                        {tr('No responses have been recorded for this item yet.', 'Bado hakuna majibu yaliyorekodiwa kwa item hii.')}
                      </div>
                    )}
                    {activeHistoryForm.responses.map((response) => (
                      <div
                        key={response.id}
                        style={{
                          borderTop: `1px solid ${border}`,
                          paddingTop: 10,
                          marginTop: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{response.responder_name}</div>
                          <div style={{ fontSize: 12, color: textSub }}>{formatHistoryDateTime(response.timestamp)}</div>
                        </div>
                        <div style={{ fontSize: 13, color: textSub, marginTop: 5, lineHeight: 1.65 }}>
                          {response.response_text}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                borderTop: `1px solid ${border}`,
                padding: isMobile ? 14 : 18,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={closeHistoryModal}
                style={{
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: dark ? '#f8fafc' : '#334155',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {tr('Close', 'Funga')}
              </button>
              <button
                type="button"
                onClick={() => resendMutation.mutate({ ...activeHistoryForm, postcode: normalizedPostcode })}
                disabled={!canResend || resendMutation.isPending}
                style={{
                  border: 'none',
                  background: !canResend || resendMutation.isPending ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '10px 16px',
                  cursor: !canResend || resendMutation.isPending ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >
                {resendMutation.isPending ? tr('Resending...', 'Inatuma tena...') : tr('Resend Edited Copy', 'Tuma Tena Nakala Iliyohaririwa')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// EscalationPage.jsx
export function EscalationPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
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

  const complaints = useMemo(() => complaintsQuery.data || [], [complaintsQuery.data]);
  const effectiveSelectedComplaintId = complaints.some((item) => item.id === selectedComplaintId)
    ? selectedComplaintId
    : (complaints[0]?.id ?? null);

  const timelineQuery = useQuery({
    queryKey: ['complaints', 'timeline', effectiveSelectedComplaintId, sessionId],
    queryFn: () => complaintsAPI.timeline(effectiveSelectedComplaintId, sessionId),
    enabled: !!sessionId && !!effectiveSelectedComplaintId,
  });

  const levels = timelineQuery.data?.levels || [];

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Escalation Tracking', 'Ufuatiliaji wa Rufaa')}
        subtitle={tr('Track how your complaints escalate through leadership levels', 'Fuatilia jinsi malalamiko yako yanavyopandishwa ngazi za uongozi')}
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
          {!sessionId && <StateBlock dark={dark} label={tr('No active session found. Send a message first.', 'Hakuna sesi hai. Tuma ujumbe kwanza.')} />}
          {sessionId && complaintsQuery.isLoading && <StateBlock dark={dark} label={tr('Loading complaints...', 'Inapakia malalamiko...')} />}
          {sessionId && complaintsQuery.isError && <StateBlock dark={dark} label={tr('Unable to load complaints.', 'Imeshindwa kupakia malalamiko.')} isError />}
          {sessionId && !complaintsQuery.isLoading && !complaintsQuery.isError && complaints.length === 0 && (
            <StateBlock dark={dark} label={tr('No complaints available for escalation tracking.', 'Hakuna malalamiko ya kufuatilia rufaa.')} />
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
                <div style={{ fontWeight: 600, fontSize: 16 }}>{tr('Complaint Escalation Timeline', 'Ratiba ya Kupanda Ngazi ya Malalamiko')}</div>
                <select
                  value={effectiveSelectedComplaintId || ''}
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

              {timelineQuery.isLoading && <StateBlock dark={dark} label={tr('Loading timeline...', 'Inapakia ratiba...')} />}
              {timelineQuery.isError && <StateBlock dark={dark} label={tr('Unable to load timeline.', 'Imeshindwa kupakia ratiba.')} isError />}

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
export function FAQsPage({ dark, isMobile = false, language = 'en', tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const [open, setOpen] = useState(null);
  const border = dark ? '#334155' : '#e2e8f0';
  const textSub = dark ? '#94a3b8' : '#64748b';

  const faqs = language === 'sw' ? [
    {
      q: 'Ninawezaje kuwasilisha malalamiko?',
      a: 'Nenda kwenye sehemu ya Mazungumzo, andika malalamiko yako kwenye kisanduku cha ujumbe kisha bonyeza Tuma, au tumia Barua kuandika barua rasmi.',
    },
    {
      q: 'Tofauti kati ya Ujumbe na Barua ni ipi?',
      a: '"Ujumbe" ni kwa mawasiliano ya haraka kwa AI au viongozi maalum. "Barua" ni kuandaa barua rasmi yenye taarifa za S.L.P.',
    },
    {
      q: 'Inachukua muda gani kupata majibu?',
      a: 'Majibu ya AI hupatikana papo hapo. Majibu ya viongozi yanatarajiwa ndani ya siku 3 za kazi. Yasipopatikana, malalamiko yatapandishwa ngazi kiotomatiki.',
    },
    {
      q: 'Nini hutokea kama malalamiko yangu hayajibiwi?',
      a: 'Malalamiko yasiyopata jibu ndani ya siku 3 hupandishwa ngazi kwa mamlaka ya juu na mfumo huweka kumbukumbu ya kiongozi ambaye hajajibu.',
    },
    {
      q: 'Naweza kutuma malalamiko bila kujitambulisha?',
      a: 'Ndiyo. Unaweza kutuma malalamiko bila kusajili akaunti. Usajili unahitajika kwa viongozi tu.',
    },
    {
      q: 'Msaidizi wa AI anasaidiaje?',
      a: 'AI hutafuta maelfu ya malalamiko yaliyotatuliwa ili kukupa majibu ya haraka, mapendekezo ya suluhisho, na kusaidia kuandika barua rasmi.',
    },
  ] : [
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
      <PageHeader dark={dark} isMobile={isMobile} title={tr('FAQs', 'Maswali')} subtitle={tr('Frequently Asked Questions', 'Maswali Yanayoulizwa Mara kwa Mara')} />
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

function normalizeHistoryPostcode(value) {
  return String(value || '').replace(/[^\d]/g, '').slice(0, 5);
}

function normalizeHistoryTarget(value) {
  const raw = String(value || '').trim().toLowerCase();
  const mapping = {
    ward: 'ward',
    district: 'district',
    regional: 'regional',
    minister: 'minister',
    ministerial: 'minister',
    president: 'president',
    presidential: 'president',
  };
  return mapping[raw] || 'ward';
}

function parseReceiverPoBoxes(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildHistoryDraft(detail) {
  const metadata = detail?.metadata || {};
  const letter = metadata?.letter || {};
  return {
    id: detail.id,
    type: metadata.type || 'message',
    status: detail.status || '',
    assignedTo: detail.assigned_to_leader || '',
    submittedAt: detail.submitted_at || '',
    target: normalizeHistoryTarget(metadata.target || metadata.send_to || detail.leader_level),
    subject: letter.subject || detail.title || '',
    text: letter.body || detail.description || '',
    location: detail.location || '',
    postcode: detail.postcode || '',
    category: detail.category || 'other',
    senderPoBox: letter.sender_po_box || '',
    receiverPoBoxes: Array.isArray(letter.receiver_po_boxes) ? letter.receiver_po_boxes.join('\n') : '',
    ageGroup: metadata.age_group || '',
    topic: metadata.topic || '',
    attachments: Array.isArray(detail.attachments) ? detail.attachments : [],
    responses: Array.isArray(detail.responses) ? detail.responses : [],
  };
}

function buildMessageResendPayload(draft, sessionId) {
  return {
    session_id: sessionId,
    title: draft.subject.trim(),
    description: draft.text.trim(),
    category: draft.category || 'other',
    location: draft.location.trim(),
    postcode: normalizeHistoryPostcode(draft.postcode),
    send_to: draft.target,
    age_group: draft.ageGroup.trim(),
    topic: draft.topic.trim(),
    metadata: {
      type: 'message',
      resend_from: draft.id,
    },
  };
}

function buildLetterResendPayload(draft, sessionId) {
  return {
    session_id: sessionId,
    sender_po_box: draft.senderPoBox.trim(),
    receiver_po_boxes: parseReceiverPoBoxes(draft.receiverPoBoxes),
    subject: draft.subject.trim(),
    body: draft.text.trim(),
    send_to: draft.target,
    location: draft.location.trim(),
    postcode: normalizeHistoryPostcode(draft.postcode),
    category: draft.category || 'other',
  };
}

function formatHistoryStatus(status, tr) {
  const label = HISTORY_STATUS_LABELS[status];
  return label ? tr(label.en, label.sw) : status || tr('Unknown', 'Haijulikani');
}

function formatHistoryDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildHistoryInputStyle(dark, border) {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#1e293b',
    fontSize: 14,
    outline: 'none',
  };
}

function buildHistoryTextareaStyle(dark, border, minHeight) {
  return {
    ...buildHistoryInputStyle(dark, border),
    minHeight,
    resize: 'vertical',
    lineHeight: 1.6,
  };
}

function HistoryStatCard({ dark, label, value }) {
  return (
    <div
      style={{
        background: dark ? '#0f172a' : '#f8fafc',
        border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11.5, color: dark ? '#94a3b8' : '#64748b', marginBottom: 5 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7 }}>{label}</div>
      {children}
    </label>
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
