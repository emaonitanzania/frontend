import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminAPI,
  clearAdminAuth,
  clearLeaderAuth,
  getAdminProfile,
  getAdminToken,
  getLeaderProfile,
  getLeaderToken,
  leaderAPI,
  setAdminAuth,
  setLeaderAuth,
} from '../services/api';

const LEVEL_OPTIONS = [
  { value: 'Ward', label: 'Ward', labelSw: 'Kata' },
  { value: 'District', label: 'District', labelSw: 'Wilaya' },
  { value: 'Regional', label: 'Regional', labelSw: 'Mkoa' },
  { value: 'Ministerial', label: 'Ministerial', labelSw: 'Wizara' },
  { value: 'Presidential', label: 'Presidential', labelSw: 'Urais' },
];

const formatDateTime = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
};

export function LeaderRegisterPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const queryClient = useQueryClient();
  const [adminToken, setAdminToken] = useState(() => getAdminToken());
  const [adminLoginForm, setAdminLoginForm] = useState({ email: '', password: '' });
  const cachedAdminProfile = useMemo(() => getAdminProfile(), []);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    title: '',
    level: 'Ward',
    location: '',
    phone: '',
  });
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  const adminLoginMutation = useMutation({
    mutationFn: adminAPI.login,
    onSuccess: (data) => {
      setAdminAuth(data.token, data.admin);
      setAdminToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] });
      setRegistrationSuccess('');
    },
  });

  const adminMeQuery = useQuery({
    queryKey: ['admin', 'me', adminToken],
    queryFn: () => adminAPI.me(),
    enabled: !!adminToken,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: adminAPI.registerLeader,
    onSuccess: (data) => {
      setRegistrationSuccess(
        tr(
          `Leader account created for ${data?.leader?.full_name || form.full_name}.`,
          `Akaunti ya kiongozi imeundwa kwa ${data?.leader?.full_name || form.full_name}.`,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setForm({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        full_name: '',
        title: '',
        level: 'Ward',
        location: '',
        phone: '',
      });
    },
  });

  useEffect(() => {
    if (adminMeQuery.isError && [401, 403].includes(adminMeQuery.error?.response?.status)) {
      clearAdminAuth();
      setAdminToken(null);
    }
  }, [adminMeQuery.error, adminMeQuery.isError]);

  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const inputBg = dark ? '#334155' : '#f8fafc';
  const textColor = dark ? '#f1f5f9' : '#1e293b';

  const cardStyle = {
    maxWidth: 760,
    margin: '0 auto',
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: isMobile ? 14 : 22,
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: inputBg,
    color: textColor,
    outline: 'none',
    fontSize: 14,
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setRegistrationSuccess('');
    registerMutation.mutate(form);
  };
  const onAdminSubmit = (e) => {
    e.preventDefault();
    adminLoginMutation.mutate(adminLoginForm);
  };

  const adminLogout = async () => {
    try {
      if (adminToken) {
        await adminAPI.logout();
      }
    } catch (_error) {
      // ignore logout network errors; local cleanup still happens.
    }
    clearAdminAuth();
    setAdminToken(null);
    queryClient.removeQueries({ queryKey: ['admin', 'me'] });
    setRegistrationSuccess('');
  };

  const registerErrorMessage = registerMutation.error?.response?.data;
  const adminErrorMessage = adminLoginMutation.error?.response?.data;

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Leader Registration', 'Usajili wa Kiongozi')}
        subtitle={tr(
          'Create a leader account to manage and respond to citizen complaints',
          'Unda akaunti ya kiongozi ili kusimamia na kujibu malalamiko ya wananchi',
        )}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 10px 20px 10px' : '24px 30px' }}>
        {!adminToken && (
          <form onSubmit={onAdminSubmit} style={{ ...cardStyle, maxWidth: 540, marginBottom: 14 }}>
            <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>
              {tr('Superuser Login Required', 'Inahitaji Kuingia kama Superuser')}
            </div>
            <Field label={tr('Admin Email', 'Barua Pepe ya Admin')} dark={dark}>
              <input
                required
                type="email"
                value={adminLoginForm.email}
                onChange={(e) => setAdminLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Password', 'Nenosiri')} dark={dark}>
              <input
                required
                type="password"
                value={adminLoginForm.password}
                onChange={(e) => setAdminLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            {adminErrorMessage && (
              <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {typeof adminErrorMessage === 'string' ? adminErrorMessage : JSON.stringify(adminErrorMessage)}
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={adminLoginMutation.isPending}
                style={{
                  background: adminLoginMutation.isPending ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  cursor: adminLoginMutation.isPending ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {adminLoginMutation.isPending ? tr('Signing in...', 'Inaingia...') : tr('Sign In as Superuser', 'Ingia kama Superuser')}
              </button>
            </div>
          </form>
        )}

        {adminToken && (
          <div
            style={{
              ...cardStyle,
              maxWidth: 760,
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {adminMeQuery.data?.username || cachedAdminProfile?.username || tr('Superuser', 'Superuser')}
              </div>
              <div style={{ fontSize: 13, color: textSub }}>
                {adminMeQuery.data?.email || cachedAdminProfile?.email || '--'}
              </div>
            </div>
            <button
              onClick={adminLogout}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {tr('Logout Superuser', 'Toka kama Superuser')}
            </button>
          </div>
        )}

        {adminToken && (
        <form onSubmit={onSubmit} style={cardStyle}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12,
            }}
          >
            <Field label={tr('Username', 'Jina la Mtumiaji')} dark={dark}>
              <input
                required
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Email', 'Barua Pepe')} dark={dark}>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Password', 'Nenosiri')} dark={dark}>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Confirm Password', 'Thibitisha Nenosiri')} dark={dark}>
              <input
                required
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Full Name', 'Jina Kamili')} dark={dark}>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Title', 'Cheo')} dark={dark}>
              <input
                required
                placeholder={tr('e.g. District Commissioner', 'mfano, Mkuu wa Wilaya')}
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Level', 'Ngazi')} dark={dark}>
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                style={fieldStyle}
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {tr(level.label, level.labelSw)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr('Location', 'Mahali')} dark={dark}>
              <input
                required
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label={tr('Phone (optional)', 'Simu (si lazima)')} dark={dark}>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
          </div>

          {registerErrorMessage && (
            <div style={{ marginTop: 14, color: '#dc2626', fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {typeof registerErrorMessage === 'string' ? registerErrorMessage : JSON.stringify(registerErrorMessage)}
            </div>
          )}
          {registrationSuccess && (
            <div style={{ marginTop: 14, color: '#16a34a', fontSize: 13 }}>
              {registrationSuccess}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 10,
              marginTop: 18,
            }}
          >
            <span style={{ color: textSub, fontSize: 13 }}>
              {tr('Leader account exists?', 'Akaunti ya kiongozi ipo?')}{' '}
              <Link to="/leader/portal" style={{ color: '#2563eb' }}>
                {tr('Open Leader Portal', 'Fungua Tovuti ya Kiongozi')}
              </Link>
            </span>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              style={{
                background: registerMutation.isPending ? '#94a3b8' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                cursor: registerMutation.isPending ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {registerMutation.isPending ? tr('Creating...', 'Inaunda...') : tr('Create Leader Account', 'Unda Akaunti ya Kiongozi')}
            </button>
          </div>
        </form>
        )}
      </div>
    </>
  );
}

export function LeaderPortalPage({ dark, isMobile = false, tx }) {
  const tr = (en, sw) => (tx ? tx(en, sw) : en);
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getLeaderToken());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [responsesByComplaint, setResponsesByComplaint] = useState({});
  const cachedProfile = useMemo(() => getLeaderProfile(), []);

  const loginMutation = useMutation({
    mutationFn: leaderAPI.login,
    onSuccess: (data) => {
      setLeaderAuth(data.token, data.leader);
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ['leader'] });
      queryClient.invalidateQueries({ queryKey: ['leader-complaints'] });
    },
  });

  const meQuery = useQuery({
    queryKey: ['leader', 'me', token],
    queryFn: () => leaderAPI.me(),
    enabled: !!token,
    retry: false,
  });

  const assignedQuery = useQuery({
    queryKey: ['leader-complaints', token],
    queryFn: () => leaderAPI.assignedComplaints(),
    enabled: !!token,
  });

  const respondMutation = useMutation({
    mutationFn: ({ complaintId, payload }) => leaderAPI.respondToComplaint(complaintId, payload),
    onSuccess: (_data, variables) => {
      const { complaintId } = variables;
      setResponsesByComplaint((prev) => ({ ...prev, [complaintId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['leader-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  useEffect(() => {
    if (meQuery.isError && meQuery.error?.response?.status === 401) {
      clearLeaderAuth();
      setToken(null);
    }
  }, [meQuery.isError, meQuery.error]);

  const logout = async () => {
    try {
      if (token) {
        await leaderAPI.logout();
      }
    } catch (_error) {
      // ignore logout network errors; local cleanup still happens.
    }
    clearLeaderAuth();
    setToken(null);
    queryClient.removeQueries({ queryKey: ['leader'] });
    queryClient.removeQueries({ queryKey: ['leader-complaints'] });
  };

  const submitLogin = (e) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const sendResponse = (complaintId, markResolved = false) => {
    const responseText = (responsesByComplaint[complaintId] || '').trim();
    if (!responseText || respondMutation.isPending) return;

    respondMutation.mutate({
      complaintId,
      payload: {
        response_text: responseText,
        mark_resolved: markResolved,
      },
    });
  };

  const border = dark ? '#334155' : '#e2e8f0';
  const surface = dark ? '#1e293b' : '#ffffff';
  const textSub = dark ? '#94a3b8' : '#64748b';
  const inputBg = dark ? '#334155' : '#f8fafc';
  const textColor = dark ? '#f1f5f9' : '#1e293b';

  const fieldStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: inputBg,
    color: textColor,
    outline: 'none',
    fontSize: 14,
  };

  return (
    <>
      <PageHeader
        dark={dark}
        isMobile={isMobile}
        title={tr('Leader Portal', 'Tovuti ya Kiongozi')}
        subtitle={tr(
          'Review assigned complaints and send official responses to citizens',
          'Pitia malalamiko uliyopewa na tuma majibu rasmi kwa wananchi',
        )}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 10px 20px 10px' : '24px 30px' }}>
        {!token && (
          <form
            onSubmit={submitLogin}
            style={{
              maxWidth: 540,
              margin: '0 auto',
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: isMobile ? 14 : 22,
            }}
          >
            <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>
              {tr('Leader Login', 'Kuingia kwa Kiongozi')}
            </div>

            <Field label={tr('Username', 'Jina la Mtumiaji')} dark={dark}>
              <input
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                style={fieldStyle}
              />
            </Field>

            <Field label={tr('Password', 'Nenosiri')} dark={dark}>
              <input
                required
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>

            {loginMutation.error && (
              <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>
                {loginMutation.error?.response?.data?.error || tr('Unable to log in.', 'Imeshindwa kuingia.')}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: isMobile ? 'stretch' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 10,
                marginTop: 4,
              }}
            >
              <Link
                to="/leader/register"
                style={{
                  color: '#2563eb',
                  fontSize: 13,
                  alignSelf: isMobile ? 'flex-start' : 'center',
                }}
              >
                {tr('Register new leader', 'Sajili kiongozi mpya')}
              </Link>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                style={{
                  background: loginMutation.isPending ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  minWidth: isMobile ? '100%' : 132,
                  marginLeft: isMobile ? 0 : 'auto',
                  cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {loginMutation.isPending ? tr('Signing in...', 'Inaingia...') : tr('Sign In', 'Ingia')}
              </button>
            </div>
          </form>
        )}

        {token && (
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div
              style={{
                background: surface,
                border: `1px solid ${border}`,
                borderRadius: 12,
                padding: isMobile ? 14 : 20,
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {meQuery.data?.full_name || cachedProfile?.full_name || tr('Leader', 'Kiongozi')}
                  </div>
                  <div style={{ fontSize: 13, color: textSub }}>
                    {(meQuery.data?.title || cachedProfile?.title || tr('Leader', 'Kiongozi'))} | {(meQuery.data?.level || cachedProfile?.level || '--')} | {(meQuery.data?.location || cachedProfile?.location || '--')}
                  </div>
                </div>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {tr('Logout', 'Toka')}
                </button>
              </div>
            </div>

            {assignedQuery.isLoading && <StateBlock dark={dark} label={tr('Loading assigned complaints...', 'Inapakia malalamiko uliyopewa...')} />}
            {assignedQuery.isError && <StateBlock dark={dark} label={tr('Unable to load assigned complaints.', 'Imeshindwa kupakia malalamiko uliyopewa.')} isError />}
            {!assignedQuery.isLoading && !assignedQuery.isError && assignedQuery.data?.length === 0 && (
              <StateBlock dark={dark} label={tr('No assigned complaints right now.', 'Kwa sasa hakuna malalamiko uliyopewa.')} />
            )}

            {!assignedQuery.isLoading && !assignedQuery.isError && assignedQuery.data?.map((complaint) => (
              <div
                key={complaint.id}
                style={{
                  background: surface,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  padding: isMobile ? 14 : 18,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{complaint.title}</div>
                    <div style={{ fontSize: 13, color: textSub }}>
                      {tr('Category', 'Kategoria')}: {complaint.category} | {tr('Status', 'Hali')}: {complaint.status}
                    </div>
                    <div style={{ fontSize: 13, color: textSub }}>
                      {tr('Location', 'Mahali')}: {complaint.location} | {tr('Submitted', 'Imewasilishwa')}: {formatDateTime(complaint.submitted_at)}
                    </div>
                    {complaint.metadata?.type === 'letter' && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                        {tr('Formal Letter', 'Barua Rasmi')}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    background: inputBg,
                    whiteSpace: 'pre-wrap',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: textColor,
                  }}
                >
                  {complaint.description}
                </div>

                <div style={{ marginTop: 10 }}>
                  <textarea
                    rows={3}
                    placeholder={tr('Write your official response to the citizen...', 'Andika jibu lako rasmi kwa mwananchi...')}
                    value={responsesByComplaint[complaint.id] || ''}
                    onChange={(e) => setResponsesByComplaint((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color: textColor,
                      outline: 'none',
                      resize: 'vertical',
                      fontSize: 14,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    gap: 8,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                  }}
                >
                  <button
                    onClick={() => sendResponse(complaint.id, false)}
                    disabled={respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim()}
                    style={{
                      background:
                        respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim() ? '#94a3b8' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '9px 14px',
                      cursor:
                        respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim() ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {tr('Send Response', 'Tuma Jibu')}
                  </button>

                  <button
                    onClick={() => sendResponse(complaint.id, true)}
                    disabled={respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim()}
                    style={{
                      background:
                        respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim() ? '#94a3b8' : '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '9px 14px',
                      cursor:
                        respondMutation.isPending || !(responsesByComplaint[complaint.id] || '').trim() ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {tr('Send & Resolve', 'Tuma na Funga')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

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

function Field({ dark, label, children }) {
  const textSub = dark ? '#94a3b8' : '#64748b';

  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, marginBottom: 5, color: textSub }}>{label}</span>
      {children}
    </label>
  );
}

function StateBlock({ dark, label, isError = false }) {
  const textColor = isError ? '#dc2626' : (dark ? '#94a3b8' : '#64748b');

  return (
    <div
      style={{
        background: dark ? '#1e293b' : '#ffffff',
        border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '16px 14px',
        marginBottom: 12,
        color: textColor,
        fontSize: 14,
      }}
    >
      {label}
    </div>
  );
}
