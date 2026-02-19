import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatAPI, complaintsAPI } from '../services/api';

const SESSION_KEY = 'emaoni_session';

const getOrCreateSession = () => {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const LEADERS = [
  { value: 'ai', label: 'E-Maoni AI Assistant', labelSw: 'Msaidizi wa AI wa E-Maoni' },
  { value: 'ward', label: 'Ward Councillor', labelSw: 'Diwani wa Kata' },
  { value: 'district', label: 'District Commissioner', labelSw: 'Mkuu wa Wilaya' },
  { value: 'regional', label: 'Regional Commissioner', labelSw: 'Mkuu wa Mkoa' },
  { value: 'minister', label: 'Minister', labelSw: 'Waziri' },
  { value: 'president', label: "President's Office", labelSw: 'Ofisi ya Rais' },
];

const LOCATIONS = [
  { value: 'local', label: 'Local Area', labelSw: 'Eneo la Mtaa' },
  { value: 'district', label: 'District Level', labelSw: 'Ngazi ya Wilaya' },
  { value: 'regional', label: 'Regional Level', labelSw: 'Ngazi ya Mkoa' },
  { value: 'national', label: 'National Level', labelSw: 'Ngazi ya Taifa' },
];

export default function ChatPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const queryClient = useQueryClient();
  const createWelcomeMessage = () => ({
    id: 'welcome_ai',
    from: 'bot',
    text: tr(
      "Hello! I'm E-Maoni, your AI assistant. Share your issue and I will help you immediately.",
      'Habari! Mimi ni E-Maoni, msaidizi wako wa AI. Eleza changamoto yako na nitakusaidia mara moja.'
    ),
    time: new Date(),
  });

  const [mode, setMode] = useState('ai'); // 'ai' | 'barua'
  const [aiMessages, setAiMessages] = useState([createWelcomeMessage()]);
  const [baruaNotice, setBaruaNotice] = useState('');
  const [baruaNoticeType, setBaruaNoticeType] = useState('success');
  const [input, setInput] = useState('');
  const [leader, setLeader] = useState('ward');
  const [location, setLocation] = useState('local');
  const [sessionId] = useState(getOrCreateSession);
  const [receivers, setReceivers] = useState(['']);
  const [senderPO, setSenderPO] = useState('');
  const [letterHead, setLetterHead] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [leadersModalOpen, setLeadersModalOpen] = useState(false);
  const [leadersQuery, setLeadersQuery] = useState('');
  const [leadersResult, setLeadersResult] = useState(null);
  const [showAiRoutingOptions, setShowAiRoutingOptions] = useState(!isMobile);
  const [searchingSourceCount, setSearchingSourceCount] = useState(0);
  const [searchingSourceTarget, setSearchingSourceTarget] = useState(0);
  const bottomRef = useRef(null);
  const historyHydratedRef = useRef(false);

  const leaderLabel = (() => {
    const item = LEADERS.find((entry) => entry.value === leader);
    return item ? tr(item.label, item.labelSw) : tr('Leader', 'Kiongozi');
  })();
  const locationLabel = (() => {
    const item = LOCATIONS.find((entry) => entry.value === location);
    return item ? tr(item.label, item.labelSw) : tr('Unspecified', 'Haijabainishwa');
  })();
  const baruaLeaders = LEADERS.filter((item) => item.value !== 'ai');
  const hasValidReceiver = receivers.some((r) => r.trim());

  const conversationQuery = useQuery({
    queryKey: ['ai', 'conversation', sessionId],
    queryFn: () => chatAPI.getConversation(sessionId),
    enabled: !!sessionId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (historyHydratedRef.current || !conversationQuery.isSuccess) return;
    const payload = conversationQuery.data;
    const conversations = Array.isArray(payload) ? payload : (payload?.results || []);
    const conversation = conversations.find((item) => item.session_id === sessionId) || conversations[0];
    const storedMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];

    if (storedMessages.length > 0) {
      const mapped = storedMessages.map((msg) => ({
        id: `srv_${msg.id}`,
        from: msg.sender === 'user' ? 'user' : 'bot',
        text: msg.content || '',
        time: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      setAiMessages(mapped);
    } else {
      setAiMessages([createWelcomeMessage()]);
    }
    historyHydratedRef.current = true;
  }, [conversationQuery.data, conversationQuery.isSuccess, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mode, aiMessages]);

  useEffect(() => {
    if (!isMobile) {
      setShowAiRoutingOptions(true);
    }
  }, [isMobile]);

  const chatMutation = useMutation({
    mutationFn: (data) => chatAPI.sendMessage(data),
    onSuccess: (data) => {
      if (data?.complaint_submitted) {
        queryClient.invalidateQueries({ queryKey: ['complaints'] });
      }
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          from: 'bot',
          text: data.response,
          time: new Date(),
        },
      ]);
    },
    onError: () => {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          from: 'bot',
          text: tr(
            'Sorry, I encountered an issue. Please try again.',
            'Samahani, kumetokea hitilafu. Tafadhali jaribu tena.'
          ),
          time: new Date(),
        },
      ]);
    },
  });

  const letterMutation = useMutation({
    mutationFn: (data) => complaintsAPI.createLetter(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setBaruaNoticeType('success');
      setBaruaNotice(
        tr(
          `Formal letter submitted to ${leaderLabel}. Reference ID: #${data.id}.`,
          `Barua rasmi imetumwa kwa ${leaderLabel}. Namba ya rejea: #${data.id}.`
        )
      );
    },
    onError: () => {
      setBaruaNoticeType('error');
      setBaruaNotice(
        tr(
          'Letter submission failed. Please check required fields and try again.',
          'Kutuma barua kumeshindikana. Tafadhali hakiki sehemu muhimu kisha jaribu tena.'
        )
      );
    },
  });

  const leadersMutation = useMutation({
    mutationFn: (payload) => chatAPI.knowLeaders(payload),
    onSuccess: (data) => {
      setLeadersResult(data);
    },
    onError: () => {
      setLeadersResult({
        answer: tr(
          'Unable to fetch leader information right now. Please try again.',
          'Imeshindwa kupata taarifa za viongozi kwa sasa. Tafadhali jaribu tena.'
        ),
        sources: [],
      });
    },
  });

  useEffect(() => {
    if (!leadersMutation.isPending) return undefined;
    const tokenCount = leadersQuery.trim().split(/\s+/).filter(Boolean).length;
    const estimated = Math.max(10, Math.min(42, tokenCount * 3 + 11));
    setSearchingSourceTarget(estimated);
    setSearchingSourceCount(0);
    const timer = setInterval(() => {
      setSearchingSourceCount((prev) => {
        if (prev >= estimated) return estimated;
        return prev + 1;
      });
    }, 90);
    return () => clearInterval(timer);
  }, [leadersMutation.isPending, leadersQuery]);

  const isSendingMessage = chatMutation.isPending;
  const isSendingLetter = letterMutation.isPending;
  const isLetterSendDisabled =
    isSendingLetter || !senderPO.trim() || !letterHead.trim() || !letterBody.trim() || !hasValidReceiver;

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isSendingMessage) return;

    setAiMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        from: 'user',
        text,
        time: new Date(),
      },
    ]);

    chatMutation.mutate({
      message: text,
      session_id: sessionId,
      include_knowledge_base: true,
      target_leader: leader,
      target_location: location,
      auto_submit_new_complaint: true,
    });

    setInput('');
  };

  const sendLetter = () => {
    const cleanReceivers = receivers.map((r) => r.trim()).filter(Boolean);
    if (!senderPO.trim() || !letterHead.trim() || !letterBody.trim() || cleanReceivers.length === 0) return;

    letterMutation.mutate({
      session_id: sessionId,
      sender_po_box: senderPO.trim(),
      receiver_po_boxes: cleanReceivers,
      subject: letterHead.trim(),
      body: letterBody.trim(),
      leader,
      location: locationLabel,
    });

    setBaruaNotice('');
    setBaruaNoticeType('success');
    setSenderPO('');
    setLetterHead('');
    setLetterBody('');
    setReceivers(['']);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const runLeaderLookup = () => {
    const q = leadersQuery.trim();
    if (!q || leadersMutation.isPending) return;
    setLeadersResult(null);
    leadersMutation.mutate({ query: q, max_results: 8 });
  };

  const leaderPromptSuggestions = [
    tr('Current President of Tanzania', 'Rais wa sasa wa Tanzania'),
    tr('Current Minister of Energy Tanzania', 'Waziri wa Nishati wa sasa Tanzania'),
    tr("Current Prime Minister's office holder Tanzania", 'Waziri Mkuu wa sasa Tanzania'),
    tr('Current Regional Commissioner of Dar es Salaam', 'Mkuu wa Mkoa wa Dar es Salaam wa sasa'),
  ];

  const isOfficialGovSource = (item) => {
    if (!item) return false;
    if (item.official) return true;
    const link = String(item.url || '').toLowerCase();
    return /\.gov\.go\.tz/.test(link) || /\.go\.tz/.test(link);
  };

  const resultSearchStats = leadersResult?.search_stats || null;
  const searchedSourceCount = resultSearchStats?.sources_found ?? (leadersResult?.sources?.length || 0);
  const searchedSourcePool = resultSearchStats?.target_source_pool ?? searchingSourceTarget;
  const liveSearchProgress = searchingSourceTarget
    ? Math.min(100, Math.round((searchingSourceCount / searchingSourceTarget) * 100))
    : 0;

  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const sub = dark ? '#334155' : '#f8fafc';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const inputBg = dark ? '#334155' : '#f8fafc';
  const inputTxt = dark ? '#f1f5f9' : '#1e293b';

  const selectStyle = {
    width: '100%',
    padding: '9px 13px',
    border: `1px solid ${border}`,
    borderRadius: 6,
    fontSize: 14,
    background: surface,
    color: inputTxt,
    outline: 'none',
    cursor: 'pointer',
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 13px',
    border: `1px solid ${border}`,
    borderRadius: 6,
    fontSize: 14,
    background: surface,
    color: inputTxt,
    outline: 'none',
  };

  const sectionPaddingX = isMobile ? '14px' : '30px';
  const messageWrapWidth = isMobile ? '90%' : '78%';
  const avatarSize = isMobile ? 30 : 36;

  return (
    <>
      {/* Page Header */}
      <div
        style={{
          padding: isMobile ? `10px ${sectionPaddingX}` : `18px ${sectionPaddingX}`,
          background: surface,
          borderBottom: `1px solid ${border}`,
          boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 1 : 3 }}>
          {tr('Chats', 'Mazungumzo')}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color: textSub }}>
          {mode === 'ai'
            ? tr('AI support conversation', 'Mazungumzo ya msaada wa AI')
            : tr('Barua formal letter portal', 'Tovuti ya barua rasmi')}
        </div>
      </div>

      {/* Messages */}
      {mode === 'ai' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '10px 9px' : `24px ${sectionPaddingX}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {aiMessages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: m.from === 'user' ? 'row-reverse' : 'row',
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: messageWrapWidth,
                marginBottom: 14,
                alignItems: 'flex-end',
                gap: 0,
              }}
            >
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 13 : 15,
                  flexShrink: 0,
                  margin: m.from === 'user' ? '0 0 0 8px' : '0 8px 0 0',
                  background: m.from === 'user' ? '#2563eb' : (dark ? '#334155' : '#e2e8f0'),
                  color: m.from === 'user' ? '#fff' : (dark ? '#f1f5f9' : '#64748b'),
                }}
              >
                <i className={`fas ${m.from === 'user' ? 'fa-user' : 'fa-robot'}`} />
              </div>

              <div
                style={{
                  padding: isMobile ? '11px 14px' : '13px 17px',
                  borderRadius: 18,
                  borderBottomRightRadius: m.from === 'user' ? 4 : 18,
                  borderBottomLeftRadius: m.from === 'bot' ? 4 : 18,
                  background: m.from === 'user' ? '#2563eb' : surface,
                  color: m.from === 'user' ? '#fff' : (dark ? '#f1f5f9' : '#1e293b'),
                  boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                  fontSize: isMobile ? 13.8 : 14.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  border: m.from === 'bot' ? `1px solid ${border}` : 'none',
                }}
              >
                {m.text}
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 5,
                    opacity: 0.65,
                    textAlign: m.from === 'user' ? 'right' : 'left',
                  }}
                >
                  {fmt(m.time)}
                </div>
              </div>
            </div>
          ))}

          {isSendingMessage && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 16 }}>
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? 13 : 15,
                  marginRight: 8,
                  background: dark ? '#334155' : '#e2e8f0',
                  color: dark ? '#f1f5f9' : '#64748b',
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-robot" />
              </div>
              <div
                style={{
                  padding: '11px 15px',
                  borderRadius: 18,
                  borderBottomLeftRadius: 4,
                  background: surface,
                  border: `1px solid ${border}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#94a3b8',
                      display: 'inline-block',
                      animation: 'bounce 1.2s infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: isMobile ? '10px 9px' : '18px 28px',
          background: surface,
          borderTop: `1px solid ${border}`,
          ...(mode === 'barua'
            ? {
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobile ? '10px 9px' : `18px ${sectionPaddingX}`,
              }
            : {}),
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 10,
            marginBottom: isMobile ? 8 : 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${border}`,
              width: isMobile ? '100%' : 'fit-content',
            }}
          >
            {['ai', 'barua'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '9px 22px',
                  background: mode === m ? '#2563eb' : sub,
                  color: mode === m ? '#fff' : textSub,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                  borderRight: m === 'ai' ? `1px solid ${border}` : 'none',
                  transition: 'all 0.2s',
                  flex: isMobile ? 1 : 'initial',
                }}
              >
                {m === 'ai' ? tr('Ujumbe', 'Ujumbe') : 'Barua'}
              </button>
            ))}
          </div>

          {mode === 'ai' && (
            <button
              onClick={() => setLeadersModalOpen(true)}
              style={{
                border: `1px solid ${border}`,
                borderRadius: 8,
                background: sub,
                color: inputTxt,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <i className="fas fa-users" />
              {tr('Know Your Leaders', 'Wajue Viongozi Wako')}
            </button>
          )}
        </div>

        {mode === 'ai' && (
          <div>
            {isMobile && (
              <div
                style={{
                  marginBottom: 8,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: '7px 9px',
                  background: sub,
                }}
              >
                <button
                  onClick={() => setShowAiRoutingOptions((prev) => !prev)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: inputTxt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <span>{tr('Routing options', 'Mipangilio ya uelekezaji')}</span>
                  <i className={`fas ${showAiRoutingOptions ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                </button>
                <div style={{ marginTop: 4, fontSize: 11.5, color: textSub }}>
                  {leaderLabel} • {locationLabel}
                </div>
              </div>
            )}

            {(!isMobile || showAiRoutingOptions) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                    {tr('Route to leader:', 'Elekeza kwa kiongozi:')}
                  </label>
                  <select value={leader} onChange={(e) => setLeader(e.target.value)} style={selectStyle}>
                    {baruaLeaders.map((l) => (
                      <option key={l.value} value={l.value}>
                        {tr(l.label, l.labelSw)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                    {tr('Location:', 'Mahali:')}
                  </label>
                  <select value={location} onChange={(e) => setLocation(e.target.value)} style={selectStyle}>
                    {LOCATIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {tr(l.label, l.labelSw)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={isSendingMessage}
                placeholder={tr('Describe your complaint...', 'Eleza malalamiko yako...')}
                rows={isMobile ? 2 : 2}
                style={{
                  flex: 1,
                  padding: isMobile ? '11px 12px' : '13px 15px',
                  border: `1px solid ${border}`,
                  borderRadius: 10,
                  fontSize: isMobile ? 14 : 15,
                  resize: 'none',
                  background: inputBg,
                  color: inputTxt,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = border;
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isSendingMessage || !input.trim()}
                style={{
                  width: isMobile ? 44 : 50,
                  height: isMobile ? 44 : 50,
                  borderRadius: 10,
                  background: isSendingMessage || !input.trim() ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  cursor: isSendingMessage || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>
        )}

        {mode === 'barua' && (
          <div
            style={{
              background: sub,
              borderRadius: 10,
              padding: isMobile ? 14 : 20,
              border: `1px solid ${border}`,
              minHeight: isMobile ? '100%' : `calc(100% - 56px)`,
            }}
          >
            {baruaNotice && (
              <div
                style={{
                  marginBottom: 12,
                  background: baruaNoticeType === 'error' ? '#fee2e2' : '#dcfce7',
                  border: `1px solid ${baruaNoticeType === 'error' ? '#fca5a5' : '#86efac'}`,
                  borderRadius: 10,
                  padding: isMobile ? 12 : 14,
                  color: baruaNoticeType === 'error' ? '#991b1b' : '#166534',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {baruaNotice}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                  {tr('Send to:', 'Tuma kwa:')}
                </label>
                <select value={leader} onChange={(e) => setLeader(e.target.value)} style={selectStyle}>
                  {baruaLeaders.map((l) => (
                    <option key={l.value} value={l.value}>
                      {tr(l.label, l.labelSw)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                  {tr('Location:', 'Mahali:')}
                </label>
                <select value={location} onChange={(e) => setLocation(e.target.value)} style={selectStyle}>
                  {LOCATIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {tr(l.label, l.labelSw)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={sendLetter}
                disabled={isLetterSendDisabled}
                style={{
                  background: isLetterSendDisabled ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  cursor: isLetterSendDisabled ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                  transition: 'all 0.2s',
                }}
              >
                <i className="fas fa-paper-plane" /> {isSendingLetter ? tr('Sending...', 'Inatuma...') : tr('Send', 'Tuma')}
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                {tr('Your PO Box', 'Sanduku lako la Posta')}
              </label>
              <input
                value={senderPO}
                onChange={(e) => setSenderPO(e.target.value)}
                placeholder={tr('e.g., P.O. Box 12345', 'mfano, S.L.P 12345')}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                {tr("Receiver's PO Box", 'Sanduku la Posta la Mpokeaji')}
              </label>
              {receivers.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={r}
                    onChange={(e) => {
                      const updated = [...receivers];
                      updated[i] = e.target.value;
                      setReceivers(updated);
                    }}
                    placeholder={tr('e.g., P.O. Box 67890', 'mfano, S.L.P 67890')}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {receivers.length > 1 && (
                    <button
                      onClick={() => setReceivers(receivers.filter((_, j) => j !== i))}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        width: 34,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <i className="fas fa-times" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setReceivers([...receivers, ''])}
                style={{
                  background: 'transparent',
                  border: `1px dashed ${textSub}`,
                  color: textSub,
                  borderRadius: 6,
                  padding: '7px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fas fa-plus" /> {tr('Add another receiver', 'Ongeza mpokeaji mwingine')}
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 500, color: textSub }}>
                {tr('Letter Head / Subject', 'Kichwa cha Barua / Mada')}
              </label>
              <input
                value={letterHead}
                onChange={(e) => setLetterHead(e.target.value)}
                placeholder={tr('e.g., Complaint about service delivery', 'mfano, Malalamiko kuhusu utoaji wa huduma')}
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 5,
                  fontSize: 13,
                  fontWeight: 500,
                  color: textSub,
                  paddingRight: 0,
                }}
              >
                {tr('Letter Content', 'Maudhui ya Barua')}
              </label>
              <textarea
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                rows={isMobile ? 5 : 4}
                placeholder={tr('Write your letter here...', 'Andika barua yako hapa...')}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            </div>

          </div>
        )}
      </div>

      {leadersModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(5px)',
            zIndex: 80,
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 18,
          }}
        >
          <div
            style={{
              width: isMobile ? '100%' : 'min(900px, 96vw)',
              maxHeight: isMobile ? '100%' : '86vh',
              background: surface,
              border: dark ? '1px solid #1f2937' : '1px solid #dbeafe',
              borderRadius: isMobile ? 0 : 12,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: dark
                ? '0 22px 44px rgba(2,6,23,0.55)'
                : '0 22px 44px rgba(37,99,235,0.15)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: isMobile ? '14px 12px' : '18px 20px',
                borderBottom: dark ? '1px solid #1f2937' : '1px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: dark
                  ? 'linear-gradient(135deg, #0f172a 0%, #172554 100%)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: dark ? '#1e293b' : '#fff',
                    border: dark ? '1px solid #334155' : '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-landmark" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: inputTxt }}>
                    {tr('Know Your Leaders', 'Wajue Viongozi Wako')}
                  </div>
                  <div style={{ fontSize: 12.5, color: textSub }}>
                    {tr(
                      'Current-date search across any available sources, with Wikipedia listed first.',
                      'Utafutaji wa tarehe ya sasa kwenye vyanzo vyote vinavyopatikana, ukiweka Wikipedia kwanza.'
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setLeadersModalOpen(false)}
                style={{
                  border: `1px solid ${border}`,
                  background: sub,
                  color: inputTxt,
                  borderRadius: 8,
                  width: 34,
                  height: 34,
                  cursor: 'pointer',
                }}
                aria-label={tr('Close', 'Funga')}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ padding: isMobile ? 12 : 20, overflowY: 'auto' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: dark ? '#1e3a8a' : '#dbeafe',
                    color: dark ? '#dbeafe' : '#1d4ed8',
                    border: dark ? '1px solid #1d4ed8' : '1px solid #93c5fd',
                  }}
                >
                  {tr('Tanzania-First', 'Tanzania-First')}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: dark ? '#052e16' : '#dcfce7',
                    color: dark ? '#bbf7d0' : '#166534',
                    border: dark ? '1px solid #166534' : '1px solid #86efac',
                  }}
                >
                  {tr('Wikipedia First Mention', 'Wikipedia Imetajwa Kwanza')}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: dark ? '#3f2a00' : '#fef3c7',
                    color: dark ? '#fde68a' : '#92400e',
                    border: dark ? '1px solid #92400e' : '1px solid #fcd34d',
                  }}
                >
                  {tr('Current Data Default', 'Data za Sasa kwa Msingi')}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: dark ? '#111827' : '#f1f5f9',
                    color: textSub,
                    border: `1px solid ${border}`,
                  }}
                >
                  {tr('Sources', 'Vyanzo')}: {leadersMutation.isPending ? searchingSourceCount : searchedSourceCount}
                  {searchedSourcePool ? ` / ${searchedSourcePool}` : ''}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexDirection: isMobile ? 'column' : 'row',
                  marginBottom: 10,
                }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <i
                    className="fas fa-search"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: textSub,
                      fontSize: 12,
                    }}
                  />
                  <input
                    value={leadersQuery}
                    onChange={(e) => setLeadersQuery(e.target.value)}
                    placeholder={tr(
                      'e.g. Current Minister of Energy in Tanzania',
                      'mf. Waziri wa Nishati wa sasa Tanzania'
                    )}
                    style={{
                      ...inputStyle,
                      borderRadius: 10,
                      paddingLeft: 33,
                      minHeight: 42,
                      border: dark ? '1px solid #334155' : '1px solid #bfdbfe',
                      background: dark ? '#0f172a' : '#fff',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        runLeaderLookup();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={runLeaderLookup}
                  disabled={leadersMutation.isPending || !leadersQuery.trim()}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    background:
                      leadersMutation.isPending || !leadersQuery.trim()
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
                    color: '#fff',
                    padding: isMobile ? '11px 14px' : '0 18px',
                    minHeight: 42,
                    cursor: leadersMutation.isPending || !leadersQuery.trim() ? 'not-allowed' : 'pointer',
                    fontSize: 13.5,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    minWidth: isMobile ? '100%' : 150,
                    boxShadow: leadersMutation.isPending || !leadersQuery.trim()
                      ? 'none'
                      : '0 8px 18px rgba(37,99,235,0.28)',
                  }}
                >
                  {leadersMutation.isPending ? tr('Searching...', 'Inatafuta...') : tr('Deep Search', 'Tafuta kwa Kina')}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {leaderPromptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setLeadersQuery(suggestion);
                      setLeadersResult(null);
                    }}
                    style={{
                      border: dark ? '1px solid #334155' : '1px solid #dbeafe',
                      borderRadius: 999,
                      background: dark ? '#111827' : '#f8fafc',
                      color: inputTxt,
                      fontSize: 12.5,
                      padding: '7px 11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {leadersMutation.isPending && (
                <div
                  style={{
                    border: dark ? '1px solid #334155' : '1px solid #dbeafe',
                    borderRadius: 10,
                    background: dark ? '#0f172a' : '#f8fafc',
                    padding: '12px 14px',
                    color: textSub,
                    fontSize: 14,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#2563eb',
                        animation: 'pulse 1.2s infinite',
                      }}
                    />
                    <span>
                      {tr(
                        'Collecting latest data for today from Wikipedia, government sites, and trusted web sources...',
                        'Inakusanya data za leo kutoka Wikipedia, tovuti za serikali, na vyanzo vingine salama...'
                      )}
                    </span>
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: 12, color: textSub, marginBottom: 6 }}>
                      {tr('Sources scanned', 'Vyanzo vinavyopitiwa')}: {searchingSourceCount}
                      {searchingSourceTarget ? ` / ${searchingSourceTarget}` : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 999,
                        background: dark ? '#1f2937' : '#e2e8f0',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${liveSearchProgress}%`,
                          background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)',
                          transition: 'width 0.14s linear',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {leadersResult?.answer && (
                <div
                  style={{
                    border: dark ? '1px solid #334155' : '1px solid #dbeafe',
                    borderRadius: 10,
                    background: dark ? '#0f172a' : '#f8fafc',
                    padding: isMobile ? 12 : 14,
                    color: inputTxt,
                    fontSize: 14,
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    marginBottom: 12,
                  }}
                >
                  {leadersResult.as_of_date && (
                    <div style={{ marginBottom: 8, fontSize: 12, color: textSub, fontWeight: 600 }}>
                      {tr('As of', 'Hadi tarehe')}: {leadersResult.as_of_date}
                    </div>
                  )}
                  {leadersResult.prefer_current && (
                    <div style={{ marginBottom: 10, fontSize: 12, color: textSub }}>
                      {tr(
                        'This answer prioritizes current information as of today and lists Wikipedia first when available.',
                        'Jibu hili linaweka kipaumbele taarifa za sasa za leo na kutaja Wikipedia kwanza pale inapopatikana.'
                      )}
                    </div>
                  )}
                  {leadersResult.answer}
                </div>
              )}

              {!!leadersResult?.sources?.length && (
                <div>
                  {resultSearchStats && (
                    <div
                      style={{
                        marginBottom: 10,
                        border: dark ? '1px solid #334155' : '1px solid #dbeafe',
                        borderRadius: 8,
                        background: dark ? '#0f172a' : '#f8fafc',
                        padding: '8px 10px',
                        fontSize: 12.5,
                        color: textSub,
                      }}
                    >
                      {tr('Searched', 'Imepitia')} {resultSearchStats.target_source_pool || searchedSourcePool}{' '}
                      {tr('source targets and returned', 'vyanzo lengwa na kurudisha')}{' '}
                      {resultSearchStats.sources_found || searchedSourceCount}.
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: textSub, marginBottom: 8 }}>
                    {tr('Sources', 'Vyanzo')}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 8,
                    }}
                  >
                    {leadersResult.sources.map((item, idx) => (
                      <a
                        key={`${item.url}_${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          border: dark ? '1px solid #334155' : '1px solid #dbeafe',
                          borderRadius: 8,
                          padding: '10px 12px',
                          textDecoration: 'none',
                          color: inputTxt,
                          background: dark ? '#111827' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                        }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35 }}>{item.title || item.url}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 999,
                              padding: '3px 8px',
                              background: isOfficialGovSource(item)
                                ? (dark ? '#052e16' : '#dcfce7')
                                : (dark ? '#1e293b' : '#e2e8f0'),
                              color: isOfficialGovSource(item)
                                ? (dark ? '#bbf7d0' : '#166534')
                                : textSub,
                              border: isOfficialGovSource(item)
                                ? (dark ? '1px solid #166534' : '1px solid #86efac')
                                : `1px solid ${border}`,
                            }}
                          >
                            {isOfficialGovSource(item)
                              ? tr('Official Tanzania Source', 'Chanzo Rasmi Tanzania')
                              : tr('Web Source', 'Chanzo cha Mtandao')}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 999,
                              padding: '3px 8px',
                              background: dark ? '#0f172a' : '#f8fafc',
                              color: textSub,
                              border: `1px solid ${border}`,
                            }}
                          >
                            {item.source_timestamp || tr('date unavailable', 'tarehe haipo')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: textSub, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.domain || item.source || 'web'}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {leadersResult && !leadersResult.answer && !leadersMutation.isPending && (
                <div style={{ fontSize: 13, color: textSub }}>
                  {tr(
                    'No response available yet. Try a more specific title, office, or region in Tanzania.',
                    'Hakuna majibu bado. Jaribu kuweka cheo/ofisi/mkoa mahususi wa Tanzania.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.45; }
        }
      `}</style>
    </>
  );
}
