import { useState, useEffect } from 'react';
import { fetchAPI } from '../api';

export default function DailyPlanner() {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeFrame, setTimeFrame] = useState('today'); // 'today', 'tomorrow', 'week'
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  const [completingSubtask, setCompletingSubtask] = useState(null);
  const [actualMinutes, setActualMinutes] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDailySubtasks();
  }, []);

  const loadDailySubtasks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAPI('/task/daily-subtasks');
      if (data && data.success) {
        setSubtasks(data.subtasks || []);
      }
    } catch (err) {
      setError('Failed to fetch daily study planner schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompleteModal = (subtask) => {
    setCompletingSubtask(subtask);
    setActualMinutes('');
    setModalError('');
  };

  const handleCancelComplete = () => {
    setCompletingSubtask(null);
    setActualMinutes('');
    setModalError('');
  };

  const handleSubmitComplete = async () => {
    const minutes = Number(actualMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setModalError('Please enter a positive number of minutes.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      await fetchAPI(`/task/subtasks/${completingSubtask.id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ actual_time_minutes: Math.round(minutes) })
      });

      setSubtasks(subtasks.filter(s => s.id !== completingSubtask.id));
      setSessionCompletedCount(prev => prev + 1);
      setSuccess(`"${completingSubtask.title}" marked complete!`);
      setTimeout(() => setSuccess(''), 2500);
      handleCancelComplete();
    } catch (err) {
      setModalError(err.message || 'Failed to save completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container"><div style={{ marginTop: '2rem' }}>Loading Daily study schedule planner...</div></div>;

  // Compute boundaries
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const nextWeekDate = new Date(todayDate);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);

  const getLocalDateStr = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(todayDate);
  const tomorrowStr = getLocalDateStr(tomorrowDate);
  const nextWeekStr = getLocalDateStr(nextWeekDate);

  // Filter subtasks based on selected time frame
  let displayedTasks = [];
  let headerText = '';

  if (timeFrame === 'today') {
      displayedTasks = subtasks.filter(s => !s.schedule_date || s.schedule_date.split('T')[0] <= todayStr);
      headerText = "📅 Today's Study & Task Planner";
  } else if (timeFrame === 'tomorrow') {
      displayedTasks = subtasks.filter(s => s.schedule_date && s.schedule_date.split('T')[0] === tomorrowStr);
      headerText = "📅 Tomorrow's Planner";
  } else if (timeFrame === 'week') {
      displayedTasks = subtasks.filter(s => s.schedule_date && s.schedule_date.split('T')[0] > todayStr && s.schedule_date.split('T')[0] <= nextWeekStr);
      headerText = "📅 Next 7 Days Planner";
  }

  const DAILY_LIMIT = 20;

  const totalScheduled = displayedTasks.length;
  const limitedTasks = timeFrame === 'today' ? displayedTasks.slice(0, DAILY_LIMIT) : displayedTasks;
  const isLimitReached = timeFrame === 'today' && totalScheduled > DAILY_LIMIT;
  const totalForPeriod = sessionCompletedCount + totalScheduled;
  const performanceRate = totalForPeriod > 0 ? Math.round((sessionCompletedCount / totalForPeriod) * 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>{headerText}</h2>
        <p className="subtitle">Focus step-by-step to stay balanced and complete all course milestones on schedule.</p>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          className={`btn ${timeFrame === 'today' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTimeFrame('today')}
        >
          Today
        </button>
        <button 
          className={`btn ${timeFrame === 'tomorrow' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTimeFrame('tomorrow')}
        >
          Tomorrow
        </button>
        <button 
          className={`btn ${timeFrame === 'week' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTimeFrame('week')}
        >
          Next 7 Days
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Checklist Grid */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📝 Scheduled Sub-Tasks Checklist
            </h3>

            {totalScheduled === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '3rem' }}>🎉</span>
                <h4 style={{ marginTop: '1rem', color: 'var(--text-main)' }}>You are completely caught up!</h4>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>No sub-tasks are scheduled for this time frame. Create new tasks or use Gemini AI to break down complex workloads.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isLimitReached && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ <strong>Daily limit:</strong> Showing {DAILY_LIMIT} of {totalScheduled} tasks for today. Complete or reschedule tasks to see the rest.
                  </div>
                )}
                {limitedTasks.map(sub => {
                  const isOverdue = sub.schedule_date && sub.schedule_date.split('T')[0] < todayStr;
                  return (
                    <div 
                      key={sub.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <input 
                          type="checkbox" 
                          checked={false}
                          onChange={() => handleOpenCompleteModal(sub)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                          <div 
                            style={{ 
                              fontWeight: '600', 
                              fontSize: '0.95rem',
                              color: 'var(--text-main)'
                            }}
                          >
                            {sub.title}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                              {sub.task_title}
                            </span>
                            {isOverdue && (
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', fontWeight: '700' }}>
                                OVERDUE STEP
                              </span>
                            )}
                            {timeFrame !== 'today' && sub.schedule_date && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(sub.schedule_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          <div>Est: <strong>{sub.estimated_time}m</strong></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats */}
        <div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Completion Rate
            </h4>
            <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'var(--accent-dark)', marginBottom: '0.5rem' }}>
              {performanceRate}%
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ width: `${performanceRate}%`, height: '100%', backgroundColor: 'var(--accent-dark)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Completed <strong>{sessionCompletedCount}</strong> of <strong>{totalForPeriod}</strong> scheduled steps for {timeFrame}.
            </p>
          </div>
        </div>

      </div>

      {/* Actual Time Modal */}
      {completingSubtask && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={handleCancelComplete}
        >
          <div
            className="modal-content card"
            style={{ padding: '2rem', maxWidth: '420px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Task Completed! 🎉
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{completingSubtask.title}</strong>
            </p>
            <p style={{ color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              How long did this task actually take?
            </p>

            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              Minutes
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              placeholder="e.g. 30"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                marginBottom: '0.75rem',
                fontSize: '1rem'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitComplete();
              }}
            />

            {modalError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmitComplete}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save & Done'}
              </button>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={handleCancelComplete}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
