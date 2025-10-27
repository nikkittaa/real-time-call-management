import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC-j23T_qQaHtVuVYQ-6F7Vh_fHm-o_rD8",
  authDomain: "real-time-call-management.firebaseapp.com",
  databaseURL: "https://real-time-call-management-default-rtdb.firebaseio.com/",
  projectId: "real-time-call-management",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const API_URL = 'http://localhost:3002/twilio/make'; // backend endpoint
const callsContainer = document.getElementById("callsContainer");


document.getElementById('makeCallBtn').addEventListener('click', async () => {
  document.getElementById('successMessage').innerText = "";
  document.getElementById('message').innerText = "";

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
      document.getElementById('message').innerText = "";
    } else {
      document.getElementById('message').innerText = `Error: ${data.message || data.error}`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('message').innerText = 'Failed to make call';
  }

});


const callsRef = ref(db, "calls");
onValue(callsRef, (snapshot) => {
  const data = snapshot.val();
  callsContainer.innerHTML = "";

  document.getElementById('successMessage').innerText = "";
  document.getElementById('message').innerText = "";


  if (!data) {
    callsContainer.innerHTML = "<p>No active calls right now.</p>";
  document.getElementById('message').innerText = "";
    return;
  }
  

  Object.entries(data).forEach(([callSid, call]) => {
    const callCard = document.createElement("div");
    console.log("call", call);
    callCard.className = "call-card";
    callCard.innerHTML = `
      <strong>Call SID:</strong> ${callSid}<br>
      <strong>From:</strong> ${call.from_number}<br>
      <strong>To:</strong> ${call.to_number|| "-"}<br>
      <strong>Status:</strong> ${call.status || "-"}<br>
    `;
    callsContainer.appendChild(callCard);
  });
});