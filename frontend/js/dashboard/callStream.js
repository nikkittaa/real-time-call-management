export function initCallStream() {
    const callsContainer = document.getElementById('callsContainer');
    const eventSource = new EventSource('http://localhost:3002/calls/stream');
  
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callsContainer.innerHTML = '';
  
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
    };
  
    eventSource.onerror = (err) => {
      console.error('Stream error:', err);
      callsContainer.innerHTML = '<p>Connection lost to live call stream.</p>';
    };
  }
  