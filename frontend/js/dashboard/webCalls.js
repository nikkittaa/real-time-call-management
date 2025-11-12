import { checkAuth, getToken } from './utils.js';

let device;
let currentCall;

async function initTwilio() {
  const user_id = await checkAuth();
 if(!user_id) return;
  const statusDiv = document.getElementById('status');

  const res = await fetch(`http://localhost:3002/twilio/token?identity=${user_id}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  const data = await res.json();

  device = new Twilio.Device(data.token);

  device.on('ready', () => (statusDiv.textContent = 'Ready to make calls'));
  device.on('error', (err) => (statusDiv.textContent = ` Error: ${err.message}`));
  device.on('disconnect', () => (statusDiv.textContent = 'Call ended'));
  
}



async function makeCall() {
    if (!device) return alert('Device not initialized yet.');
    const toNumber = document.getElementById('toNumberOutgoing').value;
    if (!toNumber) return alert('Please enter a number.');
  
    document.getElementById('status').textContent = `📲 Calling ${toNumber}...`;
  
    try {
      currentCall = await device.connect({ params: { To: toNumber } });
      document.getElementById('status').textContent = 'Connected';
    } catch (err) {
      document.getElementById('status').textContent = `Error: ${err.message}`;
    }
  }

function hangUp() {
  if (currentCall) {
    currentCall.disconnect();
    document.getElementById('status').textContent = 'Call ended';
  } else {
    alert('No active call.');
  }
}

document.getElementById('callButton').addEventListener('click', makeCall);
document.getElementById('hangupButton').addEventListener('click', hangUp);

initTwilio();
