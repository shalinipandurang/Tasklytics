import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function EisenhowerMatrix() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAPI('/task/get');
      if (data && data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      setError('Failed to fetch tasks for prioritization.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUrgent = async (task) => {
    const nextUrgent = task.is_urgent ? 0 : 1;
    try {
      await fetchAPI(`/task/update/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: task.task_title,
          description: task.description,
          status: task.status,
          due_date: task.due_date,
          category: task.category,
          is_urgent: nextUrgent,
          is_important: task.is_important
        })
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_urgent: nextUrgent } : t));
      setSuccess('Task urgency prioritized!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to toggle task urgency.');
    }
  };

  const handleToggleImportant = async (task) => {
    const nextImportant = task.is_important ? 0 : 1;
    try {
      await fetchAPI(`/task/update/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: task.task_title,
          description: task.description,
          status: task.status,
          due_date: task.due_date,
          category: task.category,
          is_urgent: task.is_urgent,
          is_important: nextImportant
        })
      });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_important: nextImportant } : t));
      setSuccess('Task importance prioritized!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to toggle task importance.');
    }
  };

  if (loading) return <div className="page-container"><div style={{ marginTop: '2rem' }}>Loading Eisenhower Decision Matrix...</div></div>;

  // Filter tasks into quadrants (exclude Completed tasks to keep it actionable and focused!)
  const activeTasks = tasks.filter(t => (t.status || 'Open').toLowerCase() !== 'completed');

  const q1_do = activeTasks.filter(t => t.is_urgent && t.is_important);
  const q2_schedule = activeTasks.filter(t => !t.is_urgent && t.is_important);
  const q3_delegate = activeTasks.filter(t => t.is_urgent && !t.is_important);
  const q4_eliminate = activeTasks.filter(t => !t.is_urgent && !t.is_important);

  const renderTaskItem = (task) => {
    return (
      <div 
        key={task.id} 
        style={{ 
          padding: '0.85rem', 
          borderRadius: '8px', 
          backgroundColor: 'white', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Link 
            to={`/task/${task.id}`} 
            style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', textDecoration: 'none' }}
            className="task-title-link"
          >
            {task.task_title}
          </Link>
          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
            {task.category || 'Study'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🗓️ Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleToggleUrgent(task)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '0.8rem',
                opacity: task.is_urgent ? 1 : 0.4,
                filter: task.is_urgent ? 'grayscale(0%)' : 'grayscale(100%)'
              }}
              title={task.is_urgent ? 'Mark as Not Urgent' : 'Mark as Urgent'}
            >
              🔥
            </button>
            <button 
              onClick={() => handleToggleImportant(task)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '0.8rem',
                opacity: task.is_important ? 1 : 0.4,
                filter: task.is_important ? 'grayscale(0%)' : 'grayscale(100%)'
              }}
              title={task.is_important ? 'Mark as Not Important' : 'Mark as Important'}
            >
              ⭐
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>◰ Eisenhower Prioritization Matrix</h2>
        <p className="subtitle">Classify academic tasks along urgency and importance vectors to focus on what truly impacts performance.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Eisenhower Matrix 2x2 Grid Container */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gridTemplateRows: '1fr 1fr', 
        gap: '1.5rem', 
        minHeight: '650px' 
      }}>
        
        {/* Quadrant 1: Urgent & Important */}
        <div className="card" style={{ borderTop: '4px solid var(--danger-color)', display: 'flex', flexDirection: 'column', backgroundColor: '#fffdfd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--danger-color)' }}>
              🔴 Q1: Do First (Urgent & Important)
            </h3>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', fontWeight: '700' }}>
              {q1_do.length} Tasks
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '250px', paddingRight: '0.25rem' }}>
            {q1_do.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No urgent & important tasks. Nice!</div>
            ) : (
              q1_do.map(renderTaskItem)
            )}
          </div>
        </div>

        {/* Quadrant 2: Important, Not Urgent */}
        <div className="card" style={{ borderTop: '4px solid var(--warning-color)', display: 'flex', flexDirection: 'column', backgroundColor: '#fffdf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--warning-color)' }}>
              🟡 Q2: Schedule (Important, Not Urgent)
            </h3>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--warning-light)', color: 'var(--warning-color)', fontWeight: '700' }}>
              {q2_schedule.length} Tasks
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '250px', paddingRight: '0.25rem' }}>
            {q2_schedule.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Q2 schedule tasks found.</div>
            ) : (
              q2_schedule.map(renderTaskItem)
            )}
          </div>
        </div>

        {/* Quadrant 3: Urgent, Not Important */}
        <div className="card" style={{ borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', backgroundColor: '#f6faff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1d4ed8' }}>
              🔵 Q3: Quick Wins / Delegate (Urgent, Not Important)
            </h3>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: '700' }}>
              {q3_delegate.length} Tasks
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '250px', paddingRight: '0.25rem' }}>
            {q3_delegate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Q3 tasks found.</div>
            ) : (
              q3_delegate.map(renderTaskItem)
            )}
          </div>
        </div>

        {/* Quadrant 4: Not Urgent & Not Important */}
        <div className="card" style={{ borderTop: '4px solid var(--text-muted)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--sidebar-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              ⚫ Q4: Eliminate / Postpone (Neither)
            </h3>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--border-color)', color: 'var(--text-muted)', fontWeight: '700' }}>
              {q4_eliminate.length} Tasks
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '250px', paddingRight: '0.25rem' }}>
            {q4_eliminate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No Q4 tasks found.</div>
            ) : (
              q4_eliminate.map(renderTaskItem)
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
