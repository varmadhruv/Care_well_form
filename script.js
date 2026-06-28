const screen1 = document.getElementById("screen1");
const screen2 = document.getElementById("screen2");
const screen3 = document.getElementById("screen3");
const screen4 = document.getElementById("screen4");
const enterRecordsBtn = document.getElementById("enterRecordsBtn");
const screen1SearchButton = document.getElementById("screen1SearchButton");
const backButton = document.getElementById("backButton");
const homeButton = document.getElementById("homeButton");
const searchBackButton = document.getElementById("searchBackButton");
const detailsBackButton = document.getElementById("detailsBackButton");
const patientSearchInput = document.getElementById("patientSearchInput");
const patientSearchClear = document.getElementById("patientSearchClear");
const searchStatus = document.getElementById("searchStatus");
const searchResults = document.getElementById("searchResults");
const noResults = document.getElementById("noResults");
const patientDetails = document.getElementById("patientDetails");

const form = document.getElementById("surveyForm");
const submitBtn = document.getElementById("submitBtn");
const userIdInput = document.getElementById("userId");
const ageInput = document.getElementById("age");
const dobInput = document.getElementById("dob");
const visitDateInput = document.getElementById("visitDate");
const dobPickerButton = document.querySelector('[data-picker="dob"]');
const visitDatePickerButton = document.querySelector('[data-picker="visitDate"]');
const toastStack = document.getElementById("toastStack");
let patientSearchTimer = null;
let patientSearchController = null;

const fields = {
  firstName: document.getElementById("firstName"),
  lastName: document.getElementById("lastName"),
  age: ageInput,
  dob: dobInput,
  gender: document.querySelectorAll('input[name="gender"]'),
  address: document.getElementById("address"),
  phone: document.getElementById("phone"),
  altPhone: document.getElementById("altPhone"),
  email: document.getElementById("email"),
  response: document.querySelectorAll('input[name="response"]'),
  visitDate: visitDateInput,
};

const errors = {
  firstName: document.getElementById("firstNameError"),
  lastName: document.getElementById("lastNameError"),
  age: document.getElementById("ageError"),
  dob: document.getElementById("dobError"),
  gender: document.getElementById("genderError"),
  address: document.getElementById("addressError"),
  phone: document.getElementById("phoneError"),
  altPhone: document.getElementById("altPhoneError"),
  email: document.getElementById("emailError"),
  response: document.getElementById("responseError"),
  visitDate: document.getElementById("visitDateError"),
};

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function calculateAge(dobValue) {
  if (!dobValue) return "";
  const birth = new Date(dobValue);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : "";
}

function activeRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function getFieldWrapper(name) {
  const input = fields[name];
  if (!input || input instanceof NodeList) return null;
  return input.closest(".field") || input.closest(".field-group");
}

function clearError(name) {
  const el = errors[name];
  if (el) el.textContent = "";
  const field = getFieldWrapper(name);
  if (field) field.classList.remove("invalid");
}

function setError(name, message) {
  const el = errors[name];
  if (el) el.textContent = message;
  const field = getFieldWrapper(name);
  if (field) field.classList.add("invalid");
}

function showToast(message, type = "info") {
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-hide");
    window.setTimeout(() => toast.remove(), 320);
  }, 3400);
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
  submitBtn.setAttribute("aria-busy", String(isLoading));
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setMinFutureDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = tomorrow.toISOString().split("T")[0];
  visitDateInput.min = iso;
  return iso;
}

async function fetchNextUserId() {
  if (!userIdInput.value) {
    userIdInput.value = "CW-2026-000001";
  }

  try {
    const response = await fetch("/api/patients/next-id", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data?.userId) {
      userIdInput.value = data.userId;
    }
  } catch (error) {
    console.error("Failed to fetch next user id:", error);
    if (!userIdInput.value) userIdInput.value = "CW-2026-000001";
  }
}

function openNativePicker(input) {
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.focus();
}

function hideAllScreens() {
  [screen1, screen2, screen3, screen4].forEach((screen) => {
    if (screen) screen.hidden = true;
  });
}

function showScreen2() {
  hideAllScreens();
  screen2.hidden = false;
  document.body.style.overflowY = "auto";
  window.scrollTo({ top: 0, behavior: "auto" });
  fetchNextUserId();
}

function showScreen1() {
  hideAllScreens();
  screen1.hidden = false;
  document.body.style.overflowY = "auto";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showScreen3() {
  hideAllScreens();
  screen3.hidden = false;
  document.body.style.overflowY = "auto";
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!patientSearchInput.value.trim()) {
    searchStatus.textContent = "Enter a User ID or patient name to search.";
  }
  patientSearchInput.focus();
}

function showScreen4() {
  hideAllScreens();
  screen4.hidden = false;
  document.body.style.overflowY = "auto";
  window.scrollTo({ top: 0, behavior: "auto" });
}

function validateForm() {
  let ok = true;
  ["firstName", "lastName", "age", "dob", "gender", "address", "phone", "altPhone", "email", "response", "visitDate"].forEach(clearError);

  if (!fields.firstName.value.trim()) {
    setError("firstName", "First name is required.");
    ok = false;
  }
  if (!fields.lastName.value.trim()) {
    setError("lastName", "Last name is required.");
    ok = false;
  }

  const ageProvided = !!fields.age.value.trim();
  const dobProvided = !!fields.dob.value;
  if (!ageProvided && !dobProvided) {
    setError("age", "Enter age or date of birth.");
    setError("dob", "Enter age or date of birth.");
    ok = false;
  }
  if (fields.age.value && (Number(fields.age.value) < 0 || Number(fields.age.value) > 120)) {
    setError("age", "Enter a valid age.");
    ok = false;
  }

  if (!activeRadioValue("gender")) {
    setError("gender", "Select a gender.");
    ok = false;
  }
  if (!fields.address.value.trim()) {
    setError("address", "Address is required.");
    ok = false;
  }
  if (!/^\d{10}$/.test(onlyDigits(fields.phone.value))) {
    setError("phone", "Enter a valid 10-digit phone number.");
    ok = false;
  }
  const altValue = onlyDigits(fields.altPhone.value);
  if (altValue && !/^\d{10}$/.test(altValue)) {
    setError("altPhone", "Alternative number must be 10 digits.");
    ok = false;
  }
  if (!fields.email.value.trim() || !validateEmail(fields.email.value.trim())) {
    setError("email", "Enter a valid email address.");
    ok = false;
  }
  if (!activeRadioValue("response")) {
    setError("response", "Select a response.");
    ok = false;
  }
  if (!fields.visitDate.value || fields.visitDate.value < fields.visitDate.min) {
    setError("visitDate", "Select a future visit date.");
    ok = false;
  }

  if (!ok) showToast("\u26A0 Please complete all required fields.", "warning");
  return ok;
}

function buildPayload() {
  const ageValue = fields.age.value.trim();
  const dobValue = fields.dob.value;

  return {
    firstName: fields.firstName.value.trim(),
    lastName: fields.lastName.value.trim(),
    age: ageValue ? Number(ageValue) : calculateAge(dobValue),
    dateOfBirth: dobValue || "",
    gender: activeRadioValue("gender"),
    address: fields.address.value.trim(),
    phoneNumber: onlyDigits(fields.phone.value),
    alternateNumber: onlyDigits(fields.altPhone.value),
    email: fields.email.value.trim().toLowerCase(),
    response: activeRadioValue("response"),
    preferredVisitDate: fields.visitDate.value,
  };
}

function resetFormAfterSuccess() {
  form.reset();
  ageInput.disabled = false;
  dobInput.disabled = false;
  visitDateInput.min = setMinFutureDate();
  Object.keys(errors).forEach(clearError);
  fields.firstName.focus();
}

function formatDisplayDate(value) {
  if (!value) return "Not Available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function valueOrFallback(value) {
  return value === undefined || value === null || String(value).trim() === "" ? "Not Available" : String(value);
}

function patientName(patient) {
  return `${valueOrFallback(patient.firstName)} ${valueOrFallback(patient.lastName)}`.replace(/Not Available/g, "").trim() || "Not Available";
}

function createTextElement(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function renderSearchResults(patients) {
  searchResults.innerHTML = "";
  noResults.hidden = patients.length > 0 || !patientSearchInput.value.trim();

  patients.forEach((patient) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "patient-result-card";
    card.setAttribute("aria-label", `Open details for ${patientName(patient)}`);
    card.dataset.patientId = patient._id;

    const topLine = document.createElement("div");
    topLine.className = "result-topline";
    topLine.appendChild(createTextElement("h2", "result-name", patientName(patient)));

    const badge = createTextElement("span", `response-badge ${String(patient.response).toLowerCase()}`, `${patient.response === "Negative" ? "\uD83D\uDD34" : "\uD83D\uDFE2"} ${valueOrFallback(patient.response)}`);
    topLine.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    [
      ["\uD83C\uDD94", valueOrFallback(patient.userId)],
      ["\uD83D\uDCF1", valueOrFallback(patient.phoneNumber)],
      ["\uD83D\uDCC5", `Visit Date: ${formatDisplayDate(patient.preferredVisitDate)}`],
    ].forEach(([icon, text]) => {
      const row = document.createElement("div");
      row.className = "result-meta-row";
      row.appendChild(createTextElement("span", "result-meta-icon", icon));
      row.appendChild(createTextElement("span", "", text));
      meta.appendChild(row);
    });

    card.appendChild(topLine);
    card.appendChild(meta);
    card.addEventListener("click", () => openPatientDetails(patient._id));
    searchResults.appendChild(card);
  });
}

async function runPatientSearch() {
  const query = patientSearchInput.value.trim();
  patientSearchClear.hidden = !query;
  searchResults.innerHTML = "";
  noResults.hidden = true;

  if (!query) {
    searchStatus.textContent = "Enter a User ID or patient name to search.";
    return;
  }

  if (patientSearchController) {
    patientSearchController.abort();
  }
  patientSearchController = new AbortController();
  searchStatus.textContent = "Searching...";

  try {
    const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
      signal: patientSearchController.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Search failed");
    }
    const patients = Array.isArray(data.patients) ? data.patients : [];
    searchStatus.textContent = patients.length ? `${patients.length} matching patient${patients.length === 1 ? "" : "s"} found.` : "";
    renderSearchResults(patients);
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Patient search failed:", error);
    searchStatus.textContent = "";
    showToast("\u274C Something went wrong. Please try again later.", "error");
  }
}

function schedulePatientSearch() {
  window.clearTimeout(patientSearchTimer);
  patientSearchTimer = window.setTimeout(runPatientSearch, 160);
}

function renderPatientDetails(patient) {
  patientDetails.innerHTML = "";
  const rows = [
    ["User ID", valueOrFallback(patient.userId)],
    ["Patient Name", patientName(patient)],
    ["Age", valueOrFallback(patient.age)],
    ["DOB", formatDisplayDate(patient.dateOfBirth)],
    ["Gender", valueOrFallback(patient.gender)],
    ["Phone Number", valueOrFallback(patient.phoneNumber)],
    ["Alternative Number", valueOrFallback(patient.alternateNumber)],
    ["Email Address", valueOrFallback(patient.email)],
    ["Response", valueOrFallback(patient.response)],
    ["Preferred Visit Date", formatDisplayDate(patient.preferredVisitDate)],
    ["Submission Date", formatDisplayDate(patient.createdAt)],
    ["Address", valueOrFallback(patient.address), "full"],
  ];

  rows.forEach(([label, value, size]) => {
    const item = document.createElement("div");
    item.className = `detail-item${size === "full" ? " full" : ""}`;
    item.appendChild(createTextElement("span", "detail-label", label));
    item.appendChild(createTextElement("div", "detail-value", value));
    patientDetails.appendChild(item);
  });
}

async function openPatientDetails(patientId) {
  try {
    const response = await fetch(`/api/patients/record/${encodeURIComponent(patientId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.patient) {
      throw new Error(data.message || "Patient not found");
    }
    renderPatientDetails(data.patient);
    showScreen4();
  } catch (error) {
    console.error("Patient detail failed:", error);
    showToast("\u274C Something went wrong. Please try again later.", "error");
  }
}

enterRecordsBtn.addEventListener("click", showScreen2);
screen1SearchButton.addEventListener("click", showScreen3);
backButton.addEventListener("click", showScreen1);
homeButton.addEventListener("click", showScreen1);
searchBackButton.addEventListener("click", showScreen1);
detailsBackButton.addEventListener("click", showScreen3);
patientSearchInput.addEventListener("input", schedulePatientSearch);
patientSearchClear.addEventListener("click", () => {
  patientSearchInput.value = "";
  patientSearchClear.hidden = true;
  searchResults.innerHTML = "";
  noResults.hidden = true;
  searchStatus.textContent = "Enter a User ID or patient name to search.";
  patientSearchInput.focus();
});

fetchNextUserId();
setMinFutureDate();
document.body.style.overflowY = "auto";

ageInput.addEventListener("input", () => {
  ageInput.value = onlyDigits(ageInput.value).slice(0, 3);
  if (ageInput.value) {
    dobInput.value = "";
    dobInput.disabled = true;
    clearError("age");
    clearError("dob");
  } else {
    dobInput.disabled = false;
  }
});

dobInput.addEventListener("change", () => {
  if (dobInput.value) {
    ageInput.value = calculateAge(dobInput.value);
    ageInput.disabled = true;
    clearError("age");
    clearError("dob");
  } else {
    ageInput.disabled = false;
  }
});

dobPickerButton.addEventListener("click", () => openNativePicker(dobInput));
visitDatePickerButton.addEventListener("click", () => openNativePicker(visitDateInput));

["phone", "altPhone"].forEach((name) => {
  fields[name].addEventListener("input", () => {
    fields[name].value = onlyDigits(fields[name].value).slice(0, 10);
    clearError(name);
  });
});

["email", "firstName", "lastName", "address", "visitDate"].forEach((name) => {
  fields[name].addEventListener("input", () => clearError(name));
});

document.querySelectorAll('input[name="gender"]').forEach((input) => {
  input.addEventListener("change", () => clearError("gender"));
});

document.querySelectorAll('input[name="response"]').forEach((input) => {
  input.addEventListener("change", () => clearError("response"));
});

dobInput.autocomplete = "bday";
dobInput.max = new Date().toISOString().split("T")[0];
visitDateInput.autocomplete = "off";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitBtn.disabled) return;
  if (!validateForm()) return;

  setLoading(true);
  try {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const messages = {
        VALIDATION_ERROR: "\u26A0 Please complete all required fields.",
        INVALID_PHONE: "\u26A0 Please enter a valid 10-digit phone number.",
        INVALID_EMAIL: "\u26A0 Please enter a valid email address.",
        INVALID_DATE: "\u26A0 Please select a valid future date.",
      };
      showToast(messages[data?.code] || "\u274C Unable to save the record. Please try again.", data?.code ? "warning" : "error");
      return;
    }

    showToast("Done!", "success");
    resetFormAfterSuccess();
    await fetchNextUserId();
  } catch (error) {
    console.error("Submission failed:", error);
    showToast("\u274C Connection lost. Please check your network.", "error");
  } finally {
    setLoading(false);
  }
});
