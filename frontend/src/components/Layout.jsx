import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchAPI } from '../api';
import { checkAndSubscribeNotifications } from '../pushNotification';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('taskManagerToken');
    const userData = localStorage.getItem('taskManagerUser');

    if (!token) {
      navigate('/');
    } else if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Globally apply dark mode theme if configured
        if (parsedUser.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.body.classList.add('dark-theme');
        } else {
          document.documentElement.removeAttribute('data-theme');
          document.body.classList.remove('dark-theme');
        }
        
        // Trigger push notification subscription
        checkAndSubscribeNotifications();
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }

    // Listen for unauthorized event from api.js
    const handleUnauthorized = () => {
      navigate('/');
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [navigate, location.pathname]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);

  const confirmLogout = () => {
    localStorage.removeItem('taskManagerToken');
    localStorage.removeItem('taskManagerUser');
    setShowLogoutModal(false);
    navigate('/');
  };

  const handleLogoutClick = async () => {
    setIsFetchingTasks(true);
    setShowLogoutModal(true);
    try {
      const data = await fetchAPI('/task/get');
      if (data && data.success && data.tasks) {
        const todayCompleted = data.tasks.filter(t => {
          if ((t.status || '').toLowerCase() !== 'completed') return false;
          if (!t.updated_at) return false;
          return new Date(t.updated_at).toDateString() === new Date().toDateString();
        });
        setCompletedTasks(todayCompleted);
      }
    } catch (e) {
      console.error("Failed to fetch tasks for logout summary");
    } finally {
      setIsFetchingTasks(false);
    }
  };

  if (!user) return null;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Tasklytics</h1>
          <p>Smart Productivity Tracking</p>
        </div>

        <nav className="sidebar-nav">
          <Link 
            to="/dashboard" 
            className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            <span>▦</span> Dashboard
          </Link>
          <Link 
            to="/daily-planner" 
            className={`nav-item ${location.pathname === '/daily-planner' ? 'active' : ''}`}
          >
            <span>📅</span> Daily Planner
          </Link>
          <Link 
            to="/eisenhower-matrix" 
            className={`nav-item ${location.pathname === '/eisenhower-matrix' ? 'active' : ''}`}
          >
            <span>◰</span> Eisenhower Matrix
          </Link>
          <Link 
            to="/tasks" 
            className={`nav-item ${location.pathname === '/tasks' ? 'active' : ''}`}
          >
            <span>✓</span> Tasks
          </Link>
          <Link 
            to="/analysis" 
            className={`nav-item ${location.pathname === '/analysis' ? 'active' : ''}`}
          >
            <span>📊</span> Analysis
          </Link>
          <Link 
            to="/settings" 
            className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            <span>⚙️</span> Settings
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/add-task" className="btn btn-primary" style={{ width: '100%', padding: '0.6rem' }}>
            + Add New Task
          </Link>
          <button onClick={handleLogoutClick} className="nav-item" style={{ color: 'var(--text-main)', marginTop: '1rem' }}>
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 2rem' }}>
          {/* Header layout simplified - placeholders removed */}
        </header>

        <Outlet />
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Leaving so soon?</h3>
            
            {isFetchingTasks ? (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Checking your daily progress...</p>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>
                  You've completed <strong>{completedTasks.length}</strong> task{completedTasks.length !== 1 ? 's' : ''} today.
                </p>
                {completedTasks.length > 0 && (
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', padding: '0.5rem' }}>
                    {completedTasks.map(t => (
                      <li key={t.id} style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--success-color)', marginRight: '0.5rem', fontWeight: 'bold' }}>✓</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.task_title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {completedTasks.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Don't forget to mark your tasks as completed when you return!</p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLogoutModal(false)} className="btn" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                Cancel
              </button>
              <button onClick={confirmLogout} className="btn btn-primary" style={{ backgroundColor: 'var(--danger-color)', color: 'white', border: 'none' }}>
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
