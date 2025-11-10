import { checkAuth } from '../dashboard/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const callSid = new URLSearchParams(window.location.search).get('callSid');
  await checkAuth();
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3002/calls/summary?callSid=${callSid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let data;
  try{
    data = await res.json();
  }catch(error){
    alert('No data found');
    window.location.href = '/call_logs.html';
    return;
  }


  const recordings = JSON.parse(data.recordings);
  const events = JSON.parse(data.events);

  document.getElementById('callSid').innerText = data.callSid;
  document.getElementById('from').innerText = data.from;
  document.getElementById('to').innerText = data.to;
  document.getElementById('date').innerText = data.date_created;
  document.getElementById('startTime').innerText = data.start_time;
  document.getElementById('endTime').innerText = data.end_time;
  document.getElementById('direction').innerText = data.direction;
  document.getElementById('duration').innerText = data.duration;
  document.getElementById('status').innerText = data.status;
  document.getElementById('price').innerText = data.price;
  document.getElementById('priceUnit').innerText = data.price_unit;

  if(recordings.length > 0) {
    const element = document.createElement('a');
    element.href = `https:/api.twilio.com/${recordings[0].uri.replace('.json','')}`;
    element.innerHTML = 'View Recording';
    document.getElementById('recordings').innerHTML = element.outerHTML;
  }

  if(events.length > 0) {
    for (const event of events) {
        const eventItem = document.createElement("div");
        eventItem.classList.add("event-item");
    
        const header = document.createElement("p");
        header.classList.add("event-header");
        if(Object.keys(event.request.parameters).includes("call_status")) {
          header.innerHTML = `${event.request.method} <span class="call-status">${event.request.parameters.call_status}</span> ${event.request.url}`;
        }else{
          header.innerHTML = `${event.request.method} ${event.request.url}`;
        }


       
        const details = document.createElement("div");
        details.classList.add("event-details");
        details.innerHTML = `<strong>Request:</strong><br>`;
       for(const [key, value] of Object.entries(event.request.parameters)) {
        details.innerHTML += `<strong>${key}:</strong> ${value}<br>`;
       }
       details.innerHTML += `<br>`;
       details.innerHTML += `<strong>Response:</strong><br>`;
      
       for(const [key, value] of Object.entries(event.response)) {
        details.innerHTML += `<strong>${key}:</strong> ${value}<br>`;
       }
       details.innerHTML += `<br>`;
    
        header.addEventListener("click", () => {
          const isVisible = details.style.display === "block";
          details.style.display = isVisible ? "none" : "block";
        });
    
        eventItem.appendChild(header);
        eventItem.appendChild(details);
        document.getElementById('events').appendChild(eventItem);
      }
  }
  else {
    document.getElementById('events').innerHTML = 'No events found';
  }

});