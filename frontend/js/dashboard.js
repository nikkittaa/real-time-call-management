const API_URL = 'http://localhost:3002/twilio/make'; // backend endpoint

document.getElementById('makeCallBtn').addEventListener('click', async () => {
  const to = document.getElementById('toNumber').value;
  const token = localStorage.getItem('token'); // JWT token

  if (!to) {
    document.getElementById('message').innerText = 'Please enter a phone number';
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to })
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById('successMessage').innerText = `Call initiated: ${data.sid}`;
    } else {
      document.getElementById('message').innerText = `Error: ${data.message || data.error}`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('message').innerText = 'Failed to make call';
  }
});
