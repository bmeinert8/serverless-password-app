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

// Analyze password strength from raw text (for manual input)
function analyzeAndDisplayStrength(password) {
  let charTypes = 0;
  if (/[A-Z]/.test(password)) charTypes++;
  if (/[a-z]/.test(password)) charTypes++;
  if (/[0-9]/.test(password)) charTypes++;
  if (/[^A-Za-z0-9]/.test(password)) charTypes++;

  updateStrength(charTypes, password.length);

  // update the character count number ot match what they typed
  characterCount.textContent = password.length;
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
  const password = pinInput.value; // Grabbing whatever they typed in the box

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }), // Updated key to 'password'
    });

    const data = await response.json();

    if (data.authenticated || data.success) {
      // Added fallback depending on what your API returns
      // Success! Hide login, show the app
      loginSection.classList.add('hidden');
      generatorSection.classList.remove('hidden');
    } else {
      // Fail! Show error message
      loginError.textContent = 'Invalid Master Password'; // Optional UI polish
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
  passwordInput.value = password;
  passwordInput.classList.remove('placeholder');
  updateStrength(charTypes, passwordLength);
  toggleCopyButton();
  toggleSaveButton();
});

// Handle copy button
let copyTimeout;
copyButton.addEventListener('click', () => {
  const passwordToCopy = passwordInput.value;

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
saveForm.addEventListener('submit', async (e) => {
  // Changed to async
  e.preventDefault();

  const nameInput = document.getElementById('password-name');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Please enter a profile name!');
    return;
  }

  const password = passwordInput.value;

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
    passwordInput.value = '';
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
  const hasContent = passwordInput.value && !isPlaceholder;
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

// Listen for manual input in the password field to analyze strength
passwordInput.addEventListener('input', (e) => {
  const currentPassword = e.target.value;

  analyzeAndDisplayStrength(currentPassword);

  toggleSaveButton();
  toggleCopyButton();

  if (currentPassword) {
    passwordInput.classList.remove('placeholder');
  } else {
    passwordInput.classList.add('placeholder');
  }
});

// Functions

// Function to toggle the copy button state based on whether the password is empty
function toggleCopyButton() {
  const isPlaceholder = passwordInput.classList.contains('placeholder');
  const hasContent = passwordInput.value && !isPlaceholder;
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
          <div class="saved-info-block">
            <span class="saved-name text-preset-4" style="color: var(--Green);">${item.name}</span>
            <div class="password-group">
               <span class="saved-password text-preset-3" data-hidden="true" title="Click to copy">••••••••</span>
               <button class="toggle-show-btn" title="Show/Hide Password" style="background: transparent; border: none; cursor: pointer; font-size: 1.2rem;">👁️</button>
            </div>
          </div>
          <div class="saved-controls dropdown-container">
             <button class="kebab-btn" title="Options">⋮</button>
             <div class="dropdown-menu hidden">
               <button class="dropdown-item edit-btn">✏️ Edit</button>
               <button class="dropdown-item delete-btn">🗑️ Delete</button>
             </div>
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
        toggleBtn.textContent = isHidden ? '🙈' : '👁️';
      });

      // 2. Click to Copy Logic (Replaces copy button)
      pwSpan.addEventListener('click', () => {
        navigator.clipboard
          .writeText(item.password)
          .then(() => {
            pwSpan.textContent = 'Copied! ✅';
            pwSpan.style.color = 'var(--Green)';

            setTimeout(() => {
              // Restore visibility state
              const isHidden = pwSpan.dataset.hidden === 'true';
              pwSpan.textContent = isHidden ? '••••••••' : item.password;
              pwSpan.style.color = ''; // Reset to CSS default
            }, 1500);
          })
          .catch((err) => {
            console.error('Failed to copy saved password: ', err);
          });
      });

      // 3. Dropdown Menu Logic
      const kebabBtn = li.querySelector('.kebab-btn');
      const dropdownMenu = li.querySelector('.dropdown-menu');

      kebabBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing

        // Close all other open dropdowns in the list
        document.querySelectorAll('.dropdown-menu').forEach((menu) => {
          if (menu !== dropdownMenu) menu.classList.add('hidden');
        });

        dropdownMenu.classList.toggle('hidden');
      });

      // Close dropdown if clicking outside
      document.addEventListener('click', (e) => {
        if (!li.querySelector('.dropdown-container').contains(e.target)) {
          dropdownMenu.classList.add('hidden');
        }
      });

      // 4. Edit Logic
      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        savedSection.classList.add('hidden');
        generatorSection.classList.remove('hidden');

        passwordInput.value = item.password;
        passwordInput.classList.remove('placeholder');

        editingTargetName = item.name;

        const title = document.querySelector('.title-text');
        title.textContent = `Editing: ${item.name}`;
        title.style.color = 'var(--Green)';

        characterSlider.value = item.password.length;
        characterCount.textContent = item.password.length;
        updateSliderFill(item.password.length);

        toggleSaveButton();
      });

      // 5. Delete Logic
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('Service Worker registered!', reg))
      .catch((err) => console.log('Service Worker registration failed: ', err));
  });
}
