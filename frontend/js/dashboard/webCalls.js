import { checkAuth, getToken } from './utils.js';

let device;
let currentCall;
let initBtn = document.getElementById('initBtn');
const statusDiv = document.getElementById('status');

async function initTwilio() {
  const user_id = await checkAuth();
  
 if(!user_id) return;
 initBtn.style.display = 'none';
 callButton.style.display = 'inline';
 hangupButton.style.display = 'inline';
  

  const res = await fetch(`http://localhost:3002/twilio/token?identity=${user_id}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  const data = await res.json();

  device = new Twilio.Device(data.token, {
    closeProtection: true,
    enableRingingState: true
  });
 
  await device.register();  
  device.on('registered', () => console.log('Twilio Device ready for calls'));
  device.on('error', err => console.error('Twilio error:', err));


  device.on('incoming', (call) => {
    if(currentCall){
        call.reject();
        return;
    }
    currentCall = call;

    call.on('disconnect', () => {
        currentCall = null;
        statusDiv.textContent = "Call ended";
      });

    if(confirm(`Accept call from  ${call.parameters.From}?`)) {
      call.accept();
      statusDiv.textContent = `Connected to ${call.parameters.From}`;
    } else {
      call.reject();
      currentCall = null;
      statusDiv.textContent = 'Call ignored';
    }

  });

  device.on('tokenWillExpire', async () => {
    const newRes = await fetch(`http://localhost:3002/twilio/token?identity=${user_id}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    const newData = await newRes.json();
    device.updateToken(newData.token);
  });
}

async function makeCall() {
    if (!device) return alert('Device not initialized yet.');
    const toNumber = document.getElementById('toNumberOutgoing').value;
    if (!toNumber) return alert('Please enter a number.');
  
    document.getElementById('status').textContent = `📲 Calling ${toNumber}...`;
  
    try {
      currentCall = await device.connect({ params: { To: toNumber } });

      currentCall.on('disconnect', () => {
        currentCall = null;
        statusDiv.textContent = 'Call ended';
      });

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

function ignoreCall() {
    if(currentCall && currentCall.status() === 'pending'){
        currentCall.ignore();
        statusDiv.textContent = 'Call ignored';
    }else{
        alert("No call to ignore");
    }
}

function muteCall(){
    if(currentCall){
        if(currentCall.isMuted()){
            currentCall.mute(false);
            statusDiv.textContent = 'Call unmuted';
        }else{
            currentCall.mute();
            statusDiv.textContent = 'Call muted';
        }
    }else{
        alert("No active call to mute");
    }
}

document.getElementById('callButton').addEventListener('click', makeCall);
document.getElementById('hangupButton').addEventListener('click', hangUp);
document.getElementById('ignoreButton').addEventListener('click', ignoreCall);
document.getElementById('muteCallButton').addEventListener('click', muteCall);
initBtn.addEventListener('click', initTwilio);
//initTwilio();
