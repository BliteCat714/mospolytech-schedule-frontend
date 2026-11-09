import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Schedule from './pages/Schedule'
import PE from './pages/PE'
import ProjectActivity from './pages/ProjectActivity'
import Rooms from './pages/Rooms'
import Generation from './pages/Generation'
import DPO from './pages/DPO'
import Events from './pages/Events'
import { AdminAccessProvider } from './components/AdminAccess'
import { targetKey } from './lib/directory'

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function StudentOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp()
  if (user?.role !== 'student') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { viewedSchedule } = useApp()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Schedule key={viewedSchedule ? targetKey(viewedSchedule) : 'none'} />} />
        <Route path="/pd" element={<StudentOnly><ProjectActivity /></StudentOnly>} />
        <Route path="/pe" element={<StudentOnly><PE /></StudentOnly>} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/generation" element={<Generation />} />
        <Route path="/dpo" element={<DPO />} />
        <Route path="/events" element={<Events />} />
        <Route path="/free-periods" element={<Navigate to="/events" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider><AdminAccessProvider>
      <AppRoutes />
    </AdminAccessProvider></AppProvider>
  )
}