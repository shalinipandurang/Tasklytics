const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocal 
  ? 'http://127.0.0.1:4000/api' 
  : 'https://studenttaskmanager-91tz.onrender.com/api';

export async function fetchAPI(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('taskManagerToken');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('taskManagerToken');
        localStorage.removeItem('taskManagerUser');
        // If we want to handle redirects, we should do it at the component level
        // or trigger a custom event that the router can listen to.
        window.dispatchEvent(new Event('unauthorized'));
      }
      throw new Error(data?.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
