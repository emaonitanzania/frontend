import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const [mode, setMode] = useState('ai'); // 'ai' | 'barua'
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'welcome_ai',
      from: 'bot',
      text: tr(
        "Hello! I'm E-Maoni, your AI assistant. Share your issue and I will help you immediately.",
        'Habari! Mimi ni E-Maoni, msaidizi wako wa AI. Eleza changamoto yako na nitakusaidia mara moja.'
      ),
      time: new Date(),
    },
  ]);
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
  const bottomRef = useRef(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mode, aiMessages]);

  const chatMutation = useMutation({
    mutationFn: (data) => chatAPI.sendMessage(data),
    onSuccess: (data) => {
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
          padding: isMobile ? `14px ${sectionPaddingX}` : `18px ${sectionPaddingX}`,
          background: surface,
          borderBottom: `1px solid ${border}`,
          boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: isMobile ? 20 : 22, marginBottom: 3 }}>{tr('Chats', 'Mazungumzo')}</div>
        <div style={{ fontSize: isMobile ? 13 : 14, color: textSub }}>
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
            padding: isMobile ? '14px 12px' : `24px ${sectionPaddingX}`,
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
          padding: isMobile ? '14px 12px' : '18px 28px',
          background: surface,
          borderTop: `1px solid ${border}`,
          ...(mode === 'barua'
            ? {
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobile ? '14px 12px' : `18px ${sectionPaddingX}`,
              }
            : {}),
        }}
      >
        <div
          style={{
            display: 'flex',
            marginBottom: 14,
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
              {m === 'ai' ? 'AI' : 'Barua'}
            </button>
          ))}
        </div>

        {mode === 'ai' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={isSendingMessage}
              placeholder={tr('Ask the AI assistant...', 'Muulize msaidizi wa AI...')}
              rows={isMobile ? 3 : 2}
              style={{
                flex: 1,
                padding: '13px 15px',
                border: `1px solid ${border}`,
                borderRadius: 10,
                fontSize: 15,
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

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
