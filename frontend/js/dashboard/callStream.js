import { getToken } from './utils.js';
export function initCallStream() {
    const callsContainer = document.getElementById('callsContainer');
    let eventSource;
    let reconnectTimeout;
  
    async function  connect() {
      if (eventSource) eventSource.close();
      const token = getToken();

      if(!token){
        window.location.href = '/';
        return;
      }
   
     eventSource = new EventSource(`http://localhost:3002/calls/stream?token=${token}`);
     
     
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || Object.keys(data).length === 0) {
            callsContainer.innerHTML = '<p>No active calls right now.</p>';
            return;
          }

          if(data.event === 'child_removed'){
            const card = document.getElementById(data.callSid);
            const successMessage = document.getElementById('successMessage');
            if(successMessage){
              successMessage.innerText = '';
            }
            if(card){
              card.remove();
            }
            return;
          }else if(data.event === 'child_changed' || data.event === 'child_added'){
              if(document.getElementById(data.callSid)){
                const status = document.getElementById(`status-${data.callSid}`);
                status.innerText = data.call.status || '-';
              }else{
                const card = document.createElement('div');
                card.setAttribute('id', data.callSid);
                card.className = 'call-card';
                card.innerHTML = `
                  <strong>Call SID:</strong> ${data.callSid}<br>
                  <strong>From:</strong> ${data.call.from_number}<br>
                  <strong>To:</strong> ${data.call.to_number || '-'}<br>
                  <strong>Status:</strong><span id="status-${data.callSid}">${data.call.status || '-'}</span><br>
                `;
                callsContainer.appendChild(card);
              }
          }
  
          
        } catch (err) {
          console.error('Error parsing stream data:', err);
        }
      };
  
      eventSource.onerror = (err) => {

        callsContainer.innerHTML = '<p>Connection lost. Reconnecting...</p>';
        eventSource.close();
  
        // Try reconnecting after 3 seconds
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }
  
    // Reconnect periodically even if no error (in case stream silently dies)
    setInterval(() => {
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('Stream closed silently. Reconnecting...');
        connect();
      }
    }, 20000); 
  
    connect();
  }
  