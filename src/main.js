const passwordInput = document.querySelector('.js-password-input');
const copyButton = document.querySelector('.js-copy-btn');
const characterCount = document.querySelector('.js-count-number');
const characterSlider = document.querySelector('.js-range-slider');
const checkboxUppercase = document.getElementById('uppercase');
const checkboxLowercase = document.getElementById('lowercase');
const checkboxNumbers = document.getElementById('numbers');
const checkboxSymbols = document.getElementById('symbols');
const copiedText = document.querySelector('.js-copied-text');
const strengthIndicatorContainer = document.querySelector(
  '.js-strength-container'
);
const strengthText = document.querySelector('.js-strength-level');
const strengthBar = document.querySelectorAll('.js-strength-bar');
const generateButton = document.querySelector('.js-generate-btn');
const saveButton = document.querySelector('.js-save-btn');
const viewPwButton = document.querySelector('.js-view-pw-btn');
const backButton = document.querySelector('.js-back-btn');
const generatorSection = document.querySelector('.js-generator-section');
const savedSection = document.querySelector('.js-saved-section');
const modalOverlay = document.querySelector('.js-modal-overlay');
const modalClose = document.querySelector('.js-modal-close');
const saveForm = document.querySelector('.js-save-form');
const successMessage = document.querySelector('.js-success-message');
const savedList = document.querySelector('.js-saved-list');

// Slider constants
const MIN = 6;
const MAX = 20;
const FILLED_COLOR = '#A4FFAF';
const UNFILLED_COLOR = '#000000';

// Character sets for password generation
const upperCaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowerCaseLetters = 'abcdefghijklmnopqrstuvwxyz';
const numbers = '0123456789';
const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';

// Configuration array for checkboxes and their character sets
const characterSets = [
  { checkbox: checkboxUppercase, characters: upperCaseLetters },
  { checkbox: checkboxLowercase, characters: lowerCaseLetters },
  { checkbox: checkboxNumbers, characters: numbers },
  { checkbox: checkboxSymbols, characters: symbols },
];

// Local storage key
const STORAGE_KEY = 'savedPasswords';

// Login logic
const loginSection = document.querySelector('.js-login-section');
const loginBtn = document.querySelector('.js-login-btn');
const pinInput = document.getElementById('master-pin');
const loginError = document.querySelector('.js-login-error');

// --- DELETE MODAL ELEMENTS ---
const deleteOverlay = document.querySelector('.js-delete-modal-overlay');
const deleteTargetName = document.querySelector('.js-delete-target-name');
const confirmDeleteBtn = document.querySelector('.js-confirm-delete');
const cancelDeleteBtn = document.querySelector('.js-cancel-delete');
const dontAskCheckbox = document.querySelector('.js-dont-ask-checkbox');

// We use a global variable to hold the item currently being considered for deletion
let itemToDelete = null;

// Handle "Confirm Delete" Click
confirmDeleteBtn.addEventListener('click', async () => {
  if (!itemToDelete) return;

  // 1. Save Preference if checked
  if (dontAskCheckbox.checked) {
    localStorage.setItem('skipDeleteConfirmation', 'true');
  }

  // 2. Perform the Delete
  await executeDelete(itemToDelete);

  // 3. Cleanup
  closeDeleteModal();
});

// Handle "Cancel" Click
cancelDeleteBtn.addEventListener('click', () => {
  closeDeleteModal();
  itemToDelete = null;
});

function closeDeleteModal() {
  deleteOverlay.classList.add('hidden');
  // Reset checkbox for next time (optional, but good UX to default to unchecked unless saved)
  if (!localStorage.getItem('skipDeleteConfirmation')) {
    dontAskCheckbox.checked = false;
  }
}

// Helper: The actual API Call (Separated so we can call it from two places)
async function executeDelete(item) {
  // UI Feedback: Find the specific row to fade it out
  // (This is a quick way to find it by text content)
  const allRows = document.querySelectorAll('.saved-item');
  let targetRow = null;
  allRows.forEach((row) => {
    if (row.querySelector('.saved-name').textContent === item.name) {
      targetRow = row;
    }
  });

  if (targetRow) targetRow.style.opacity = '0.5';

  try {
    const delResponse = await fetch('/api/deletePassword', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website: item.name }),
    });

    if (delResponse.ok) {
      // Success!
      if (targetRow) targetRow.remove();

      // Update local data
      savedPasswords = savedPasswords.filter((p) => p.name !== item.name);

      // Check empty state
      const savedList = document.querySelector('.js-saved-list');
      if (savedPasswords.length === 0) {
        savedList.innerHTML =
          '<li class="saved-item" style="justify-content:center; color: var(--Grey);">No passwords saved yet.</li>';
      }
    } else {
      alert('Failed to delete. Please try again.');
      if (targetRow) targetRow.style.opacity = '1';
    }
  } catch (err) {
    console.error(err);
    alert('Error connecting to server.');
    if (targetRow) targetRow.style.opacity = '1';
  }
}

// login button event
loginBtn.addEventListener('click', async () => {
  const pin = pinInput.value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin }),
    });

    const data = await response.json();

    if (data.authenticated) {
      // Success! Hide login, show the app
      loginSection.classList.add('hidden');
      generatorSection.classList.remove('hidden');
    } else {
      // Fail! Show error message
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Login Error:', err);
    alert('Could not connect to the security vault.');
  }
});

// Handle Enter key for login
pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loginBtn.click();
  }
});

// Load saved passwords from localStorage
let savedPasswords = [];

// Event Listeners
// Initial fill of task bar on page load with default value (10)
updateSliderFill(characterSlider.value);
toggleCopyButton();
const initialCharTypes = characterSets.filter(
  ({ checkbox }) => checkbox.checked
).length;
updateStrength(initialCharTypes, characterSlider.value);
// placeholder text from DOM (used to reset after save)
const DEFAULT_PLACEHOLDER = passwordInput.textContent || 'P4$5W0rD!';
// make sure Save is disabled until we generate a password
toggleSaveButton();

// Update character count and slider fill when the slider value changes
characterSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  characterCount.textContent = value;
  updateSliderFill(value);
  const charTypes = characterSets.filter(
    ({ checkbox }) => checkbox.checked
  ).length;
  updateStrength(charTypes, value); // Update strength based on slider value and checked checkboxes
});

// Prevent unchecking all checkboxes
characterSets.forEach(({ checkbox }) => {
  checkbox.addEventListener('change', (e) => {
    const checkedCount = characterSets.filter(
      (set) => set.checkbox.checked
    ).length;
    if (checkedCount === 0) {
      e.preventDefault();
      e.target.checked = true; // Revert the change
    } else {
      const charTypes = checkedCount;
      updateStrength(charTypes, characterSlider.value);
    }
  });
});

// Handle generate button
generateButton.addEventListener('click', () => {
  const { password, charTypes, passwordLength } = generatePassword();
  passwordInput.textContent = password;
  passwordInput.classList.remove('placeholder');
  updateStrength(charTypes, passwordLength);
  toggleCopyButton();
  toggleSaveButton();
});

// Handle copy button
let copyTimeout;
copyButton.addEventListener('click', () => {
  const passwordToCopy = passwordInput.textContent;

  navigator.clipboard
    .writeText(passwordToCopy)
    .then(() => {
      copiedText.classList.remove('hidden');

      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }

      copyTimeout = setTimeout(() => {
        copiedText.classList.add('hidden');
      }, 2000);
    })
    .catch((err) => {
      console.log('Copy failed', err);
    });
});

// Handle save button - show modal
saveButton.addEventListener('click', () => {
  if (passwordInput.classList.contains('placeholder')) {
    alert('Generate a password first!');
    return;
  }

  modalOverlay.classList.remove('hidden');
  saveForm.classList.remove('hidden');
  successMessage.classList.add('hidden');

  // --- NEW: Pre-fill if Editing ---
  const nameInput = document.getElementById('password-name');
  if (editingTargetName) {
    nameInput.value = editingTargetName;
    // Optional: Make it read-only so they don't accidentally rename (creating a duplicate)
    // nameInput.readOnly = true;
  } else {
    nameInput.value = '';
    // nameInput.readOnly = false;
  }
});

// Handle modal close
modalClose.addEventListener('click', () => {
  closeModal();
});

// Close modal on overlay click (outside modal)
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Handle save form submit
// Handle save form submit
saveForm.addEventListener('submit', async (e) => {
  // Changed to async
  e.preventDefault();

  const nameInput = document.getElementById('password-name');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Please enter a profile name!');
    return;
  }

  const password = passwordInput.textContent;

  // UI Feedback: Change button text so user knows it's working
  const submitBtn = saveForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerText;
  submitBtn.innerText = 'Saving to Cloud...';
  submitBtn.disabled = true;

  try {
    // --- CONNECTING TO AZURE BACKEND ---
    const response = await fetch('/api/savePassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        website: name, // We send 'name' as 'website' for the RowKey
        password: password,
        username: '', // Your HTML doesn't have a username field yet, so we send empty
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save');
    }

    // --- SUCCESS STATE ---
    // Hide form, show success message
    saveForm.classList.add('hidden');
    successMessage.classList.remove('hidden');

    // Reset the input
    nameInput.value = '';

    // Reset the main generator display
    passwordInput.textContent = DEFAULT_PLACEHOLDER;
    passwordInput.classList.add('placeholder');
    toggleCopyButton();
    toggleSaveButton();

    // Reset edit state
    editingTargetName = null;
    const title = document.querySelector('.title-text');
    title.textContent = 'Password Generator'; // Reset title
    title.style.color = ''; // Reset color

    // Close modal after 2 seconds
    setTimeout(() => {
      closeModal();
      // NOTE: renderSavedPasswords() will still show old local data
      // until we build the "Get Passwords" API next!
    }, 2000);
  } catch (error) {
    console.error('Save Error:', error);
    alert('Error saving to Vault: ' + error.message);
    // Keep form open so they can try again
    saveForm.classList.remove('hidden');
    successMessage.classList.add('hidden');
  } finally {
    // Reset button state
    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
  }
});

// Enable/disable Save button based on whether a real password is present
function toggleSaveButton() {
  const isPlaceholder = passwordInput.classList.contains('placeholder');
  const hasContent = passwordInput.textContent && !isPlaceholder;
  if (saveButton) saveButton.disabled = !hasContent;
}

// Handle view passwords button
viewPwButton.addEventListener('click', () => {
  generatorSection.classList.add('hidden');
  savedSection.classList.remove('hidden');
  renderSavedPasswords();
});

// Handle back button
backButton.addEventListener('click', () => {
  savedSection.classList.add('hidden');
  generatorSection.classList.remove('hidden');
});

// Functions

// Function to toggle the copy button state based on whether the password is empty
function toggleCopyButton() {
  const isPlaceholder = passwordInput.classList.contains('placeholder');
  const hasContent = passwordInput.textContent && !isPlaceholder;
  copyButton.disabled = !hasContent;
}

// Function to update slider fill
function updateSliderFill(value) {
  const percentage = ((value - MIN) / (MAX - MIN)) * 100;
  characterSlider.style.background = `linear-gradient(to right, ${FILLED_COLOR} ${percentage}%, ${UNFILLED_COLOR} ${percentage}%`;
}

// Generate password based on selected character types and length
function generatePassword() {
  let charset = '';
  let charTypes = 0;

  characterSets.forEach(({ checkbox, characters }) => {
    if (checkbox.checked) {
      charset += characters;
      charTypes++;
    }
  });

  let finalPassword = '';
  for (let i = 0; i < characterSlider.value; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    finalPassword += charset[randomIndex];
  }

  return {
    password: finalPassword,
    charTypes,
    passwordLength: characterSlider.value,
  };
}

// Update the strength indicator UI based on character types and length
function updateStrength(charTypes, passwordLength) {
  let passwordStrength = '';
  let strengthLevel = 0;

  if (charTypes === 4 || (charTypes === 3 && passwordLength >= 12)) {
    passwordStrength = 'Strong';
    strengthLevel = 4;
  } else if (
    (charTypes === 3 && passwordLength >= 8) ||
    (charTypes === 2 && passwordLength >= 10)
  ) {
    passwordStrength = 'Medium';
    strengthLevel = 3;
  } else if (
    (charTypes === 2 && passwordLength < 10) ||
    (charTypes === 3 && passwordLength < 8)
  ) {
    passwordStrength = 'Weak';
    strengthLevel = 2;
  } else if (charTypes < 2) {
    passwordStrength = 'Too Weak!';
    strengthLevel = 1;
  }

  strengthText.textContent = passwordStrength.toUpperCase();

  strengthBar.forEach((bar) => {
    bar.classList.remove(
      'bar-filled-red',
      'bar-filled-orange',
      'bar-filled-yellow',
      'bar-filled-green'
    );
  });

  const colors = [
    'bar-filled-red',
    'bar-filled-orange',
    'bar-filled-yellow',
    'bar-filled-green',
  ];
  for (let i = 0; i < strengthLevel; i++) {
    strengthBar[i].classList.add(colors[i % colors.length]); // Cycle colors if needed, but levels max at 4
  }
}

// Close modal and reset
function closeModal() {
  modalOverlay.classList.add('hidden');
  saveForm.classList.remove('hidden');
  successMessage.classList.add('hidden');
}

// --- STATE VARIABLES ---
let editingTargetName = null; // Tracks if we are editing an existing site

// --- RENDER FUNCTION ---
async function renderSavedPasswords() {
  const savedList = document.querySelector('.js-saved-list');

  // Loading State
  if (savedPasswords.length === 0) {
    savedList.innerHTML =
      '<li class="saved-item" style="justify-content:center; color: var(--Neon-Green);">Loading Vault...</li>';
  }

  try {
    const response = await fetch('/api/getPasswords');
    if (!response.ok) throw new Error('Failed to load vault');

    savedPasswords = await response.json();
    savedList.innerHTML = '';

    if (savedPasswords.length === 0) {
      savedList.innerHTML =
        '<li class="saved-item" style="justify-content:center; color: var(--Grey);">No passwords saved yet.</li>';
      return;
    }

    savedPasswords.forEach((item) => {
      const li = document.createElement('li');
      li.classList.add('saved-item');

      li.innerHTML = `
        <div class="saved-display">
          <span class="saved-name text-preset-4">${item.name}</span>
          <span class="saved-password text-preset-2" data-hidden="true">••••••••</span>
          <div class="saved-controls">
             <button class="toggle-show-btn" title="Show/Hide">Show</button>
             <button class="edit-btn" title="Edit Password" style="margin-left: 0.5rem; background: transparent; border: none; cursor: pointer;">
                ✏️
             </button>
             <button class="delete-btn" title="Delete Password" style="margin-left: 0.5rem; background: transparent; border: none; cursor: pointer;">
               🗑️
             </button>
          </div>
        </div>
      `;
      savedList.appendChild(li);

      // 1. Show/Hide Logic
      const toggleBtn = li.querySelector('.toggle-show-btn');
      const pwSpan = li.querySelector('.saved-password');
      toggleBtn.addEventListener('click', () => {
        const isHidden = pwSpan.dataset.hidden === 'true';
        pwSpan.textContent = isHidden ? item.password : '••••••••';
        pwSpan.dataset.hidden = isHidden ? 'false' : 'true';
        toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
      });

      // 2. EDIT LOGIC (New!)
      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        // A. Switch to Generator View
        savedSection.classList.add('hidden');
        generatorSection.classList.remove('hidden');

        // B. Load Data into Generator
        passwordInput.textContent = item.password;
        passwordInput.classList.remove('placeholder');

        // C. Set "Edit Mode" State
        editingTargetName = item.name;

        // D. Visual Feedback: Update the Title or Button to show we are editing
        const title = document.querySelector('.title-text');
        title.textContent = `Editing: ${item.name}`;
        title.style.color = 'var(--Neon-Green)';

        // E. Recalculate strength for the loaded password
        // (Optional simplification: just set slider to length of loaded pw)
        characterSlider.value = item.password.length;
        characterCount.textContent = item.password.length;
        updateSliderFill(item.password.length);

        toggleSaveButton();
      });

      // 3. Delete Logic (Existing)
      const deleteBtn = li.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        const skipConfirm =
          localStorage.getItem('skipDeleteConfirmation') === 'true';
        if (skipConfirm) {
          executeDelete(item);
        } else {
          itemToDelete = item;
          deleteTargetName.textContent = item.name;
          deleteOverlay.classList.remove('hidden');
        }
      });
    });
  } catch (error) {
    console.error('Render Error:', error);
    savedList.innerHTML =
      '<li class="saved-item" style="justify-content:center; color: var(--Red);">Error connecting to Vault.</li>';
  }
}

// Initial render if viewing saved
renderSavedPasswords();
