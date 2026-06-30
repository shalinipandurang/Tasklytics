import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api';

const DEFAULT_TIMER_MINUTES = 25;

export default function TaskDetail() {
  const { id } = useParams();
  const MAX_SUBTASKS = 20;

  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI & Sub-task states
  const [aiLoading, setAiLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskEst, setNewSubtaskEst] = useState(30);

  // Editing subtask states
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskEst, setEditSubtaskEst] = useState(30);
  const [editSubtaskAct, setEditSubtaskAct] = useState(0);

  // Pomodoro Focus Timer States
  const [selectedSubtaskForTimer, setSelectedSubtaskForTimer] = useState(null);
  const [timerDurationMinutes, setTimerDurationMinutes] = useState(DEFAULT_TIMER_MINUTES);
  const [showStreakMessage, setShowStreakMessage] = useState(false);
  const [timerDurationLoading, setTimerDurationLoading] = useState(true);
  const [timerDurationError, setTimerDurationError] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_MINUTES * 60);
  const [timerActive, setTimerActive] = useState(false);
  
  const timerRef = useRef(null);
  const timerDurationRef = useRef(DEFAULT_TIMER_MINUTES);

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const loadTimerDuration = async () => {
      setTimerDurationLoading(true);
      setTimerDurationError('');
      try {
        const data = await fetchAPI('/user/timer-duration');
        if (cancelled) return;

        const mins = data.durationMinutes ?? DEFAULT_TIMER_MINUTES;
        setTimerDurationMinutes(mins);
        timerDurationRef.current = mins;
        setTimerSeconds(mins * 60);
        setShowStreakMessage(Boolean(data.showStreakMessage));
      } catch (err) {
        if (cancelled) return;
        setTimerDurationError('Using default focus time.');
        setTimerDurationMinutes(DEFAULT_TIMER_MINUTES);
        timerDurationRef.current = DEFAULT_TIMER_MINUTES;
        setTimerSeconds(DEFAULT_TIMER_MINUTES * 60);
      } finally {
        if (!cancelled) setTimerDurationLoading(false);
      }
    };

    loadTimerDuration();
    return () => { cancelled = true; };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load parent task details
      const taskData = await fetchAPI('/task/get');
      const foundTask = (taskData.tasks || []).find(t => String(t.id) === String(id));
      if (!foundTask) {
        setError('Task not found');
        return;
      }
      setTask(foundTask);

      // Load sub-tasks
      const subtaskData = await fetchAPI(`/task/${id}/subtasks`);
      if (subtaskData && subtaskData.success) {
        setSubtasks(subtaskData.subtasks || []);
        // Automatically select the first uncompleted sub-task for timer if none selected
        const firstUncompleted = (subtaskData.subtasks || []).find(s => !s.is_completed);
        if (firstUncompleted) {
          setSelectedSubtaskForTimer(firstUncompleted);
        } else if (subtaskData.subtasks && subtaskData.subtasks.length > 0) {
          setSelectedSubtaskForTimer(subtaskData.subtasks[0]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Eisenhower/Status fields on Task
  const updateTaskField = async (fields) => {
    if (!task) return;
    const updatedTask = { ...task, ...fields };
    try {
      await fetchAPI(`/task/update/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updatedTask.task_title,
          description: updatedTask.description,
          status: updatedTask.status,
          due_date: updatedTask.due_date,
          due_time: updatedTask.due_time,
          category: updatedTask.category,
          is_urgent: updatedTask.is_urgent,
          is_important: updatedTask.is_important
        })
      });
      setTask(updatedTask);
      setSuccess('Task settings updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to update task settings.');
    }
  };

  // Toggle Sub-task Completion
  const toggleSubtask = async (subtask) => {
    const nextStatus = !subtask.is_completed;
    try {
      await fetchAPI(`/task/subtasks/${subtask.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_completed: nextStatus })
      });
      
      // Update locally
      setSubtasks(subtasks.map(s => s.id === subtask.id ? { ...s, is_completed: nextStatus } : s));
      
      // If completed, automatically verify if parent task needs status updating
      const remainingUncompleted = subtasks.filter(s => s.id !== subtask.id && !s.is_completed);
      if (nextStatus && remainingUncompleted.length === 0) {
        updateTaskField({ status: 'Completed' });
      } else if (!nextStatus && task.status === 'Completed') {
        updateTaskField({ status: 'In Progress' });
      }
    } catch (err) {
      setError('Failed to update sub-task status.');
    }
  };

  // Delete Sub-task
  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await fetchAPI(`/task/subtasks/${subtaskId}`, { method: 'DELETE' });
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
      if (selectedSubtaskForTimer?.id === subtaskId) {
        setSelectedSubtaskForTimer(subtasks.find(s => s.id !== subtaskId) || null);
      }
    } catch (err) {
      setError('Failed to delete sub-task.');
    }
  };

  // Add Manual Sub-task
  const handleAddManualSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const data = await fetchAPI(`/task/${id}/subtasks/add`, {
        method: 'POST',
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          estimated_time: newSubtaskEst,
          schedule_date: task.due_date ? task.due_date.split('T')[0] : new Date().toISOString().split('T')[0]
        })
      });

      if (data && data.success) {
        const newSub = {
          id: data.subtaskId,
          task_id: task.id,
          title: newSubtaskTitle.trim(),
          estimated_time: newSubtaskEst,
          actual_time: 0,
          is_completed: 0,
          schedule_date: task.due_date ? task.due_date.split('T')[0] : new Date().toISOString().split('T')[0]
        };
        setSubtasks([...subtasks, newSub]);
        if (!selectedSubtaskForTimer) setSelectedSubtaskForTimer(newSub);
        setNewSubtaskTitle('');
        setNewSubtaskEst(30);
      }
    } catch (err) {
      setError('Failed to add manual subtask');
    }
  };

  // Generate AI Subtask Breakdown
  const handleAIBreakdown = async () => {
    setAiLoading(true);
    setError('');
    try {
      const data = await fetchAPI(`/ai/generate/${id}`, { method: 'POST' });
      if (data && data.success) {
        setSubtasks(data.subtasks || []);
        if (data.subtasks && data.subtasks.length > 0) {
          setSelectedSubtaskForTimer(data.subtasks[0]);
        }
        setSuccess('✨ Smart breakdown generated and scheduled successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Gemini Assistant is currently unavailable. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Save Edited Sub-task
  const handleSaveSubtaskEdit = async (subtaskId) => {
    if (!editSubtaskTitle.trim()) return;
    try {
      await fetchAPI(`/task/subtasks/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editSubtaskTitle.trim(),
          estimated_time: editSubtaskEst,
          actual_time: editSubtaskAct
        })
      });

      setSubtasks(subtasks.map(s => s.id === subtaskId ? {
        ...s,
        title: editSubtaskTitle.trim(),
        estimated_time: editSubtaskEst,
        actual_time: editSubtaskAct
      } : s));

      // Also update selectedSubtaskForTimer if it was the one being edited
      if (selectedSubtaskForTimer?.id === subtaskId) {
        setSelectedSubtaskForTimer({
          ...selectedSubtaskForTimer,
          title: editSubtaskTitle.trim(),
          estimated_time: editSubtaskEst,
          actual_time: editSubtaskAct
        });
      }

      setEditingSubtaskId(null);
      setSuccess('Subtask updated successfully!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError('Failed to update subtask.');
    }
  };

  // Timer Handlers
  const toggleTimer = () => {
    if (timerActive) {
      // Pause
      clearInterval(timerRef.current);
      setTimerActive(false);
    } else {
      // Start
      if (!selectedSubtaskForTimer) {
        setError('Please select a subtask to focus on first!');
        return;
      }
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            // Pomodoro Finished!
            clearInterval(timerRef.current);
            setTimerActive(false);
            const mins = timerDurationRef.current;
            handleSaveTimerSession(mins);

            // Show local notification if permitted
            if (Notification.permission === 'granted') {
              if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('Pomodoro Completed', {
                    body: 'Time to take a break!',
                    icon: '/icon-192.png',
                    tag: 'pomodoro-notification'
                  });
                });
              } else {
                new Notification('Pomodoro Completed', {
                  body: 'Time to take a break!',
                  icon: '/icon-192.png'
                });
              }
            }

            alert('Time to take a break!');
            return mins * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSaveTimerSession = async (minutesTracked) => {
    if (!selectedSubtaskForTimer) return;
    const nextActualTime = (selectedSubtaskForTimer.actual_time || 0) + minutesTracked;

    try {
      await fetchAPI(`/task/subtasks/${selectedSubtaskForTimer.id}`, {
        method: 'PUT',
        body: JSON.stringify({ actual_time: nextActualTime })
      });

      // Update locally
      setSubtasks(subtasks.map(s => s.id === selectedSubtaskForTimer.id ? { ...s, actual_time: nextActualTime } : s));
      setSuccess(`Logged ${minutesTracked} focus minutes to "${selectedSubtaskForTimer.title}"!`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError('Failed to save focus time to database.');
    }
  };

  const formatTimerTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="page-container"><div style={{ marginTop: '2rem' }}>Loading task workspace...</div></div>;
  if (error && !task) return <div className="page-container"><div className="alert alert-danger" style={{ marginTop: '2rem' }}>{error}</div></div>;

  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const totalEstTime = subtasks.reduce((sum, s) => sum + (s.estimated_time || 0), 0);
  const totalActTime = subtasks.reduce((sum, s) => sum + (s.actual_time || 0), 0);

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
      
      {/* Back button & Title bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/tasks" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
          ← Back to Tasks
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-outline"
            style={{ 
              backgroundColor: task.is_urgent ? 'var(--danger-light)' : 'transparent',
              color: task.is_urgent ? 'var(--danger-color)' : 'var(--text-main)',
              border: task.is_urgent ? '1px solid var(--danger-color)' : '1px solid var(--border-color)' 
            }}
            onClick={() => updateTaskField({ is_urgent: !task.is_urgent })}
          >
            🔥 Urgent
          </button>
          <button 
            className="btn btn-outline"
            style={{ 
              backgroundColor: task.is_important ? 'var(--warning-light)' : 'transparent',
              color: task.is_important ? 'var(--warning-color)' : 'var(--text-main)',
              border: task.is_important ? '1px solid var(--warning-color)' : '1px solid var(--border-color)' 
            }}
            onClick={() => updateTaskField({ is_important: !task.is_important })}
          >
            ⭐ Important
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Task Title, Progress bar & Sub-tasks */}
        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-completed" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-dark)', marginBottom: '0.5rem' }}>
                  {task.category || 'Study'}
                </span>
                <h2 style={{ margin: 0 }}>{task.task_title}</h2>
              </div>
              <select 
                className="form-control"
                style={{ width: '150px', padding: '0.5rem' }}
                value={task.status || 'Open'}
                onChange={(e) => updateTaskField({ status: e.target.value })}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {task.description || 'No description notes provided for this task.'}
            </p>

            {/* Progress Bar */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                <span>Sub-task Completion Rate</span>
                <span>{progressPercent}% ({completedSubtasks}/{totalSubtasks})</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-light)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--success-color)', borderRadius: '5px', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          </div>

          {/* Sub-tasks Section */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              Sub-tasks Breakdown
            </h3>

            {totalSubtasks === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
                <h4 style={{ marginBottom: '0.5rem' }}>Automated AI Study Plan</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                  Let Gemini AI analyze your task title and schedule granular sub-tasks evenly before the due date.
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={handleAIBreakdown}
                  disabled={aiLoading}
                >
                  {aiLoading ? '✨ Scheduling Subtasks...' : '✨ Generate AI Breakdown'}
                </button>
              </div>
            ) : (
              <div>
                {/* List of subtasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  {subtasks.map((sub) => {
                    const isSelected = selectedSubtaskForTimer?.id === sub.id;
                    const isEditing = editingSubtaskId === sub.id;

                    if (isEditing) {
                      return (
                        <div 
                          key={sub.id} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '1rem',
                            padding: '1.25rem', 
                            borderRadius: '8px', 
                            border: '2px solid var(--accent-dark)',
                            backgroundColor: 'var(--accent-light)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Subtask Title</label>
                              <input 
                                type="text"
                                className="form-control"
                                value={editSubtaskTitle}
                                onChange={(e) => setEditSubtaskTitle(e.target.value)}
                              />
                            </div>
                            <div style={{ width: '100px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Est. Mins</label>
                              <input 
                                type="number"
                                className="form-control"
                                value={editSubtaskEst}
                                onChange={(e) => setEditSubtaskEst(parseInt(e.target.value) || 0)}
                                min="0"
                              />
                            </div>
                            <div style={{ width: '100px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Act. Mins</label>
                              <input 
                                type="number"
                                className="form-control"
                                value={editSubtaskAct}
                                onChange={(e) => setEditSubtaskAct(parseInt(e.target.value) || 0)}
                                min="0"
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button 
                              className="btn btn-outline btn-small"
                              onClick={() => setEditingSubtaskId(null)}
                              style={{ padding: '0.25rem 0.75rem' }}
                            >
                              Cancel ❌
                            </button>
                            <button 
                              className="btn btn-primary btn-small"
                              onClick={() => handleSaveSubtaskEdit(sub.id)}
                              style={{ padding: '0.25rem 0.75rem' }}
                            >
                              Save 💾
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={sub.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          border: isSelected ? '2px solid var(--accent-dark)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <input 
                            type="checkbox" 
                            checked={!!sub.is_completed}
                            onChange={() => toggleSubtask(sub)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div 
                              style={{ 
                                fontWeight: '500', 
                                fontSize: '0.95rem',
                                color: sub.is_completed ? 'var(--text-muted)' : 'var(--text-main)',
                                textDecoration: sub.is_completed ? 'line-through' : 'none',
                                cursor: 'pointer'
                              }}
                              onClick={() => setSelectedSubtaskForTimer(sub)}
                            >
                              {sub.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              🗓️ Scheduled: {sub.schedule_date ? new Date(sub.schedule_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                            <div>Est: <strong>{sub.estimated_time}m</strong></div>
                            <div>Act: <strong>{sub.actual_time || 0}m</strong></div>
                          </div>
                          
                          <button 
                            className="btn btn-outline btn-small"
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              backgroundColor: isSelected ? 'var(--accent-dark)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--text-muted)',
                              border: isSelected ? 'none' : '1px solid var(--border-color)'
                            }}
                            onClick={() => setSelectedSubtaskForTimer(sub)}
                          >
                            🎯 Focus
                          </button>

                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                            onClick={() => {
                              setEditingSubtaskId(sub.id);
                              setEditSubtaskTitle(sub.title);
                              setEditSubtaskEst(sub.estimated_time);
                              setEditSubtaskAct(sub.actual_time || 0);
                            }}
                            title="Edit Subtask"
                          >
                            ✏️
                          </button>
                          
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', fontSize: '1rem', padding: 0 }}
                            onClick={() => handleDeleteSubtask(sub.id)}
                            title="Delete Subtask"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add manual subtask inline */}
                {totalSubtasks >= MAX_SUBTASKS ? (
                  <div style={{ marginTop: '1.5rem', padding: '0.85rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '0.875rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ <strong>Sub-task limit reached.</strong>&nbsp;A task can have a maximum of {MAX_SUBTASKS} sub-tasks. Delete an existing one to add a new step.
                  </div>
                ) : (
                <form onSubmit={handleAddManualSubtask} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Add custom sub-task step..." 
                    className="form-control"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Est Mins" 
                    className="form-control"
                    value={newSubtaskEst}
                    onChange={(e) => setNewSubtaskEst(parseInt(e.target.value) || 0)}
                    min="5"
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: 0 }}>
                    + Add Step
                  </button>
                </form>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button 
                    className="btn btn-outline btn-small" 
                    onClick={handleAIBreakdown}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Regenerating...' : '✨ Regenerate AI Breakdown'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Focus Timer & Stats Widget */}
        <div>
          {/* Pomodoro Timer Widget */}
          <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', border: '1px solid var(--accent-dark)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-dark)', marginBottom: '1rem' }}>
              🍅 Pomodoro Study Room
            </h3>

            {timerDurationLoading ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Loading your focus duration...
              </p>
            ) : (
              <>
                {timerDurationError && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
                    {timerDurationError}
                  </p>
                )}
                {showStreakMessage && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Your focus time: {timerDurationMinutes} mins (increases as you build your streak!)
                  </p>
                )}
              </>
            )}

            {/* Selected Subtask Preview */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', backgroundColor: 'var(--border-light)', padding: '0.75rem', borderRadius: '6px' }}>
              {selectedSubtaskForTimer ? (
                <>
                  Focusing on:<br />
                  <strong style={{ color: 'var(--text-main)' }}>{selectedSubtaskForTimer.title}</strong>
                </>
              ) : (
                'Select a sub-task step below to begin focusing!'
              )}
            </div>

            {/* Main Clock Face */}
            <div style={{ fontSize: '3.5rem', fontWeight: '700', margin: '1.5rem 0', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {timerDurationLoading ? '--:--' : formatTimerTime(timerSeconds)}
            </div>

            {/* Timer Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', backgroundColor: timerActive ? 'var(--warning-color)' : 'var(--accent-dark)' }}
                onClick={toggleTimer}
                disabled={timerDurationLoading || !selectedSubtaskForTimer}
              >
                {timerActive ? '⏸️ Pause Pomodoro' : '🍅 Start Focus Interval'}
              </button>

              <button 
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setTimerActive(false);
                  if (timerRef.current) clearInterval(timerRef.current);
                  setTimerSeconds(timerDurationRef.current * 60);
                }}
              >
                ⏹️ Reset Timer
              </button>
            </div>
          </div>

          {/* Productivity Stats card */}
          <div className="card">
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Task Workload Analysis</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Steps</span>
                <span style={{ fontWeight: '600' }}>{totalSubtasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Est. Core Study Time</span>
                <span style={{ fontWeight: '600' }}>{totalEstTime} mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Actual Study Spent</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-dark)' }}>{totalActTime} mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Efficiency Ratio</span>
                <span style={{ fontWeight: '600', color: totalActTime > totalEstTime ? 'var(--danger-color)' : 'var(--success-color)' }}>
                  {totalEstTime > 0 ? `${Math.round((totalActTime / totalEstTime) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
