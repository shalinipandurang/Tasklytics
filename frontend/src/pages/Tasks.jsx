import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/task/get');
      if (data && data.success && data.tasks) {
        setTasks(data.tasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (id, newStatus, title) => {
    setError('');
    setSuccess('');
    try {
      await fetchAPI(`/task/update/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, title: title })
      });
      loadTasks();
    } catch (err) {
      setError('Failed to update task status.');
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    setError('');
    setSuccess('');
    try {
      await fetchAPI(`/task/delete/${id}`, {
        method: 'DELETE'
      });
      loadTasks();
    } catch (err) {
      setError('Failed to delete task.');
    }
  };

  const completedCount = tasks.filter(t => (t.status || 'pending').toLowerCase() === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  
  // Check for tasks due today or overdue
  const today = new Date();
  today.setHours(0,0,0,0);
  const urgentCount = tasks.filter(t => {
    if ((t.status || 'pending').toLowerCase() === 'completed') return false;
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0,0,0,0);
    return dueDate <= today;
  }).length;

  const filteredTasks = tasks.filter(task => {
    // 1. Search Query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const title = (task.task_title || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      if (!title.includes(query) && !desc.includes(query)) {
        return false;
      }
    }

    // 2. Category filter
    if (selectedCategory !== 'All' && task.category !== selectedCategory) {
      return false;
    }

    // 3. Status filter
    const status = (task.status || 'Open');
    if (selectedStatus === 'Active') {
      if (status.toLowerCase() === 'completed') return false;
    } else if (selectedStatus !== 'All') {
      if (status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }

    return true;
  });

  return (
    <div className="page-container">
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>Task Manager</h2>
        <p className="subtitle">Stay organized and track your academic progress.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Sidebar Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Completion Rate Widget */}
          <div className="card">
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>Completion Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem' }}>{completionRate}%</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }}>
              <div style={{ width: `${completionRate}%`, height: '100%', backgroundColor: 'var(--accent-dark)', borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* Urgent Tasks Widget */}
          <div className="card" style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#94a3b8', marginBottom: '0.5rem' }}>Urgent Tasks</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>{urgentCount} Due Today</div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
              !
            </div>
          </div>

        </div>

        {/* Right Content - Task List */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {error && <div className="alert alert-danger" style={{ margin: '1rem' }}>{error}</div>}
            
            {/* Elegant Filter & Search Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--sidebar-bg)', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', flex: 1, minWidth: '280px', alignItems: 'center' }}>
                {/* Search box */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <input 
                    type="text"
                    placeholder="🔍 Search tasks..."
                    className="form-control"
                    style={{ height: '38px', fontSize: '0.875rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Category:</span>
                  <select
                    className="form-control"
                    style={{ width: '130px', height: '38px', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Study">Study</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Status Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    className="form-control"
                    style={{ width: '160px', height: '38px', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active (Uncompleted)</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Add New Task button shortcut */}
              <Link to="/add-task" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '38px', fontSize: '0.875rem' }}>
                + New Task
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Task Name</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Tags</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Due Date</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Completion</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No tasks found.</td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => {
                      const statusStr = task.status || 'Open';
                      const isCompleted = statusStr.toLowerCase() === 'completed';
                      const title = task.task_title || 'Untitled Task';
                      
                      // Priority dot color
                      let priorityColor = '#cbd5e1'; // default low
                      if (task.priority === 'High') priorityColor = 'var(--danger-color)';
                      else if (task.priority === 'Medium') priorityColor = 'var(--warning-color)';
                      
                      const dateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                      
                      const taskCompletionRate = task.total_subtasks > 0 
                        ? Math.round((task.completed_subtasks / task.total_subtasks) * 100) 
                        : (isCompleted ? 100 : 0);

                      return (
                        <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {isCompleted ? (
                              <div 
                                style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--success-color)', fontSize: '0.75rem' }}
                                onClick={() => updateTaskStatus(task.id, 'Open', title)}
                              >
                                ✓
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColor }}></div>
                              </div>
                            )}
                            <span style={{ fontWeight: '500', color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              <Link to={`/task/${task.id}`} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--accent-dark)'} onMouseLeave={(e) => e.target.style.color = 'inherit'}>
                                {title}
                              </Link>
                            </span>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            {task.category ? (
                              <span style={{ 
                                backgroundColor: 
                                  task.category === 'Work' ? '#dbeafe' : 
                                  task.category === 'Personal' ? '#f3e8ff' : 
                                  task.category === 'Study' ? '#dcfce7' : 
                                  task.category === 'Health' ? '#fce7f3' : 
                                  task.category === 'Finance' ? '#fef3c7' : '#f1f5f9',
                                color: 
                                  task.category === 'Work' ? '#1e40af' : 
                                  task.category === 'Personal' ? '#6b21a8' : 
                                  task.category === 'Study' ? '#166534' : 
                                  task.category === 'Health' ? '#9d174d' : 
                                  task.category === 'Finance' ? '#92400e' : '#475569',
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700' 
                              }}>
                                {task.category}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {dateDisplay}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${taskCompletionRate}%`, height: '100%', backgroundColor: taskCompletionRate === 100 ? 'var(--success-color)' : 'var(--accent-dark)', borderRadius: '3px' }}></div>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>{taskCompletionRate}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <select 
                              className={`badge ${
                                isCompleted ? 'badge-completed' : 
                                statusStr.toLowerCase() === 'blocked' ? 'badge-danger' : 'badge-pending'
                              }`} 
                              style={{ border: 'none', paddingRight: '1.5rem', cursor: 'pointer', outline: 'none', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.8em' }}
                              value={statusStr}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value, title)}
                            >
                              <option value="Open" style={{ color: 'var(--text-main)', backgroundColor: 'var(--surface-color)' }}>Open</option>
                              <option value="In Progress" style={{ color: 'var(--text-main)', backgroundColor: 'var(--surface-color)' }}>In Progress</option>
                              <option value="Blocked" style={{ color: 'var(--text-main)', backgroundColor: 'var(--surface-color)' }}>Blocked</option>
                              <option value="Completed" style={{ color: 'var(--text-main)', backgroundColor: 'var(--surface-color)' }}>Completed</option>
                            </select>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                              {!isCompleted && (
                                <button 
                                  onClick={() => updateTaskStatus(task.id, 'Completed', title)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-color)' }}
                                  title="Mark as done"
                                >
                                  ✓
                                </button>
                              )}
                              <Link to={`/add-task?id=${task.id}`} style={{ color: 'var(--text-muted)' }}>
                                ✎
                              </Link>
                              <button 
                                onClick={() => deleteTask(task.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
            
            {!loading && (
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--sidebar-bg)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>
                  {filteredTasks.length} ongoing task{filteredTasks.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
