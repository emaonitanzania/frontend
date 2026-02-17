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

const LEVEL_OPTIONS = ['Ward', 'District', 'Regional', 'Ministerial', 'Presidential'];

const formatDateTime = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
};

export function LeaderRegisterPage({ dark, isMobile = false }) {
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
        `Leader account created for ${data?.leader?.full_name || form.full_name}.`,
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
        title="Leader Registration"
        subtitle="Create a leader account to manage and respond to citizen complaints"
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 10px 20px 10px' : '24px 30px' }}>
        {!adminToken && (
          <form onSubmit={onAdminSubmit} style={{ ...cardStyle, maxWidth: 540, marginBottom: 14 }}>
            <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Superuser Login Required</div>
            <Field label="Admin Email" dark={dark}>
              <input
                required
                type="email"
                value={adminLoginForm.email}
                onChange={(e) => setAdminLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Password" dark={dark}>
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
                {adminLoginMutation.isPending ? 'Signing in...' : 'Sign In as Superuser'}
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
                {adminMeQuery.data?.username || cachedAdminProfile?.username || 'Superuser'}
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
              Logout Superuser
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
            <Field label="Username" dark={dark}>
              <input
                required
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Email" dark={dark}>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Password" dark={dark}>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Confirm Password" dark={dark}>
              <input
                required
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Full Name" dark={dark}>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Title" dark={dark}>
              <input
                required
                placeholder="e.g. District Commissioner"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Level" dark={dark}>
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                style={fieldStyle}
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location" dark={dark}>
              <input
                required
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                style={fieldStyle}
              />
            </Field>
            <Field label="Phone (optional)" dark={dark}>
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
              Leader account exists? <Link to="/leader/portal" style={{ color: '#2563eb' }}>Open Leader Portal</Link>
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
              {registerMutation.isPending ? 'Creating...' : 'Create Leader Account'}
            </button>
          </div>
        </form>
        )}
      </div>
    </>
  );
}

export function LeaderPortalPage({ dark, isMobile = false }) {
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
        title="Leader Portal"
        subtitle="Review assigned complaints and send official responses to citizens"
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
            <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Leader Login</div>

            <Field label="Username" dark={dark}>
              <input
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                style={fieldStyle}
              />
            </Field>

            <Field label="Password" dark={dark}>
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
                {loginMutation.error?.response?.data?.error || 'Unable to log in.'}
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
                Register new leader
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
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
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
                    {meQuery.data?.full_name || cachedProfile?.full_name || 'Leader'}
                  </div>
                  <div style={{ fontSize: 13, color: textSub }}>
                    {(meQuery.data?.title || cachedProfile?.title || 'Leader')} | {(meQuery.data?.level || cachedProfile?.level || '--')} | {(meQuery.data?.location || cachedProfile?.location || '--')}
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
                  Logout
                </button>
              </div>
            </div>

            {assignedQuery.isLoading && <StateBlock dark={dark} label="Loading assigned complaints..." />}
            {assignedQuery.isError && <StateBlock dark={dark} label="Unable to load assigned complaints." isError />}
            {!assignedQuery.isLoading && !assignedQuery.isError && assignedQuery.data?.length === 0 && (
              <StateBlock dark={dark} label="No assigned complaints right now." />
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
                      Category: {complaint.category} | Status: {complaint.status}
                    </div>
                    <div style={{ fontSize: 13, color: textSub }}>
                      Location: {complaint.location} | Submitted: {formatDateTime(complaint.submitted_at)}
                    </div>
                    {complaint.metadata?.type === 'letter' && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                        Formal Letter
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
                    placeholder="Write your official response to the citizen..."
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
                    Send Response
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
                    Send & Resolve
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
