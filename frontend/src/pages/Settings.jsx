import { useState, useEffect } from 'react';
import { fetchAPI } from '../api';

const securityQuestionsList = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "In what city were you born?",
  "What was the name of your elementary school?",
  "What is your favorite book?"
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account');
  const [user, setUser] = useState(null);
  
  // Profile Settings Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState('light');
  const [dailyTarget, setDailyTarget] = useState(3);
  const [defaultCategory, setDefaultCategory] = useState('Other');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Security Settings Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Statuses
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Security Question Form
  const [sqCurrentPassword, setSqCurrentPassword] = useState('');
  const [newSecurityQuestion, setNewSecurityQuestion] = useState(securityQuestionsList[0]);
  const [newSecurityAnswer, setNewSecurityAnswer] = useState('');

  const [sqLoading, setSqLoading] = useState(false);
  const [sqError, setSqError] = useState('');
  const [sqSuccess, setSqSuccess] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setInitLoading(true);
      const data = await fetchAPI('/user/profile');
      if (data && data.success && data.user) {
        setUser(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setTheme(data.user.theme || 'light');
        setDailyTarget(data.user.daily_target ?? 3);
        setDefaultCategory(data.user.default_category || 'Other');
        setAiEnabled(data.user.ai_enabled !== 0 && data.user.ai_enabled !== false);
        setNotificationsEnabled(data.user.notifications_enabled !== 0 && data.user.notifications_enabled !== false);
      }
    } catch (err) {
      setError('Failed to fetch user profile details. Please try again.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await fetchAPI('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          theme,
          daily_target: parseInt(dailyTarget) || 3,
          default_category: defaultCategory,
          ai_enabled: aiEnabled ? 1 : 0,
          notifications_enabled: notificationsEnabled ? 1 : 0
        })
      });

      if (data && data.success && data.user) {
        setUser(data.user);
        
        // Save the updated user to local storage
        localStorage.setItem('taskManagerUser', JSON.stringify(data.user));
        
        // Apply theme globally in real-time
        if (data.user.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.body.classList.add('dark-theme');
        } else {
          document.documentElement.removeAttribute('data-theme');
          document.body.classList.remove('dark-theme');
        }

        setSuccess('Settings and profile updated successfully!');
        
        // Trigger a storage change so layout updates in case they have a navbar user name
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const data = await fetchAPI('/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (data && data.success) {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Incorrect current password or update failed.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeSecurityQuestion = async (e) => {
    e.preventDefault();
    if (!sqCurrentPassword || !newSecurityQuestion || !newSecurityAnswer) {
      setSqError('Please fill out all fields.');
      return;
    }

    setSqLoading(true);
    setSqError('');
    setSqSuccess('');

    try {
      const data = await fetchAPI('/user/change-security-question', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: sqCurrentPassword,
          newSecurityQuestion,
          newSecurityAnswer
        })
      });

      if (data && data.success) {
        setSqSuccess('Security question updated successfully!');
        setSqCurrentPassword('');
        setNewSecurityAnswer('');
      }
    } catch (err) {
      setSqError(err.message || 'Incorrect password or update failed.');
    } finally {
      setSqLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="page-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading user settings...</div>
      </div>
    );
  }

  const initialLetter = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '1rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.25rem' }}>Settings</h2>
        <p className="subtitle">Manage your account profile, system configurations, and security preferences.</p>
      </div>

      <div className="settings-layout">
        
        {/* Settings Navigation Tabs */}
        <aside className="settings-nav">
          <button 
            onClick={() => setActiveTab('account')} 
            className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          >
            👤 Profile & Account
          </button>
          <button 
            onClick={() => setActiveTab('preferences')} 
            className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          >
            🎨 App Preferences
          </button>
          <button 
            onClick={() => setActiveTab('security')} 
            className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          >
            🔒 Security & Password
          </button>
        </aside>

        {/* Settings Main Content panel */}
        <div className="settings-content">
          
          {/* TAB 1: Profile & Account Settings */}
          {activeTab === 'account' && (
            <div className="card" style={{ padding: '2.5rem' }}>
              <div className="profile-hero">
                <div className="profile-avatar-large">
                  {initialLetter}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>{name || 'Productive User'}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{email}</p>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label htmlFor="profileName" className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    id="profileName" 
                    className="form-control"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profileEmail" className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    id="profileEmail" 
                    className="form-control"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                    {loading ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: App Preferences Settings */}
          {activeTab === 'preferences' && (
            <div className="card" style={{ padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Personalize Tasklytics</h3>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSaveProfile}>
                
                {/* Visual Theme Selection */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label className="form-label" style={{ marginBottom: '1rem' }}>Interface Theme</label>
                  <div className="toggle-group">
                    <div 
                      className={`toggle-card ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <div className="theme-preview" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '40px', backgroundColor: '#f1f5f9', borderRight: '1px solid #e2e8f0' }}></div>
                        <div style={{ flexGrow: 1, padding: '8px' }}>
                          <div style={{ width: '60%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginBottom: '4px' }}></div>
                          <div style={{ width: '40%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>☀️ Light Theme</span>
                    </div>

                    <div 
                      className={`toggle-card ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <div className="theme-preview" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                        <div style={{ width: '40px', backgroundColor: '#0b0f19', borderRight: '1px solid #334155' }}></div>
                        <div style={{ flexGrow: 1, padding: '8px' }}>
                          <div style={{ width: '60%', height: '8px', backgroundColor: '#334155', borderRadius: '2px', marginBottom: '4px' }}></div>
                          <div style={{ width: '40%', height: '6px', backgroundColor: '#1e293b', borderRadius: '2px' }}></div>
                        </div>
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>🌙 Slate Dark Theme</span>
                    </div>
                  </div>
                </div>

                {/* Target completed tasks */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="dailyGoal" className="form-label" style={{ marginBottom: 0 }}>Daily Completion Target</label>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-color)' }}>{dailyTarget} tasks</span>
                  </div>
                  <input 
                    type="range" 
                    id="dailyGoal" 
                    min="1" 
                    max="10" 
                    style={{ width: '100%', height: '6px', accentColor: 'var(--accent-dark)', cursor: 'pointer' }}
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Choose a realistic number of assignments to complete every day. Your progress will be plotted in the Dashboard.</p>
                </div>

                {/* Default task category */}
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label htmlFor="defaultCategory" className="form-label">Default Task Category</label>
                  <select 
                    id="defaultCategory" 
                    className="form-control"
                    value={defaultCategory}
                    onChange={(e) => setDefaultCategory(e.target.value)}
                  >
                    <option value="Study">Study</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your category selection when adding a task will be pre-filled with this preference.</p>
                </div>

                {/* System Toggles */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1rem' }}>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">✨ AI Assistant Recommendations</div>
                      <div className="setting-description">Enable actionable suggestions, effort tracking estimates, and decomposition steps directly within your task creator.</div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={aiEnabled} 
                        onChange={(e) => setAiEnabled(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">✉️ Daily Digits Email Summaries</div>
                      <div className="setting-description">Receive automated notifications and calendar highlights for upcoming due dates each morning.</div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={notificationsEnabled} 
                        onChange={(e) => setNotificationsEnabled(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                    {loading ? 'Saving...' : 'Save App Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Security & Password Settings */}
          {activeTab === 'security' && (
            <div className="card" style={{ padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Change Account Password</h3>

              {passwordError && <div className="alert alert-danger">{passwordError}</div>}
              {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}

              <form onSubmit={handleChangePassword}>
                
                <div className="form-group">
                  <label htmlFor="currentPass" className="form-label">Current Password</label>
                  <input 
                    type="password" 
                    id="currentPass" 
                    className="form-control"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPass" className="form-label">New Password</label>
                  <input 
                    type="password" 
                    id="newPass" 
                    className="form-control"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Password must be at least 6 characters long.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPass" className="form-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    id="confirmPass" 
                    className="form-control"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading} style={{ minWidth: '150px' }}>
                    {passwordLoading ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>

              <hr style={{ margin: '3rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Update Security Question</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Set a security question and answer to recover your account if you forget your password.
              </p>

              {sqError && <div className="alert alert-danger">{sqError}</div>}
              {sqSuccess && <div className="alert alert-success">{sqSuccess}</div>}

              <form onSubmit={handleChangeSecurityQuestion}>
                
                <div className="form-group">
                  <label htmlFor="sqCurrentPass" className="form-label">Current Password</label>
                  <input 
                    type="password" 
                    id="sqCurrentPass" 
                    className="form-control"
                    placeholder="••••••••"
                    value={sqCurrentPassword}
                    onChange={(e) => setSqCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="settingsSecurityQuestion" className="form-label">New Security Question</label>
                  <select 
                    id="settingsSecurityQuestion" 
                    className="form-control"
                    value={newSecurityQuestion}
                    onChange={(e) => setNewSecurityQuestion(e.target.value)}
                  >
                    {securityQuestionsList.map((q, idx) => (
                      <option key={idx} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="settingsSecurityAnswer" className="form-label">New Security Answer</label>
                  <input 
                    type="text" 
                    id="settingsSecurityAnswer" 
                    className="form-control"
                    placeholder="Your Answer (case-insensitive)"
                    value={newSecurityAnswer}
                    onChange={(e) => setNewSecurityAnswer(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={sqLoading} style={{ minWidth: '150px' }}>
                    {sqLoading ? 'Saving...' : 'Update Security Question'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
