import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import AddEditTask from './pages/AddEditTask';
import Analysis from './pages/Analysis';
import TaskDetail from './pages/TaskDetail';
import DailyPlanner from './pages/DailyPlanner';
import EisenhowerMatrix from './pages/EisenhowerMatrix';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Authenticated Routes wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/daily-planner" element={<DailyPlanner />} />
        <Route path="/eisenhower-matrix" element={<EisenhowerMatrix />} />
        <Route path="/add-task" element={<AddEditTask />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;