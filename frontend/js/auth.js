// Browser environment check
if (typeof window === 'undefined') {
    throw new Error('This script is designed to run in a browser environment');
  }
  
  // Browser-safe API URL
  const API_URL = 'http://localhost:3002';
  
  /**
   * Signup function
   * @param {string} username
   * @param {string} password
   */
  async function signup(username, password) {
    try {
      console.log('Attempting signup with API URL:', API_URL);
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
  
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
  
      const data = await res.json();
      console.log('Signup response:', data);
      document.getElementById('message').innerText = data.message || 'Signup successful!';
      return data;
    } catch (err) {
      console.error('Signup error:', err);
      document.getElementById('message').innerText = `Signup failed: ${err.message}`;
      return null;
    }
  }
  
  /**
   * Login function
   * @param {string} username
   * @param {string} password
   */
  async function login(username, password) {
    try {
      const res = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
  
      const data = await res.json();
  
      if (res.ok && data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        document.getElementById('message').innerText = 'Login successful!';
        window.location.href = '/dashboard.html'; // redirect
        return data;
      } else {
        document.getElementById('message').innerText = 'Login failed';
        return null;
      }
    } catch (err) {
      console.error('Login error:', err);
      document.getElementById('message').innerText = `Login failed: ${err.message}`;
      return null;
    }
  }
  
  /** Event listeners **/
  
  // Signup form
  document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await signup(username, password);
  });
  
  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await login(username, password);
  });
  