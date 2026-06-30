import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await fetchAPI('/user/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (data && data.success) {
        setSuccess('Password reset link has been sent to your email.');
        // In this demo, we'll redirect to the reset page after a delay
        // normally this would happen via email link
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-screen">
      <div className="split-left">
        <div className="split-left-content">
          <h1>Tasklytics</h1>
          <p>Secure Your Workspace. Recover your account access quickly.</p>
          <div className="feature-pills">
            <div className="feature-pill">
              <span>✓</span> Secure Recovery
            </div>
            <div className="feature-pill">
              <span>✓</span> Privacy First
            </div>
          </div>
        </div>
      </div>
      <div className="split-right">
        <div className="auth-form-container">
          <h2>Reset Password</h2>
          <p className="subtitle">Enter your email address and we'll send you instructions to reset your password.</p>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={handleSubmit}>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Remembered your password? </span>
            <Link to="/" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
