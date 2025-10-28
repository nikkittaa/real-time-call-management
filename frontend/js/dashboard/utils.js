export function getToken() {
    return localStorage.getItem('token');
  }
  
  // export function checkAuth() {
  //   const token = getToken();
  //   if (!token) {
  //     alert('You must be logged in to view the dashboard.');
  //     window.location.href = '/';
  //   }
  // }

 

export async function checkAuth() {
  const token = getToken();

  // 1️⃣ No token at all → redirect
  if (!token) {
    alert('You must be logged in to view this page.');
    window.location.href = '/';
    return;
  }

  try {
    // 2️⃣ Verify token with backend
    const res = await fetch(`http://localhost:3002/auth/validate-token?token=${token}`);

    if (!res.ok) {
      throw new Error('Invalid token');
    }

    return;
  } catch (err) {
    console.warn('Auth validation failed:', err.message);
    alert('Session expired or invalid. Please log in again.');
    localStorage.removeItem('token');
    window.location.href = '/';
  }
}

  
  export function showMessage(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
  