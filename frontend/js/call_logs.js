document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
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
          `http://localhost:3002/calls/logs?page=${page}&limit=${limit}`,
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
  