import { getToken } from './utils.js';
export function initCallStream() {
    const callsContainer = document.getElementById('callsContainer');
    let eventSource;
    let reconnectTimeout;
  
    function connect() {
      if (eventSource) eventSource.close();
      const token = getToken();
     // eventSource = new EventSource('http://localhost:3002/calls/stream');
     eventSource = new EventSource(`http://localhost:3002/calls/stream?token=${token}`);
     
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callsContainer.innerHTML = '';

          console.log(data);
  
          if (!data || Object.keys(data).length === 0) {
            callsContainer.innerHTML = '<p>No active calls right now.</p>';
            return;
          }
  
          Object.entries(data).forEach(([callSid, call]) => {
            const card = document.createElement('div');
            card.className = 'call-card';
            card.innerHTML = `
              <strong>Call SID:</strong> ${callSid}<br>
              <strong>From:</strong> ${call.from_number}<br>
              <strong>To:</strong> ${call.to_number || '-'}<br>
              <strong>Status:</strong> ${call.status || '-'}<br>
            `;
            callsContainer.appendChild(card);
          });
        } catch (err) {
          console.error('Error parsing stream data:', err);
        }
      };
  
      eventSource.onerror = (err) => {
        console.warn('Stream error, reconnecting soon...', err);
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
    }, 20000); // every 20 seconds
  
    connect();
  }
  