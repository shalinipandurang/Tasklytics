import { useState, useEffect } from 'react';
import { fetchAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState({ name: 'Alex' });
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('taskManagerUser');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
    loadAnalytics();
    loadTasks();
    loadHeatmap();
  }, []);

  const loadHeatmap = async () => {
    try {
      const res = await fetchAPI('/task/heatmap');
      if (res && res.success) {
        setHeatmapData(res.heatmap || []);
      }
    } catch (err) {
      console.error("Failed to load heatmap logs", err);
    }
  };

  const getContributionGrid = () => {
    const grid = [];
    const today = new Date();
    for (let i = 153; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = heatmapData.find(h => h.date === dateStr);
      const count = log ? log.count : 0;
      grid.push({ date: dateStr, count });
    }
    return grid;
  };

  const renderHeatmap = () => {
    const gridDays = getContributionGrid();
    const columns = [];
    for (let i = 0; i < 22; i++) {
      columns.push(gridDays.slice(i * 7, (i + 1) * 7));
    }
    
    return (
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>Productivity Consistency Map</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Your academic assignment completion frequency over the last 150 days</p>
        
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', height: '110px', paddingBefore: '4px' }}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {columns.map((week, wIdx) => (
              <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {week.map((day, dIdx) => {
                  let bgColor = '#e2e8f0';
                  if (day.count === 1) bgColor = '#bbf7d0';
                  else if (day.count === 2) bgColor = '#4ade80';
                  else if (day.count >= 3) bgColor = '#166534';
                  
                  return (
                    <div 
                      key={dIdx} 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '2px', 
                        backgroundColor: bgColor,
                        cursor: 'pointer' 
                      }}
                      title={`${day.count} tasks completed on ${new Date(day.date).toLocaleDateString()}`}
                    ></div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          <span>Less</span>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#e2e8f0' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#bbf7d0' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#4ade80' }}></div>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#166534' }}></div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const loadTasks = async () => {
    try {
      const data = await fetchAPI('/task/get');
      if (data && data.success && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI('/analytics/dashboard');
      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        setError('Failed to load dashboard statistics.');
      }
    } catch (err) {
      setError('Error connecting to analytics API.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container"><div style={{ marginTop: '2rem' }}>Loading dashboard...</div></div>;
  if (error) return <div className="page-container"><div className="alert alert-danger" style={{ marginTop: '2rem' }}>{error}</div></div>;
  if (!data) return null;

  const { summary, weekly } = data;
  
  // Transform weekly data for the mockup-style bar chart (using placeholders if needed)
  const chartData = weekly && weekly.length > 0 ? weekly : [
    { date: 'Mon', completed: 0, pending: 0 },
    { date: 'Tue', completed: 0, pending: 0 },
    { date: 'Wed', completed: 0, pending: 0 },
    { date: 'Thu', completed: 0, pending: 0 },
    { date: 'Fri', completed: 0, pending: 0 },
    { date: 'Sat', completed: 0, pending: 0 },
    { date: 'Sun', completed: 0, pending: 0 },
  ];

  const firstName = user.name ? user.name.split(' ')[0] : 'Alex';

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const upcomingTasks = tasks.filter(t => {
    if ((t.status || 'pending').toLowerCase() === 'completed') return false;
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0,0,0,0);
    return dueDate >= today;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const upcomingCount = upcomingTasks.length;
  let nextTaskDisplay = 'No upcoming tasks';
  if (upcomingCount > 0) {
    const nextTask = upcomingTasks[0];
    const dueDate = new Date(nextTask.due_date);
    dueDate.setHours(0,0,0,0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let dayStr = diffDays === 0 ? 'Today' : `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    const taskName = nextTask.task_title || 'Task';
    // Truncate if too long
    const shortTaskName = taskName.length > 15 ? taskName.substring(0, 15) + '...' : taskName;
    nextTaskDisplay = `${shortTaskName} ${dayStr}`;
  }

  const recentTasks = [...tasks].sort((a, b) => {
    if (a.created_at && b.created_at) {
       return new Date(b.created_at) - new Date(a.created_at);
    }
    return b.id - a.id;
  }).slice(0, 3);

  // Daily target and progress calculations
  const completedToday = tasks.filter(t => {
    if ((t.status || '').toLowerCase() !== 'completed') return false;
    if (!t.updated_at) return false;
    const compDate = new Date(t.updated_at);
    return compDate.toDateString() === new Date().toDateString();
  }).length;
  
  const dailyTarget = user.daily_target ?? 3;
  const targetPercent = Math.min(Math.round((completedToday / dailyTarget) * 100), 100);

  return (
    <div className="page-container">
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>Welcome back, {firstName}</h2>
        <p className="subtitle">You have {summary.pendingTasks || 0} pending tasks and {upcomingCount} upcoming due dates.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Tasks</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>{summary.totalTasks ?? 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Keep track of your daily tasks
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Completed</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--success-color)' }}>{summary.completedTasks ?? 0}</div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', marginTop: '1rem' }}>
                <div style={{ width: `${summary.productivityPercentage ?? 0}%`, height: '100%', backgroundColor: 'var(--accent-dark)', borderRadius: '3px' }}></div>
              </div>
            </div>
            <div className="card" style={{ border: '1px solid #fecaca', backgroundColor: '#fff5f5' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Upcoming Duedates</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--danger-color)' }}>
                {upcomingCount < 10 ? `0${upcomingCount}` : upcomingCount}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>⏰</span> {nextTaskDisplay}
              </div>
            </div>
            <div className="card" style={{ border: '1px solid var(--accent-dark)', backgroundColor: 'var(--sidebar-bg)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Daily Target Goal</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--accent-dark)' }}>
                {completedToday} / {dailyTarget}
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '0.5rem', marginBottom: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: `${targetPercent}%`, height: '100%', backgroundColor: 'var(--success-color)', borderRadius: '3px', transition: 'width 0.4s ease-out' }}></div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500', lineHeight: '1.3' }}>
                {targetPercent >= 100 ? (
                  <span style={{ color: 'var(--success-color)', fontWeight: '600' }}>🎉 Goal Achieved! Awesome!</span>
                ) : targetPercent > 0 ? (
                  <span>{targetPercent}% complete. Keep going!</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No tasks completed today yet.</span>
                )}
              </div>
            </div>
          </div>

          {renderHeatmap()}

          {/* Weekly Productivity Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>Weekly Productivity</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distribution of tasks over the last 7 days</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-dark)' }}>
                  {weekly?.reduce((acc, curr) => acc + (Number(curr.completed) || 0), 0) || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks Completed</div>
              </div>
            </div>
            
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-dark)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--accent-dark)" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#e2e8f0" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} 
                    dy={15} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '1rem' }}
                    itemStyle={{ fontSize: '0.85rem', fontWeight: 600 }}
                  />
                  <Bar dataKey="completed" name="Completed" fill="url(#colorCompleted)" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="pending" name="Pending" fill="url(#colorPending)" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--accent-dark)' }}></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>Completed Tasks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e2e8f0' }}></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>Pending Tasks</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {recentTasks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No recent activity.</div>
              ) : (
                recentTasks.map((task, index) => {
                  const isCompleted = (task.status || '').toLowerCase() === 'completed';
                  return (
                    <div key={task.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: index < recentTasks.length - 1 ? '1.5rem' : '0', borderBottom: index < recentTasks.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isCompleted ? 'var(--success-light)' : '#e0e7ff', color: isCompleted ? 'var(--success-color)' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                        {isCompleted ? '✓' : '⬆️'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>{isCompleted ? 'Completed' : 'Added'}</span> {task.task_title || 'Task'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {task.category ? (
                            <>
                              Category: 
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
                                padding: '0.1rem 0.4rem', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                fontWeight: '700' 
                              }}>
                                {task.category}
                              </span>
                            </>
                          ) : 'Task activity'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

      </div>
    </div>
  );
}
