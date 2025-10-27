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

  let page = 1;
  const limit = 5;

  async function fetchLogs() {
    try {
      tableBody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
      const res = await fetch(
        `http://localhost:3002/calls?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { data } = await res.json();
      tableBody.innerHTML = '';

      if (!data || data.length === 0) {
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

  fetchLogs();
});
