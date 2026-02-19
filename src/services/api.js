// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

const SESSION_KEY = 'emaoni_session';
const LEADER_TOKEN_KEY = 'emaoni_leader_token';
const LEADER_PROFILE_KEY = 'emaoni_leader_profile';
const ADMIN_TOKEN_KEY = 'emaoni_admin_token';
const ADMIN_PROFILE_KEY = 'emaoni_admin_profile';

export const getSessionId = () => localStorage.getItem(SESSION_KEY);

export const getLeaderToken = () => localStorage.getItem(LEADER_TOKEN_KEY);
export const getLeaderProfile = () => {
  const raw = localStorage.getItem(LEADER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setLeaderAuth = (token, leader) => {
  localStorage.setItem(LEADER_TOKEN_KEY, token);
  if (leader) {
    localStorage.setItem(LEADER_PROFILE_KEY, JSON.stringify(leader));
  }
};

export const clearLeaderAuth = () => {
  localStorage.removeItem(LEADER_TOKEN_KEY);
  localStorage.removeItem(LEADER_PROFILE_KEY);
};

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const getAdminProfile = () => {
  const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAdminAuth = (token, admin) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  if (admin) {
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
};

api.interceptors.request.use((config) => {
  const token = getLeaderToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Token ${token}`;
    }
  }
  return config;
});

const tokenHeader = (token) => ({
  headers: {
    Authorization: `Token ${token}`,
  },
});

const withSession = (sessionId, params = {}) => ({
  params: sessionId ? { ...params, session_id: sessionId } : params,
});

export const chatAPI = {
  sendMessage: async (data) => {
    const res = await api.post('/ai/chat/', data);
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
    const res = await api.post('/complaints/', data);
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
    const res = await api.post('/complaints/letters/', data);
    return res.data;
  },
};

export const leaderAPI = {
  register: async (data) => {
    const adminToken = getAdminToken();
    const res = await api.post(
      '/users/leaders/register/',
      data,
      adminToken ? tokenHeader(adminToken) : undefined,
    );
    return res.data;
  },
  login: async (data) => {
    const res = await api.post('/users/leaders/login/', data);
    return res.data;
  },
  me: async () => {
    const res = await api.get('/users/leaders/me/');
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/users/leaders/logout/');
    return res.data;
  },
  assignedComplaints: async () => {
    const res = await api.get('/complaints/leader/assigned/');
    return res.data;
  },
  respondToComplaint: async (complaintId, data) => {
    const res = await api.post(`/complaints/${complaintId}/leader/respond/`, data);
    return res.data;
  },
};

export const adminAPI = {
  login: async (data) => {
    const res = await api.post('/users/admin/login/', data);
    return res.data;
  },
  me: async () => {
    const adminToken = getAdminToken();
    const res = await api.get('/users/admin/me/', tokenHeader(adminToken));
    return res.data;
  },
  logout: async () => {
    const adminToken = getAdminToken();
    const res = await api.post('/users/admin/logout/', {}, tokenHeader(adminToken));
    return res.data;
  },
  registerLeader: async (data) => {
    const adminToken = getAdminToken();
    const res = await api.post('/users/leaders/register/', data, tokenHeader(adminToken));
    return res.data;
  },
};

export default api;
