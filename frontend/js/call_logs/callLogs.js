import { getToken } from './utils.js';
import { viewNote, editNote, deleteNote } from './notes.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) {
    alert('You must be logged in to view call logs.');
    window.location.href = '/';
    return;
  }

  const tableBody = document.getElementById('callLogsBody');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const phone = document.getElementById('phoneNumber');
  const status = document.getElementById('status');
  const applyBtn = document.getElementById('applyFilters');
  const clearBtn = document.getElementById('clearFilters');
  const exportBtn = document.getElementById('exportCalls');

  exportBtn.addEventListener('click', async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (fromDate.value) {
      params.append('from', new Date(fromDate.value).toISOString());
    }
    if (toDate.value) {
      params.append('to', new Date(toDate.value).toISOString());
    }
    

    if (phone.value) {
      params.append('phone', phone.value.trim());
    }

    if (status.value) {
      params.append('status', status.value);
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
  const limit = 5;

  async function fetchLogs() {
    try {
      tableBody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (fromDate.value) {
        params.append('from', new Date(fromDate.value).toISOString());
      }
      if (toDate.value) {
        params.append('to', new Date(toDate.value).toISOString());
      }

      if (phone.value) {
        params.append('phone', phone.value.trim());
      }

      if (status.value) {
        params.append('status', status.value);
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
          <td>${log.call_sid}</td>
          <td>${log.from_number}</td>
          <td>${log.to_number}</td>
          <td>${log.status}</td>
          <td>${log.duration}</td>
          <td>${new Date(log.start_time).toLocaleString()}</td>
          <td>${new Date(log.end_time).toLocaleString()}</td>
          <td>
            <span id="note-${log.call_sid}">${log.notes || 'No notes'}</span>
            <div class="note-buttons">
              <button class="view">View</button>
              <button class="edit">Edit</button>
              <button class="delete">Delete</button>
            </div>
          </td>
          <td>
          ${log.recording_url ? `<a href="${log.recording_url}" target="_blank">View Recording</a>` : 'No recording'}
          </td>
        `;

        row.querySelector('.view').onclick = () => viewNote(log.call_sid);
        row.querySelector('.edit').onclick = () => editNote(log.call_sid);
        row.querySelector('.delete').onclick = () => deleteNote(log.call_sid);

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
    page = 1;
    fetchLogs();
  });

  fetchLogs();
});
