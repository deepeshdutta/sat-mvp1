import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import './index.css'
import { PaywallProvider, ToastProvider } from './components/ui'
import { AppLayout, PublicLayout } from './components/Layout'
import { Landing, Pricing, Resources, Policies, SignIn } from './pages/Public'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import DataZone from './pages/DataZone'
import PlanPage from './pages/Plan'
import Topics from './pages/Topics'
import Diagnostic from './pages/Diagnostic'
import SessionPage from './pages/Session'
import SessionReport from './pages/Report'
import Notebook from './pages/Notebook'
import Progress from './pages/Progress'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import More from './pages/More'
import Admin from './pages/Admin'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider><PaywallProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/signin" element={<SignIn />} />
          </Route>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Today />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="data" element={<DataZone />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="topics" element={<Topics />} />
            <Route path="diagnostic" element={<Diagnostic />} />
            <Route path="session/:id" element={<SessionPage />} />
            <Route path="report/:id" element={<SessionReport />} />
            <Route path="notebook" element={<Notebook />} />
            <Route path="progress" element={<Progress />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<Settings />} />
            <Route path="more" element={<More />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PaywallProvider></ToastProvider>
    </HashRouter>
  </React.StrictMode>
)
