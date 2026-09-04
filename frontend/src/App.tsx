import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { Assessment, SystemHealth } from './types';
import { apiService } from './services/api';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TransactionDetailDrawer } from './components/TransactionDetailDrawer';
import { DegradedBanner } from './components/DegradedBanner';

import { OverviewPage } from './pages/OverviewPage';
import { MonitorPage } from './pages/MonitorPage';
import { AssessorPage } from './pages/AssessorPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { ExplorerPage } from './pages/ExplorerPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { MetricsPage } from './pages/MetricsPage';
import { HealthPage } from './pages/HealthPage';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview Dashboard', subtitle: 'Real-time visibility into transaction risk and review workload.' },
  '/monitor': { title: 'Live Risk Monitor', subtitle: 'Continuous real-time stream of incoming transaction risk scores.' },
  '/assess': { title: 'Transaction Risk Assessor', subtitle: 'Simulate real-time payment inference against the Random Forest model.' },
  '/reviews': { title: 'Review Queue', subtitle: 'Analyst decision workspace for transactions in uncertainty bounds.' },
  '/explorer': { title: 'Transaction Explorer', subtitle: 'Deep-search historical risk assessments and SHAP factor attributions.' },
  '/audit': { title: 'Audit Trail', subtitle: 'Immutable ledger of risk assessment events and human reviewer actions.' },
  '/metrics': { title: 'Model & Metrics', subtitle: 'Complete evaluation report for Random Forest risk model v1.' },
  '/health': { title: 'System Health', subtitle: 'Operational status of backend services and database engines.' },
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    apiService.getHealth().then(setHealth).catch(console.error);
  }, []);

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'RazorShield Dashboard',
    subtitle: 'Explainable AI Risk Manager for Merchants',
  };

  const handleReviewSubmit = async (
    transactionId: string,
    action: 'approve' | 'reject' | 'mark_reviewed',
    note: string
  ) => {
    await apiService.submitReviewAction(transactionId, {
      action,
      actor: 'senior_analyst',
      note,
    });
    try {
      const updated = await apiService.getAssessmentById(transactionId);
      setSelectedAssessment(updated);
    } catch {
      setSelectedAssessment(null);
    }
  };

  const isDegraded = health?.status === 'degraded' || health?.db === 'unavailable' || health?.model === 'unavailable';

  return (
    <div className="flex min-h-screen bg-[#0b1120] text-slate-100">
      <Sidebar health={health} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={pageInfo.title} subtitle={pageInfo.subtitle} />

        {isDegraded && (
          <div className="px-6 pt-4">
            <DegradedBanner />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<OverviewPage onSelectAssessment={setSelectedAssessment} />} />
            <Route path="/monitor" element={<MonitorPage onSelectAssessment={setSelectedAssessment} />} />
            <Route path="/assess" element={<AssessorPage />} />
            <Route path="/reviews" element={<ReviewQueuePage onSelectAssessment={setSelectedAssessment} />} />
            <Route path="/explorer" element={<ExplorerPage onSelectAssessment={setSelectedAssessment} />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </main>
      </div>

      <TransactionDetailDrawer
        assessment={selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
        onReviewSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
