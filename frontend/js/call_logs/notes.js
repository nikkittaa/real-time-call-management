import { getToken, showDialog } from './utils.js';

export async function viewNote(callSid) {
  const token = getToken();
  // const res = await fetch(`http://localhost:3002/calls/${callSid}/notes`, {
  //   headers: { 'Authorization': `Bearer ${token}` },
  // });
  // const data = await res.json();
  showDialog('View Note', document.getElementById(`note-${callSid}`).innerText || 'No notes available', [
    { label: 'Close' },
  ]);
}

export async function editNote(callSid) {
  const token = getToken();
  const input = document.createElement('textarea');
  input.placeholder = 'Enter new note';
  input.rows = 4;
  input.style.width = '100%';
  input.value = document.getElementById(`note-${callSid}`).innerText;

  showDialog('Edit Note', '', [
    
    {
      label: 'Save',
      onClick: async () => {
        await fetch(`http://localhost:3002/calls/${callSid}/notes`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ notes: input.value }),
        });
        document.getElementById(`note-${callSid}`).innerText = input.value;
      },
    },
    { label: 'Cancel' },
  ]);

  document.querySelector('.dialog-content').replaceWith(input);
}

export async function deleteNote(callSid) {
  const token = getToken();
  if(document.getElementById(`note-${callSid}`).innerText === 'No notes') {
    showDialog('Delete Note', 'No notes to delete', [
      { label: 'Close' },
    ]);
    return;
  }
  showDialog('Delete Note', 'Are you sure you want to delete this note?', [
    {
      label: 'Yes',
      onClick: async () => {
        await fetch(`http://localhost:3002/calls/${callSid}/notes`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        document.getElementById(`note-${callSid}`).innerText = 'No notes';
      },
    },
    { label: 'Cancel' },
  ]);
}
