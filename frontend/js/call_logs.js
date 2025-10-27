const token = localStorage.getItem('token');
async function viewNote(callSid) {
  const res = await fetch(`http://localhost:3002/calls/${callSid}/notes`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  alert(`Notes:\n\n${data.notes || 'No notes available'}`);
}

async function editNote(callSid) {
  const newNote = prompt("Enter new note:");
  if (newNote === null) return;

  await fetch(`http://localhost:3002/calls/${callSid}/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ notes: newNote }),
  });

  document.getElementById(`note-${callSid}`).innerText = newNote;
}

async function deleteNote(callSid) {
  if (!confirm("Delete this note?")) return;

  await fetch(`http://localhost:3002/calls/${callSid}/notes`, { method: "DELETE", headers: { 'Authorization': `Bearer ${token}` } });
  document.getElementById(`note-${callSid}`).innerText = "No notes";
}

document.addEventListener('DOMContentLoaded', async () => {
    
    const tableBody = document.getElementById('callLogsBody');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
  
    if (!token) {
      alert('You must be logged in to view call logs.');
      window.location.href = '/';
      return;
    }
  

   
    let page = 1;
    const limit =10; // You can change this as needed
  
    async function fetchLogs() {
      try {
        tableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
  
        const response = await fetch(
          `http://localhost:3002/calls?page=${page}&limit=${limit}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
  
        if (!response.ok) throw new Error('Failed to fetch call logs');
  
        const { data } = await response.json();
  
        tableBody.innerHTML = '';
  
        if (!data || data.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="7">No logs found</td></tr>`;
          nextBtn.disabled = true;
          return;
        }
  
        data.forEach(log => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${log.call_sid}</td>
            <td>${log.from_number}</td>
            <td>${log.to_number}</td>
            <td>${log.status}</td>
            <td>${log.duration}</td>
            <td>${new Date(log.start_time).toLocaleString()}</td>
            <td>${new Date(log.end_time).toLocaleString()}</td>
             <td><span id="note-${log.call_sid}">${log.notes || "No notes"}</span></br>
        <button onclick="viewNote('${log.call_sid}')">View</button>
        <button onclick="editNote('${log.call_sid}')">Edit</button>
        <button onclick="deleteNote('${log.call_sid}')">Delete</button></td>
           
          `;
          tableBody.appendChild(row);
        });
  
        pageInfo.textContent = `Page ${page}`;
        prevBtn.disabled = page === 1;
        nextBtn.disabled = data.length < limit; // disable next if no more data
  
      } catch (error) {
        console.error('Error fetching logs:', error);
        tableBody.innerHTML = `<tr><td colspan="7">Error loading logs</td></tr>`;
      }
    }
  
    // Pagination buttons
    prevBtn.addEventListener('click', () => {
      if (page > 1) {
        page--;
        fetchLogs();
      }
    });
  
    nextBtn.addEventListener('click', () => {
      page++;
      fetchLogs();
    });
  
    // Initial load
    fetchLogs();
  });
  