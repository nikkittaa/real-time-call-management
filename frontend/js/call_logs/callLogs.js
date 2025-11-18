import { getToken } from './utils.js';
import { viewNote, editNote } from './notes.js';
import { checkAuth } from '../dashboard/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    alert('You must be logged in to view call logs.');
    window.location.href = '/';
    return;
  }
  await checkAuth();

  let sortConfig = {
    column: 'start_time',
    direction: 'desc'
  }

  document.getElementById('start_time').addEventListener('click', () => {
    sortConfig.column = 'start_time';
    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    fetchLogs();
  });

  document.getElementById('end_time').addEventListener('click', () => {
    sortConfig.column = 'end_time';
    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    fetchLogs();
  });

  const tableBody = document.getElementById('callLogsBody');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const phone = document.getElementById('phoneNumber');
  const status = document.getElementById('status');
  const direction = document.getElementById('direction');
  const notes = document.getElementById('notes');
  const applyBtn = document.getElementById('applyFilters');
  const clearBtn = document.getElementById('clearFilters');
  const exportBtn = document.getElementById('exportCalls');
  const limit = document.getElementById('limit');
  const today = new Date().toISOString().split('T')[0];
  fromDate.setAttribute('max', today);
  toDate.setAttribute('max', today);

  exportBtn.addEventListener('click', async () => {
    const params = new URLSearchParams({});

    if (fromDate.value) {
      params.append('from', new Date(fromDate.value).toISOString());
    }
    if (toDate.value) {
      const d = new Date(toDate.value);
      d.setDate(d.getDate() + 1); 
      params.append('to', d.toISOString());
    }
    
    if (phone.value) {
      params.append('phone', phone.value.trim());
    }

    if (status.value) {
      params.append('status', status.value);
    }

   
    if (direction.value) {
      params.append('direction', direction.value);
    }

    if (notes.value) {
      params.append('notes', notes.value);
    }

    const res = await fetch(`http://localhost:3002/calls/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.blob();
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call_logs.csv';
    a.click();
  });

  let page = 1;

  async function fetchLogs() {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.value.toString(),
        sort: sortConfig.column,
        sort_direction: sortConfig.direction,
      });


      if (fromDate.value) {
        params.append('from', new Date(fromDate.value).toISOString());
      }
      if (toDate.value) {
        const d = new Date(toDate.value);
        d.setDate(d.getDate() + 1); 
        params.append('to', d.toISOString());
      }

      if(fromDate.value && toDate.value){
        if(new Date(fromDate.value) > new Date(toDate.value)){
          alert('From date must be before to date');
          fromDate.value = '';
          toDate.value = '';
          return;
        }
      }

      if (phone.value) {
        params.append('phone', phone.value.trim());
      }

      if (status.value) {
        params.append('status', status.value);
      }

      if (direction.value) {
        params.append('direction', direction.value);
      }

      if (notes.value) {
        params.append('notes', notes.value);
      }


      const res = await fetch(
        `http://localhost:3002/calls?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if(res.status !== 200) {
        alert('Error fetching logs');
        window.location.href = '/';
        return;
      }
      const { data } = await res.json();
      tableBody.innerHTML = '';

      if (res.status === 200 && data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8">No logs found</td></tr>`;
        nextBtn.disabled = true;
        prevBtn.disabled = false;
        return;
      }

      data.forEach((log) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><a href="/call_summary.html?callSid=${log.call_sid}" target="_blank">${log.call_sid}</a></td>
          <td>${log.from_number}</td>
          <td>${log.to_number}</td>
          <td>${log.status}</td>
          <td>${log.direction}</td>
          <td>${new Date(log.start_time).toLocaleString()}</td>
          <td>${new Date(log.end_time).toLocaleString()}</td>
          <td>
            <span id="note-${log.call_sid}">${log.notes || 'No notes'}</span>
            <div class="note-buttons">
              <button class="view">View</button>
              <button class="edit">Edit</button>
            </div>
          </td>
        `;

        row.querySelector('.view').onclick = () => viewNote(log.call_sid);
        row.querySelector('.edit').onclick = () => editNote(log.call_sid);
        tableBody.appendChild(row);
      });

      pageInfo.textContent = `Page ${page}`;
      prevBtn.disabled = page === 1;
      nextBtn.disabled = data.length < limit;
    } catch (err) {
      console.error('Error fetching logs:', err);
      tableBody.innerHTML = `<tr><td colspan="8">Error loading logs</td></tr>`;
    }
  }

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

  applyBtn.addEventListener('click', () => {
    page = 1;
    fetchLogs();
  });

  // Clear filters
  clearBtn.addEventListener('click', () => {
    fromDate.value = '';
    toDate.value = '';
    phone.value = '';
    status.value = '';
    direction.value = '';
    page = 1;
    limit.value = 5;
    notes.value = '';
    fetchLogs();
  });

  fetchLogs();
});
