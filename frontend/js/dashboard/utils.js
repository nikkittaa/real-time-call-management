export function getToken() {
    return localStorage.getItem('token');
  }
  
  export function checkAuth() {
    const token = getToken();
    if (!token) {
      alert('You must be logged in to view the dashboard.');
      window.location.href = '/';
    }
  }
  
  export function showMessage(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
  