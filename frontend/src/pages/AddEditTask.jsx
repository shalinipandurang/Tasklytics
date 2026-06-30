import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function AddEditTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [status, setStatus] = useState('pending');
  const [category, setCategory] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(!!taskId);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleAIAssist = async () => {
    if (!title.trim()) {
      setError('Please enter a task title first to get AI assistance');
      return;
    }

    setAiLoading(true);
    setError('');
    setAiSuggestions(null);

    try {
      const data = await fetchAPI('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ title, description, category })
      });

      if (data && data.success) {
        setAiSuggestions(data.suggestions);
      }
    } catch (err) {
      setError('AI Assistant is temporarily unavailable. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAISuggestions = () => {
    if (!aiSuggestions) return;
    
    let newDescription = description;
    if (newDescription) newDescription += '\n\n';
    newDescription += 'AI Suggested Steps:\n';
    aiSuggestions.breakdown.forEach(step => {
      newDescription += `- ${step}\n`;
    });
    newDescription += `\nStrategy: ${aiSuggestions.tips}`;
    
    setDescription(newDescription);
    setAiSuggestions(null);
  };

  useEffect(() => {
    // Read settings and preferences from local storage
    const userStr = localStorage.getItem('taskManagerUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isAiActive = user.ai_enabled !== 0 && user.ai_enabled !== false && user.ai_enabled !== '0';
        setAiEnabled(isAiActive);
        
        if (!taskId && user.default_category) {
          setCategory(user.default_category);
        }
      } catch (e) {
        console.error("Failed to parse user settings", e);
      }
    }
    
    if (taskId) {
      loadTask(taskId);
    }
  }, [taskId]);

  const loadTask = async (id) => {
    try {
      const data = await fetchAPI('/task/get');
      const tasks = data.tasks || [];
      const task = tasks.find(t => String(t.id) === String(id));
      
      if (task) {
        setTitle(task.task_title || '');
        setDescription(task.description || '');
        if (task.due_date) {
          setDueDate(new Date(task.due_date).toISOString().split('T')[0]);
        }
        setDueTime(task.due_time ? task.due_time.substring(0, 5) : '23:59');
        setStatus((task.status || 'pending').toLowerCase());
        setCategory(task.category || '');
        setIsUrgent(!!task.is_urgent);
        setIsImportant(!!task.is_important);
      } else {
        setError('Task not found');
        setTimeout(() => navigate('/tasks'), 2000);
      }
    } catch (err) {
      setError('Failed to load task details');
    } finally {
      setInitLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setError('Due date cannot be in the past');
        setLoading(false);
        return;
      }
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      due_date: dueDate ? dueDate : null,
      due_time: dueTime ? dueTime + ':00' : '23:59:59',
      status: taskId ? status : 'pending',
      category: category.trim() || null,
      is_urgent: isUrgent,
      is_important: isImportant
    };

    try {
      if (taskId) {
        await fetchAPI(`/task/update/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify(taskData)
        });
        setSuccess('Task updated successfully');
      } else {
        await fetchAPI('/task/add', {
          method: 'POST',
          body: JSON.stringify(taskData)
        });
        setSuccess('Task created successfully');
      }
      setTimeout(() => {
        navigate('/tasks');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="page-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading task details...</div>
      </div>
    );
  }

  const isEdit = !!taskId;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>{isEdit ? 'Edit Task' : 'Create Task'}</h2>
        <p className="subtitle">{isEdit ? 'Update your academic assignments and stay on schedule.' : 'Add a new academic assignment to your schedule.'}</p>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label htmlFor="title" className="form-label">Task Title</label>
            <input 
              type="text" 
              id="title" 
              className="form-control" 
              placeholder="e.g., Comparative Analysis Draft" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="category" className="form-label">Category</label>
              <select 
                id="category" 
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Study">Study</option>
                <option value="Health">Health</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="dueDate" className="form-label">Due Date</label>
              <input 
                type="date" 
                id="dueDate" 
                className="form-control" 
                value={dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="dueTime" className="form-label">Due Time</label>
              <input 
                type="time" 
                id="dueTime" 
                className="form-control" 
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Urgent & Important Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div
              id="toggle-urgent"
              onClick={() => setIsUrgent(!isUrgent)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.9rem 1.2rem',
                borderRadius: '8px',
                border: isUrgent ? '2px solid var(--danger-color)' : '2px solid var(--border-color)',
                backgroundColor: isUrgent ? 'var(--danger-light, #fef2f2)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🔥</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: isUrgent ? 'var(--danger-color)' : 'var(--text-main)' }}>Urgent</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Needs immediate attention</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isUrgent ? '2px solid var(--danger-color)' : '2px solid var(--border-color)',
                  backgroundColor: isUrgent ? 'var(--danger-color)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isUrgent && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: '700' }}>✓</span>}
                </div>
              </div>
            </div>

            <div
              id="toggle-important"
              onClick={() => setIsImportant(!isImportant)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.9rem 1.2rem',
                borderRadius: '8px',
                border: isImportant ? '2px solid var(--warning-color, #f59e0b)' : '2px solid var(--border-color)',
                backgroundColor: isImportant ? 'var(--warning-light, #fffbeb)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>⭐</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: isImportant ? 'var(--warning-color, #f59e0b)' : 'var(--text-main)' }}>Important</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>High priority & significance</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isImportant ? '2px solid var(--warning-color, #f59e0b)' : '2px solid var(--border-color)',
                  backgroundColor: isImportant ? 'var(--warning-color, #f59e0b)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isImportant && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: '700' }}>✓</span>}
                </div>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="description" className="form-label" style={{ marginBottom: 0 }}>Notes & Description</label>
              {aiEnabled && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--accent-color)', color: 'var(--accent-dark)' }}
                  onClick={handleAIAssist}
                  disabled={aiLoading}
                >
                  {aiLoading ? '✨ Thinking...' : '✨ Get AI Assistance'}
                </button>
              )}
            </div>
            
            {aiSuggestions && (
              <div className="card" style={{ backgroundColor: 'var(--sidebar-bg)', border: '1px solid var(--accent-color)', marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    AI Recommendations
                  </h4>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: '700' }}>
                    {aiSuggestions.estimatedTime?.toUpperCase() || 'MEDIUM'} EFFORT
                  </span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>Actionable Steps:</div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                    {aiSuggestions.breakdown.map((step, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>
                    ))}
                  </ul>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', borderLeft: '4px solid var(--accent-color)', marginBottom: '1.25rem' }}>
                  <strong>Strategy:</strong> {aiSuggestions.tips}
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    onClick={applyAISuggestions}
                  >
                    Apply to Description
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    onClick={() => setAiSuggestions(null)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <textarea 
              id="description" 
              className="form-control" 
              rows="5" 
              placeholder="Include the peer-reviewed sources from the library database. Focus on the relationship between cellular respiration and ATP synthesis. Aim for 1,500 words."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Link to="/tasks" className="btn btn-outline" style={{ border: 'none' }}>Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
              {loading ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}
