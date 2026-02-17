import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import { InboxPage, UnrepliedPage, HistoryPage, EscalationPage, FAQsPage } from './pages/OtherPages';
import { LeaderPortalPage, LeaderRegisterPage } from './pages/LeaderPages';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Layout>
          {({ dark, isMobile }) => (
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage dark={dark} isMobile={isMobile} />} />
              <Route path="/inbox" element={<InboxPage dark={dark} isMobile={isMobile} />} />
              <Route path="/unreplied" element={<UnrepliedPage dark={dark} isMobile={isMobile} />} />
              <Route path="/history" element={<HistoryPage dark={dark} isMobile={isMobile} />} />
              <Route path="/escalation" element={<EscalationPage dark={dark} isMobile={isMobile} />} />
              <Route path="/faqs" element={<FAQsPage dark={dark} isMobile={isMobile} />} />
              <Route path="/leader/register" element={<LeaderRegisterPage dark={dark} isMobile={isMobile} />} />
              <Route path="/leader/portal" element={<LeaderPortalPage dark={dark} isMobile={isMobile} />} />
            </Routes>
          )}
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
