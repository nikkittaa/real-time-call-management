export function getToken() {
    return localStorage.getItem('token');
  }
  

export async function checkAuth() {
  const token = getToken();
  if (!token) {
    alert('You must be logged in to view this page.');
    window.location.href = '/';
    return;
  }

  try {
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
  
  export function recordingAction(callSid) {
    const recordingAction = document.getElementById(`recordingAction-${callSid}`);
    if(recordingAction.innerText === 'Start Recording'){
      startRecording(callSid);
    }else{
      pauseRecording(callSid);
    }
  }
  export async function startRecording(callSid) {
      const res = await fetch(`http://localhost:3002/twilio/${callSid}/start-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    if(!res.ok){
      alert('Failed to start recording');
      return;
    }
    const recordingAction = document.getElementById(`recordingAction-${callSid}`);
    recordingAction.innerText = 'Pause Recording';
  }

  export async function pauseRecording(callSid) {
    const res = await fetch(`http://localhost:3002/twilio/${callSid}/stop-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    if(!res.ok){
      alert('Failed to pause recording');
      return;
    }
    const recordingAction = document.getElementById(`recordingAction-${callSid}`);
    recordingAction.innerText = 'Start Recording';
  }