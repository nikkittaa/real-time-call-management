const API_URL_CALL = 'http://localhost:3002/twilio/make'; 
const callsContainer = document.getElementById("callsContainer");

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if(!token){
    alert('You must be logged in to view the dashboard.');
    window.location.href = '/';
    return;
  }

});

document.getElementById('makeCallBtn').addEventListener('click', async () => {
  document.getElementById('successMessage').innerText = "";
  document.getElementById('message').innerText = "";

  const to = document.getElementById('toNumber').value;
  if (!to) {
    document.getElementById('message').innerText = 'Please enter a phone number';
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_URL_CALL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to })
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById('message').innerText = "";
    } else {
      document.getElementById('message').innerText = `Error: ${data.message || data.error}`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('message').innerText = 'Failed to make call';
  }

});


const eventSource = new EventSource("http://localhost:3002/calls/stream");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  callsContainer.innerHTML = "";

  if (!data) {
    callsContainer.innerHTML = "<p>No active calls right now.</p>";
    return;
  }

  Object.entries(data).forEach(([callSid, call]) => {
    const callCard = document.createElement("div");
    callCard.className = "call-card";
    callCard.innerHTML = `
      <strong>Call SID:</strong> ${callSid}<br>
      <strong>From:</strong> ${call.from_number}<br>
      <strong>To:</strong> ${call.to_number || "-"}<br>
      <strong>Status:</strong> ${call.status || "-"}<br>
    `;
    callsContainer.appendChild(callCard);
  });
};