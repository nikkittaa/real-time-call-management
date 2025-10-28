// Browser environment check
if (typeof window === 'undefined') {
  throw new Error('This script is designed to run in a browser environment');
}

const API_URL = 'http://localhost:3002';

/**
 * Signup
 */
async function signup(username, password) {
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    console.log(res);

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    document.getElementById('message').innerText = data.message || 'Signup successful!';
  } catch (err) {
    console.error('Signup error:', err);
    document.getElementById('message').innerText = `Signup failed: ${err.message}`;
  }
}

/**
 * Login
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
      window.location.href = '/dashboard.html';
    } else {
      document.getElementById('message').innerText = 'Login failed';
    }
  } catch (err) {
    console.error('Login error:', err);
    document.getElementById('message').innerText = `Login failed: ${err.message}`;
  }
}

/** Event Listeners **/
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await signup(username.value, password.value);
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await login(username.value, password.value);
});
