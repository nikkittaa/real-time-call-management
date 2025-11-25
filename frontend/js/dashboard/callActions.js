import { showMessage, getToken } from './utils.js';

const API_URL_CALL = 'http://localhost:3002/twilio/make';

export function setupMakeCall() {
  const makeCallBtn = document.getElementById('makeCallBtn');
  if (!makeCallBtn) return;

  makeCallBtn.addEventListener('click', async () => {
    showMessage('message', '');
    showMessage('successMessage', '');

    const to = document.getElementById('toNumber').value;
    if (!to) {
      showMessage('message', 'Please enter a phone number');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(API_URL_CALL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to }),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage('successMessage', 'Call initiated successfully!');
      } else {
        if(res.status === 401){
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }
        showMessage('message', `Error: ${data.message || data.error}`);
      }
    } catch (err) {
      console.error(err);
      showMessage('message', 'Failed to make call');
    }
  });
}
