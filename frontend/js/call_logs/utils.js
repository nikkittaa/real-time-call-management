export function getToken() {
    return localStorage.getItem('token');
  }
  
  export function showDialog(title, content, buttons = []) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
  
    const dialog = document.createElement('p');
    dialog.className = 'dialog-box';
    dialog.innerHTML = `<h3>${title}</h3><div class="dialog-content">${content}</div>`;
  
    const btnContainer = document.createElement('div');
    btnContainer.className = 'dialog-buttons';
  
    buttons.forEach(({ label, onClick, className = '' }) => {
      const btn = document.createElement('button');
      btn.innerText = label;
      btn.className = className;
      btn.onclick = () => {
        onClick?.();
        overlay.remove();
      };
      btnContainer.appendChild(btn);
    });
  
    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  
    // Optional: click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
  
  