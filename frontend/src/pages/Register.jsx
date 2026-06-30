import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAPI } from '../api';
import { checkAndSubscribeNotifications } from '../pushNotification';

const securityQuestionsList = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "In what city were you born?",
  "What was the name of your elementary school?",
  "What is your favorite book?"
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(securityQuestionsList[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, go to dashboard
    const token = localStorage.getItem('taskManagerToken');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !securityAnswer) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await fetchAPI('/user/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, securityQuestion, securityAnswer })
      });

      if (data && data.success) {
        localStorage.setItem('taskManagerToken', data.token);
        localStorage.setItem('taskManagerUser', JSON.stringify(data.user));
        setSuccess('Registration successful!');
        checkAndSubscribeNotifications();
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-screen">
      <div className="split-left">
        <div className="split-left-content">
          <h1>Tasklytics</h1>
          <p>Smart Productivity Tracking. Join a community of efficient professionals.</p>
          <div className="feature-pills">
            <div className="feature-pill">
              <span>✓</span> Focus Management
            </div>
            <div className="feature-pill">
              <span>✓</span> Smart Task Lists
            </div>
          </div>
        </div>
      </div>
      <div className="split-right">
        <div className="auth-form-container">
          <h2>Create Account</h2>
          <p className="subtitle">Join Tasklytics to organize your professional life.</p>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>👤</span>
                <input 
                  type="text" 
                  id="name" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Julian Ames" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>✉️</span>
                <input 
                  type="email" 
                  id="email" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="student@university.edu" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔒</span>
                <input 
                  type="password" 
                  id="password" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="securityQuestion" className="form-label">Security Question</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>❓</span>
                <select 
                  id="securityQuestion" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                >
                  {securityQuestionsList.map((q, idx) => (
                    <option key={idx} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="securityAnswer" className="form-label">Security Answer</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔑</span>
                <input 
                  type="text" 
                  id="securityAnswer" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Your Answer (case-insensitive)" 
                  required 
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Please wait...' : 'Create Account →'}
            </button>
          </form>
          


          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
            <Link to="/" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </div>
          

        </div>
      </div>
    </div>
  );
}
