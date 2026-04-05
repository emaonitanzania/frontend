import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

const AUTH_CONTEXT = {
  NONE: 'none',
  LEADER: 'leader',
  ADMIN: 'admin',
};

const SESSION_KEY = 'emaoni_session';
const AUTH_TOKEN_KEY = 'emaoni_auth_token';
const AUTH_ROLE_KEY = 'emaoni_auth_role';
const AUTH_PROFILE_KEY = 'emaoni_auth_profile';
const LEADER_TOKEN_KEY = 'emaoni_leader_token';
const LEADER_PROFILE_KEY = 'emaoni_leader_profile';
const ADMIN_TOKEN_KEY = 'emaoni_admin_token';
const ADMIN_PROFILE_KEY = 'emaoni_admin_profile';

const parseStoredJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const removeLegacyRoleState = (role) => {
  if (role === 'leader') {
    localStorage.removeItem(LEADER_TOKEN_KEY);
    localStorage.removeItem(LEADER_PROFILE_KEY);
  }
  if (role === 'admin') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_PROFILE_KEY);
  }
};

export const getSessionId = () => localStorage.getItem(SESSION_KEY);

export const getAuthToken = () =>
  localStorage.getItem(AUTH_TOKEN_KEY)
  || localStorage.getItem(LEADER_TOKEN_KEY)
  || localStorage.getItem(ADMIN_TOKEN_KEY);

export const getAuthRole = () =>
  localStorage.getItem(AUTH_ROLE_KEY)
  || (localStorage.getItem(LEADER_TOKEN_KEY) ? 'leader' : null)
  || (localStorage.getItem(ADMIN_TOKEN_KEY) ? 'admin' : null);

export const getAuthProfile = () => (
  parseStoredJson(localStorage.getItem(AUTH_PROFILE_KEY))
  || parseStoredJson(localStorage.getItem(LEADER_PROFILE_KEY))
  || parseStoredJson(localStorage.getItem(ADMIN_PROFILE_KEY))
);

export const setAuthSession = (token, role, profile) => {
  if (!token) return;

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (role) {
    localStorage.setItem(AUTH_ROLE_KEY, role);
  }
  if (profile) {
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  }

  removeLegacyRoleState('leader');
  removeLegacyRoleState('admin');

  if (role === 'leader') {
    localStorage.setItem(LEADER_TOKEN_KEY, token);
    if (profile) {
      localStorage.setItem(LEADER_PROFILE_KEY, JSON.stringify(profile));
    }
  }

  if (role === 'admin') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    if (profile) {
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
    }
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_PROFILE_KEY);
  removeLegacyRoleState('leader');
  removeLegacyRoleState('admin');
};

export const getLeaderToken = () => (
  getAuthRole() === 'leader'
    ? getAuthToken()
    : localStorage.getItem(LEADER_TOKEN_KEY)
);

export const getLeaderProfile = () => (
  getAuthRole() === 'leader'
    ? getAuthProfile()
    : parseStoredJson(localStorage.getItem(LEADER_PROFILE_KEY))
);

export const setLeaderAuth = (token, leader) => {
  setAuthSession(token, 'leader', leader);
};

export const clearLeaderAuth = () => {
  if (getAuthRole() === 'leader') {
    clearAuthSession();
    return;
  }
  removeLegacyRoleState('leader');
};

export const getAdminToken = () => (
  getAuthRole() === 'admin'
    ? getAuthToken()
    : localStorage.getItem(ADMIN_TOKEN_KEY)
);

export const getAdminProfile = () => (
  getAuthRole() === 'admin'
    ? getAuthProfile()
    : parseStoredJson(localStorage.getItem(ADMIN_PROFILE_KEY))
);

export const setAdminAuth = (token, admin) => {
  setAuthSession(token, 'admin', admin);
};

export const clearAdminAuth = () => {
  if (getAuthRole() === 'admin') {
    clearAuthSession();
    return;
  }
  removeLegacyRoleState('admin');
};

const getContextualToken = (authContext) => {
  if (authContext === AUTH_CONTEXT.LEADER) {
    return getLeaderToken();
  }
  if (authContext === AUTH_CONTEXT.ADMIN) {
    return getAdminToken();
  }
  return getAuthToken();
};

api.interceptors.request.use((config) => {
  const token = getContextualToken(config.authContext);
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Token ${token}`;
    }
  }
  return config;
});

const withAuthContext = (authContext, extra = {}) => ({
  ...extra,
  authContext,
});

const isFormDataPayload = (data) => typeof FormData !== 'undefined' && data instanceof FormData;

const buildPayloadConfig = (data, extra = {}) => {
  const config = { ...extra };
  if (isFormDataPayload(data)) {
    config.headers = {
      ...(config.headers || {}),
      'Content-Type': 'multipart/form-data',
    };
  }
  return config;
};

const withSession = (sessionId, params = {}) => ({
  params: sessionId ? { ...params, session_id: sessionId } : params,
});

const appendAliasedField = (formData, key, value) => {
  if (value && !formData.has(key)) {
    formData.append(key, value);
  }
};

const normalizeRoutingPayload = (data) => {
  if (!data) return data;

  if (isFormDataPayload(data)) {
    const normalized = new FormData();
    for (const [key, value] of data.entries()) {
      normalized.append(key, value);
    }

    const sendTo = normalized.get('send_to') || normalized.get('target_leader') || normalized.get('leader');
    const location = normalized.get('location') || normalized.get('target_location');
    const postcode = normalized.get('postcode') || normalized.get('target_postcode');

    appendAliasedField(normalized, 'send_to', sendTo);
    appendAliasedField(normalized, 'location', location);
    appendAliasedField(normalized, 'postcode', postcode);

    return normalized;
  }

  const normalized = { ...data };
  const sendTo = normalized.send_to || normalized.target_leader || normalized.leader;
  const location = normalized.location || normalized.target_location;
  const postcode = normalized.postcode || normalized.target_postcode;

  if (sendTo && !normalized.send_to) normalized.send_to = sendTo;
  if (location && !normalized.location) normalized.location = location;
  if (postcode && !normalized.postcode) normalized.postcode = postcode;

  return normalized;
};

const normalizeIdentifierPayload = (data = {}) => ({
  identifier: data.identifier || data.username || data.email || '',
  password: data.password || '',
});

const roleGuardError = (message) => {
  const error = new Error(message);
  error.response = {
    status: 403,
    data: { error: message },
  };
  return error;
};

const ensureRole = (payload, expectedRole) => {
  if (!expectedRole || payload?.role === expectedRole) {
    return payload;
  }
  throw roleGuardError(`This account is not allowed for ${expectedRole} access.`);
};

export const authAPI = {
  login: async (data) => {
    const payload = normalizeIdentifierPayload(data);
    const res = await api.post('/users/login/', payload);
    if (res.data?.token) {
      setAuthSession(res.data.token, res.data.role, res.data.profile);
    }
    return res.data;
  },
  me: async () => {
    const res = await api.get('/users/me/');
    const token = getAuthToken();
    if (token && res.data?.role) {
      setAuthSession(token, res.data.role, res.data.profile);
    }
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/users/logout/', {});
    clearAuthSession();
    return res.data;
  },
};

export const chatAPI = {
  sendMessage: async (data, options = {}) => {
    const res = await api.post(
      '/ai/chat/',
      normalizeRoutingPayload(data),
      buildPayloadConfig(data, {
        onUploadProgress: options.onUploadProgress,
      }),
    );
    return res.data;
  },
  knowLeaders: async (data) => {
    const res = await api.post('/ai/leaders/know/', data);
    return res.data;
  },
  getConversation: async (sessionId) => {
    const res = await api.get('/ai/conversations/', withSession(sessionId));
    return res.data;
  },
};

export const complaintsAPI = {
  create: async (data) => {
    const res = await api.post('/complaints/', data, buildPayloadConfig(data));
    return res.data;
  },
  list: async (sessionId) => {
    const res = await api.get('/complaints/', withSession(sessionId));
    return res.data;
  },
  get: async (id, sessionId) => {
    const res = await api.get(`/complaints/${id}/`, withSession(sessionId));
    return res.data;
  },
  inbox: async (sessionId) => {
    const res = await api.get('/complaints/inbox/', withSession(sessionId));
    return res.data;
  },
  unreplied: async (sessionId) => {
    const res = await api.get('/complaints/unreplied/', withSession(sessionId));
    return res.data;
  },
  history: async (sessionId) => {
    const res = await api.get('/complaints/history/', withSession(sessionId));
    return res.data;
  },
  timeline: async (id, sessionId) => {
    const res = await api.get(`/complaints/${id}/timeline/`, withSession(sessionId));
    return res.data;
  },
  escalate: async (id, data, sessionId) => {
    const res = await api.post(`/complaints/${id}/escalate/`, data, withSession(sessionId));
    return res.data;
  },
  createLetter: async (data) => {
    const res = await api.post('/complaints/letters/', normalizeRoutingPayload(data));
    return res.data;
  },
  feedback: async (id, data, sessionId) => {
    const res = await api.post(`/complaints/${id}/feedback/`, data, withSession(sessionId));
    return res.data;
  },
};

export const leaderAPI = {
  register: async (data) => {
    const res = await api.post('/users/leaders/register/', data, withAuthContext(AUTH_CONTEXT.ADMIN));
    return res.data;
  },
  login: async (data) => {
    const payload = ensureRole(await authAPI.login(data), 'leader');
    return {
      token: payload.token,
      leader: payload.profile,
      role: payload.role,
      profile: payload.profile,
    };
  },
  me: async () => {
    const payload = ensureRole(await authAPI.me(), 'leader');
    return payload.profile;
  },
  logout: async () => authAPI.logout(),
  assignedComplaints: async () => {
    const res = await api.get('/complaints/leader/assigned/', withAuthContext(AUTH_CONTEXT.LEADER));
    return res.data;
  },
  insights: async () => {
    const res = await api.get('/complaints/leader/insights/', withAuthContext(AUTH_CONTEXT.LEADER));
    return res.data;
  },
  respondToComplaint: async (complaintId, data) => {
    const res = await api.post(
      `/complaints/${complaintId}/leader/respond/`,
      data,
      buildPayloadConfig(data, withAuthContext(AUTH_CONTEXT.LEADER)),
    );
    return res.data;
  },
};

export const adminAPI = {
  login: async (data) => {
    const payload = ensureRole(await authAPI.login(data), 'admin');
    return {
      token: payload.token,
      admin: payload.profile,
      role: payload.role,
      profile: payload.profile,
    };
  },
  me: async () => {
    const payload = ensureRole(await authAPI.me(), 'admin');
    return payload.profile;
  },
  logout: async () => authAPI.logout(),
  registerLeader: async (data) => {
    const res = await api.post('/users/leaders/register/', data, withAuthContext(AUTH_CONTEXT.ADMIN));
    return res.data;
  },
};

export default api;
