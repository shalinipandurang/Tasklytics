import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const fetchQuestion = async (emailToFetch) => {
    try {
      setQuestionError('');
      const data = await fetchAPI(`/user/security-question?email=${encodeURIComponent(emailToFetch)}`);
      if (data && data.success) {
        setSecurityQuestion(data.securityQuestion);
      } else {
        setQuestionError(data.message || 'Could not retrieve security question.');
      }
    } catch (err) {
      setQuestionError(err.message || 'Could not retrieve security question for this account.');
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const emailParam = queryParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      fetchQuestion(emailParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchAPI('/user/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, securityAnswer, newPassword })
      });

      if (data && data.success) {
        setSuccess('Password has been reset successfully. Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-screen">
      <div className="split-left">
        <div className="split-left-content">
          <h1>Tasklytics</h1>
          <p>Secure Your Workspace. Create a strong new password to protect your account.</p>
          <div className="feature-pills">
            <div className="feature-pill">
              <span>✓</span> Strong Encryption
            </div>
            <div className="feature-pill">
              <span>✓</span> Instant Access
            </div>
          </div>
        </div>
      </div>
      <div className="split-right">
        <div className="auth-form-container">
          <h2>Create New Password</h2>
          <p className="subtitle">Please enter a strong password that you haven't used before.</p>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input 
                type="email" 
                id="email" 
                className="form-control" 
                readOnly 
                value={email}
                style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
              />
            </div>

            {questionError && <div className="alert alert-danger">{questionError}</div>}
            
            {securityQuestion && (
              <>
                <div className="form-group">
                  <label className="form-label">Security Question</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--bg-secondary)', paddingLeft: '1rem', display: 'flex', alignItems: 'center', minHeight: '44px' }}>
                    <span style={{ marginRight: '0.5rem' }}>❓</span> {securityQuestion}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="securityAnswer" className="form-label">Your Answer</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔑</span>
                    <input 
                      type="text" 
                      id="securityAnswer" 
                      className="form-control" 
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="Enter your answer" 
                      required 
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔒</span>
                <input 
                  type="password" 
                  id="newPassword" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔒</span>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="••••••••" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
