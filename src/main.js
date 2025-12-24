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

// Load saved passwords from localStorage
let savedPasswords = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

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
saveForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('password-name');
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a profile name!');
    return;
  }
  const password = passwordInput.textContent;

  // Save to localStorage
  savedPasswords.push({ name, password });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPasswords));

  // Show success
  saveForm.classList.add('hidden');
  successMessage.classList.remove('hidden');

  // Hide success after 5s and close modal
  setTimeout(() => {
    closeModal();
    renderSavedPasswords();
  }, 5000);

  // Reset input
  nameInput.value = '';

  // Reset the displayed password to placeholder so user must generate a new one
  passwordInput.textContent = DEFAULT_PLACEHOLDER;
  passwordInput.classList.add('placeholder');
  toggleCopyButton();
  toggleSaveButton();
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

// Render saved passwords list
function renderSavedPasswords() {
  savedList.innerHTML = '';
  savedPasswords.forEach((item, index) => {
    const li = document.createElement('li');
    li.classList.add('saved-item');
    li.innerHTML = `
      <div class="saved-display">
        <span class="saved-name text-preset-4">${item.name}</span>
        <span class="saved-password text-preset-2" data-hidden="true">••••••••</span>
        <button class="toggle-show-btn">Show</button>
        <button class="copy-saved-btn">
          <img src="./images/icon-copy.svg" alt="Copy Password" class="copy" />
        </button>
      </div>
    `;
    savedList.appendChild(li);

    // Toggle show/hide
    const toggleBtn = li.querySelector('.toggle-show-btn');
    const pwSpan = li.querySelector('.saved-password');
    toggleBtn.addEventListener('click', () => {
      const isHidden = pwSpan.dataset.hidden === 'true';
      pwSpan.textContent = isHidden ? item.password : '••••••••';
      pwSpan.dataset.hidden = isHidden ? 'false' : 'true';
      toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
    });

    // Copy
    const copyBtn = li.querySelector('.copy-saved-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard
        .writeText(item.password)
        .then(() => {
          // You could add a temporary "copied" message here if desired
          alert('Password copied!');
        })
        .catch((err) => console.error('Copy failed', err));
    });
  });
}

// Initial render if viewing saved
renderSavedPasswords();
