import { checkAuth } from './utils.js';
import { setupMakeCall } from './callActions.js';
import { initCallStream } from './callStream.js';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth(); // ensure user is logged in
  setupMakeCall(); // attach make call logic
  initCallStream(); // start listening to active calls
});
