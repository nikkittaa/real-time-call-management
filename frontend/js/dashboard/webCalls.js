import { checkAuth, getToken } from './utils.js';

let device;
let currentCall;

const initBtn = document.getElementById('initBtn');
const callBtn = document.getElementById('callButton');
const hangupBtn = document.getElementById('hangupButton');
const muteBtn = document.getElementById('muteCallButton');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');

const numberInput = document.getElementById('toNumberOutgoing');

const statusDiv = document.getElementById('status');
const incomingBanner = document.getElementById('incomingBanner');
const incomingNumber = document.getElementById('incomingNumber');


callBtn.style.display = "none";
hangupBtn.style.display = "none";
muteBtn.style.display = "none";



async function initTwilio() {
  const user_id = await checkAuth();
  if (!user_id) return;

  initBtn.style.display = "none";
  callBtn.style.display = "inline-block";

  const res = await fetch(`http://localhost:3002/twilio/token?identity=${user_id}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await res.json();

  device = new Twilio.Device(data.token, {
    closeProtection: true,
    enableRingingState: true
  });

  await device.register();

  device.on("registered", () => {
    console.log("Twilio Device ready");
    statusDiv.textContent = "Ready for calls";
  });

  device.on("error", (err) => {
    console.error("Twilio error:", err);
    statusDiv.textContent = `Error: ${err.message}`;
  });

  
  device.on("incoming", (call) => {
    if (currentCall) {
      call.reject();
      return;
    }

    currentCall = call;

    incomingNumber.textContent = `Incoming call from: ${call.parameters.From}`;
    incomingBanner.classList.remove("hidden");

    call.on("disconnect", () => {
      currentCall = null;
      statusDiv.textContent = "Call ended";
      incomingBanner.classList.add("hidden");
      hideActiveCallButtons();
    });
  });

  device.on("tokenWillExpire", async () => {
    const newRes = await fetch(`http://localhost:3002/twilio/token?identity=${user_id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const newData = await newRes.json();
    device.updateToken(newData.token);
  });
}

async function makeCall() {
  if (!device) return alert("Device not initialized.");

  const toNumber = numberInput.value;
  if (!toNumber) return alert("Enter a phone number.");

  statusDiv.textContent = ` Calling ${toNumber}...`;

  try {
    currentCall = await device.connect({ params: { To: toNumber } });

    showActiveCallButtons();

    currentCall.on("disconnect", () => {
      currentCall = null;
      statusDiv.textContent = "Call ended";
      hideActiveCallButtons();
    });

    statusDiv.textContent = "Connected";
  } catch (err) {
    statusDiv.textContent = `Error: ${err.message}`;
  }
}

function acceptCall() {
  if (!currentCall) return;

  currentCall.accept();
  incomingBanner.classList.add("hidden");
  statusDiv.textContent = "Connected";

  showActiveCallButtons();
}

function rejectCall() {
  if (!currentCall) return;

  currentCall.reject();
  incomingBanner.classList.add("hidden");
  statusDiv.textContent = "Call rejected";
  currentCall = null;

  hideActiveCallButtons();
}


function hangUp() {
  if (currentCall) {
    currentCall.disconnect();
    statusDiv.textContent = "Call ended";
  }
}

function muteCall() {
  if (!currentCall) return;

  const isMuted = currentCall.isMuted();
  currentCall.mute(!isMuted);

  muteBtn.textContent = isMuted ? "Mute" : "Unmute";
  statusDiv.textContent = isMuted ? "Call unmuted" : "Call muted";
}


function showActiveCallButtons() {
  hangupBtn.style.display = "inline-block";
  muteBtn.style.display = "inline-block";
}

function hideActiveCallButtons() {
  hangupBtn.style.display = "none";
  muteBtn.style.display = "none";
  muteBtn.textContent = "Mute";
}


document.querySelectorAll('.pad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      numberInput.value += btn.textContent.trim();
    });
  });

initBtn.addEventListener("click", initTwilio);
callBtn.addEventListener("click", makeCall);
hangupBtn.addEventListener("click", hangUp);
muteBtn.addEventListener("click", muteCall);
acceptBtn.addEventListener("click", acceptCall);
rejectBtn.addEventListener("click", rejectCall);
