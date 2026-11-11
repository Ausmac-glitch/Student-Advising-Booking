const advisors = [
  { id: "chen", name: "Dr. Maya Chen", role: "Academic planning", initials: "MC", color: "linear-gradient(145deg,#bc846b,#775349)", topic: "Academics" },
  { id: "brooks", name: "Jordan Brooks", role: "Career & internships", initials: "JB", color: "linear-gradient(145deg,#a87578,#654044)", topic: "Career" },
  { id: "rivera", name: "Sofia Rivera", role: "Wellbeing & balance", initials: "SR", color: "linear-gradient(145deg,#bf9d6c,#7f6041)", topic: "Wellbeing" },
  { id: "patel", name: "Samir Patel", role: "Financial aid", initials: "SP", color: "linear-gradient(145deg,#8797b0,#4f5c79)", topic: "Finances" },
];

const slotsByDay = [
  ["9:00 AM", "9:30 AM", "10:30 AM", "11:00 AM", "1:00 PM", "2:30 PM"],
  ["9:30 AM", "10:00 AM", "11:30 AM", "1:00 PM", "1:30 PM", "3:00 PM"],
  ["9:00 AM", "10:30 AM", "11:00 AM", "12:30 PM", "2:00 PM", "3:30 PM"],
  ["9:30 AM", "10:00 AM", "11:00 AM", "1:30 PM", "2:00 PM", "4:00 PM"],
  ["9:00 AM", "10:00 AM", "11:30 AM", "12:00 PM", "1:30 PM", "3:00 PM"],
  ["10:00 AM", "11:00 AM", "1:00 PM", "2:30 PM"],
  ["10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM"],
];
const unavailableByDay = [[1, 4], [2], [0, 3], [1, 5], [2, 4], [0], [3]];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const themes = [
  { id: "burgundy", name: "Burgundy", description: "The original red, white, and black palette." },
  { id: "ocean", name: "Ocean", description: "A calm blue and slate palette." },
  { id: "forest", name: "Forest", description: "A fresh green and charcoal palette." },
  { id: "violet", name: "Violet", description: "A vibrant purple and ink palette." },
];
const state = {
  advisor: null,
  date: null,
  time: null,
  detailsInProgress: false,
  bookingComplete: false,
  authRole: null,
  advisorMode: false,
  managedAdvisor: null,
  availability: createDefaultAvailability(),
  timeOff: createDefaultTimeOff(),
  weekStart: startOfWeek(new Date()),
  topic: "All topics",
};
const advisorList = document.querySelector("#advisorList");
const calendarWeek = document.querySelector("#calendarWeek");
const timeSlots = document.querySelector("#timeSlots");
const selectionSummary = document.querySelector("#selectionSummary");
const continueButton = document.querySelector("#continueButton");
const dialog = document.querySelector("#bookingDialog");
const dialogContent = document.querySelector("#dialogContent");
const toast = document.querySelector("#toast");
let toastTimer;

function applyTheme(themeId) {
  const theme = themes.find((item) => item.id === themeId) || themes[0];
  document.documentElement.dataset.theme = theme.id;
  return theme;
}

function currentUserThemeKey() {
  if (state.authRole === "advisor" && state.managedAdvisor) {
    return `advisr-theme:advisor:${state.managedAdvisor}`;
  }
  if (state.authRole === "student") return "advisr-theme:student:austin-rich";
  return null;
}

function loadUserTheme() {
  const key = currentUserThemeKey();
  if (!key) return applyTheme("burgundy");
  try {
    return applyTheme(localStorage.getItem(key) || "burgundy");
  } catch (error) {
    console.error("Could not load this user’s color theme.", error);
    showToast("Your saved theme couldn’t be loaded. The default theme is shown.");
    return applyTheme("burgundy");
  }
}

function openAppearanceDialog() {
  const currentTheme = document.documentElement.dataset.theme || themes[0].id;
  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">MAKE IT YOURS</div>
    <h2>Choose your colors</h2>
    <p class="dialog-intro">Pick a theme for your dashboard. Your choice is saved to your account on this browser.</p>
    <div class="theme-options" role="group" aria-label="Color themes">
      ${themes.map((theme) => `<button class="theme-option${theme.id === currentTheme ? " selected" : ""}" type="button" data-select-theme="${theme.id}" aria-pressed="${theme.id === currentTheme}">
        <span class="theme-swatch theme-swatch-${theme.id}" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="theme-option-copy"><strong>${theme.name}</strong><small>${theme.description}</small></span>
        <span class="theme-check" aria-hidden="true">${theme.id === currentTheme ? "✓" : ""}</span>
      </button>`).join("")}
    </div>
    <p class="theme-save-status" id="themeSaveStatus" role="status" aria-live="polite"></p>
    <button class="dialog-secondary theme-done" type="button" data-close-dialog>Done</button>`;
  dialog.showModal();
}

function saveTheme(themeId) {
  const theme = applyTheme(themeId);
  const status = dialogContent.querySelector("#themeSaveStatus");
  const key = currentUserThemeKey();
  if (!key) {
    status.textContent = "Sign in to save a theme to your account.";
    return;
  }
  try {
    localStorage.setItem(key, theme.id);
    if (status) status.textContent = `${theme.name} theme applied and saved.`;
  } catch (error) {
    console.error("Could not save the selected color theme.", error);
    if (status) status.textContent = `${theme.name} theme applied for this visit, but couldn’t be saved in this browser.`;
  }
  dialogContent.querySelectorAll("[data-select-theme]").forEach((button) => {
    const selected = button.dataset.selectTheme === theme.id;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector(".theme-check").textContent = selected ? "✓" : "";
  });
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultAvailability() {
  return Object.fromEntries(advisors.map((advisor) => [
    advisor.id,
    slotsByDay.map((slots, dayIndex) => slots.filter((_, slotIndex) => !unavailableByDay[dayIndex].includes(slotIndex))),
  ]));
}

function createDefaultTimeOff() {
  return Object.fromEntries(advisors.map((advisor) => [advisor.id, []]));
}

function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && dateKey(date) === value;
}

function readTimeOff() {
  const defaults = createDefaultTimeOff();
  try {
    const stored = localStorage.getItem("advisr-advisor-time-off");
    if (!stored) return defaults;
    const saved = JSON.parse(stored);
    for (const advisor of advisors) {
      if (!Array.isArray(saved[advisor.id]) || saved[advisor.id].some((date) => !isValidDateKey(date))) {
        throw new Error(`Saved time off is invalid for ${advisor.name}.`);
      }
    }
    return Object.fromEntries(advisors.map((advisor) => [advisor.id, [...new Set(saved[advisor.id])]]));
  } catch (error) {
    console.error("Could not read advisor time off.", error);
    showToast("Saved time off could not be loaded.");
    return defaults;
  }
}

function readAvailability() {
  const defaults = createDefaultAvailability();
  try {
    const stored = localStorage.getItem("advisr-advisor-availability");
    if (!stored) return defaults;
    const saved = JSON.parse(stored);
    for (const advisor of advisors) {
      if (!Array.isArray(saved[advisor.id]) || saved[advisor.id].length !== 7) {
        throw new Error(`Saved availability is invalid for ${advisor.name}.`);
      }
      saved[advisor.id] = saved[advisor.id].map((daySlots, dayIndex) => {
        const validTimes = new Set(slotsByDay[dayIndex]);
        if (!Array.isArray(daySlots) || daySlots.some((time) => !validTimes.has(time))) {
          throw new Error(`Saved availability contains an invalid time for ${advisor.name}.`);
        }
        return daySlots;
      });
    }
    return saved;
  } catch (error) {
    console.error("Could not read advisor availability.", error);
    showToast("Saved availability could not be loaded. Default times are shown.");
    return defaults;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function appointmentDateTime(appointment) {
  const date = new Date(`${appointment.date}T12:00:00`);
  const match = appointment.time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return new Date(NaN);
  let hours = Number(match[1]) % 12;
  if (match[3] === "PM") hours += 12;
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

function readAppointments() {
  try {
    const saved = JSON.parse(localStorage.getItem("advisr-appointments") || "[]");
    if (!Array.isArray(saved)) throw new Error("Saved appointments have an invalid format.");
    return saved.filter((item) => item && typeof item.date === "string" && typeof item.time === "string" && typeof item.advisorId === "string");
  } catch (error) {
    console.error("Could not read saved appointments.", error);
    return [];
  }
}

function renderAdvisors() {
  const shown = state.topic === "All topics" ? advisors : advisors.filter((advisor) => advisor.topic === state.topic);
  advisorList.innerHTML = shown.map((advisor) => `
    <button class="advisor-option${state.advisor === advisor.id ? " selected" : ""}" type="button" role="listitem" aria-pressed="${state.advisor === advisor.id}" data-advisor="${advisor.id}">
      <span class="advisor-photo" style="background:${advisor.color}">${advisor.initials}</span>
      <span class="advisor-meta"><strong>${advisor.name}</strong><span>${advisor.role}</span></span>
      <span class="advisor-selected-mark" aria-hidden="true">✓</span>
    </button>`).join("");
}

function renderCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const advisorId = state.advisor || advisors[0].id;
  const unavailableDates = new Set(state.timeOff[advisorId] || []);
  const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  calendarWeek.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(state.weekStart);
    date.setDate(state.weekStart.getDate() + index);
    const key = dateKey(date);
    const unavailable = date < today || unavailableDates.has(key);
    const outLabel = unavailableDates.has(key) ? " · Out" : "";
    return `<button class="date-option${state.date === key ? " selected" : ""}${unavailableDates.has(key) ? " date-unavailable" : ""}" type="button" data-date="${key}" aria-label="${labels[index]} ${date.getDate()}${outLabel}" aria-pressed="${state.date === key}" ${unavailable ? "disabled" : ""}><span>${labels[index]}</span><strong>${date.getDate()}</strong></button>`;
  }).join("");
  renderSlots();
}

function renderSlots() {
  if (!state.date) {
    timeSlots.innerHTML = "";
    document.querySelector("#noSlots").classList.add("hidden");
    updateSummary();
    return;
  }
  const selectedDate = new Date(`${state.date}T12:00:00`);
  const index = (selectedDate.getDay() + 6) % 7;
  const advisorId = state.advisor || advisors[0].id;
  if ((state.timeOff[advisorId] || []).includes(state.date)) {
    state.time = null;
    timeSlots.innerHTML = "";
    document.querySelector("#noSlots").textContent = "This advisor is unavailable on this date. Please choose another day.";
    document.querySelector("#noSlots").classList.remove("hidden");
    updateSummary();
    return;
  }
  const slots = slotsByDay[index] || [];
  const availableTimes = new Set(state.availability[advisorId]?.[index] || []);
  if (state.time && !availableTimes.has(state.time)) state.time = null;
  timeSlots.innerHTML = slots.map((time, slotIndex) => {
    const unavailable = !availableTimes.has(time);
    const selected = state.time === time;
    return `<button class="time-slot${selected ? " selected" : ""}" type="button" data-time="${time}" aria-pressed="${selected}" ${unavailable ? "disabled" : ""}>${time}</button>`;
  }).join("");
  document.querySelector("#noSlots").textContent = "No times available for this day. Try another date.";
  document.querySelector("#noSlots").classList.toggle("hidden", slots.some((time) => availableTimes.has(time)));
  updateSummary();
}

function updateBookingProgress() {
  const allComplete = state.bookingComplete;
  const currentStep = allComplete
    ? 3
    : state.detailsInProgress || (state.advisor && state.date && state.time)
      ? 3
      : state.advisor
        ? 2
        : 1;

  document.querySelectorAll(".progress-step").forEach((element) => {
    const step = Number(element.dataset.step);
    const complete = allComplete || step < currentStep;
    const current = !allComplete && step === currentStep;
    element.classList.toggle("complete", complete);
    element.classList.toggle("current", current);
    element.removeAttribute("aria-current");
    if (current) element.setAttribute("aria-current", "step");
    element.querySelector("span").textContent = complete ? "✓" : String(step);
  });

  document.querySelectorAll("[data-progress-line]").forEach((element) => {
    const step = Number(element.dataset.progressLine);
    element.classList.toggle("complete", allComplete || step < currentStep);
  });
}

function updateSummary() {
  const advisor = advisors.find((item) => item.id === state.advisor);
  const date = state.date ? new Date(`${state.date}T12:00:00`) : null;
  const detail = advisor && date && state.time
    ? `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${state.time} with ${advisor.name}`
    : "Select an advisor and a time to continue.";
  selectionSummary.innerHTML = `<span class="summary-icon">◷</span><span>${detail}</span>`;
  continueButton.disabled = !(advisor && date && state.time);
  updateBookingProgress();
}

function renderAdvisorDashboard() {
  const advisor = advisors.find((item) => item.id === state.managedAdvisor);
  if (!advisor) return;
  document.querySelector("#advisorWelcomeName").textContent = advisor.name;
  document.querySelector("#portalLabel").textContent = "Advisor portal";
  const schedule = state.availability[advisor.id];
  document.querySelector("#advisorScheduleEditor").innerHTML = weekdays.map((weekday, dayIndex) => `
    <fieldset class="advisor-day-card">
      <legend>${weekday}</legend>
      <label class="advisor-unavailable-option">
        <input type="checkbox" data-unavailable-day="${dayIndex}" ${schedule[dayIndex].length === 0 ? "checked" : ""} />
        <span>Unavailable all day</span>
      </label>
      <div class="advisor-time-options">${slotsByDay[dayIndex].map((time) => `
        <label class="advisor-time-option">
          <input type="checkbox" data-day="${dayIndex}" value="${time}" ${schedule[dayIndex].includes(time) ? "checked" : ""} ${schedule[dayIndex].length === 0 ? "disabled" : ""} />
          <span>${time}</span>
        </label>`).join("")}</div>
    </fieldset>`).join("");
  renderAdvisorAppointments(advisor.id);
  renderTimeOffDates(advisor.id);
  document.querySelector("#availabilityStatus").textContent = "";
}

function renderTimeOffDates(advisorId) {
  const target = document.querySelector("#timeOffList");
  document.querySelector("#timeOffDate").min = dateKey(new Date());
  const dates = [...(state.timeOff[advisorId] || [])]
    .filter((date) => date >= dateKey(new Date()))
    .sort();
  if (dates.length === 0) {
    target.innerHTML = `<p class="time-off-empty">No upcoming days off added.</p>`;
    return;
  }
  target.innerHTML = dates.map((dateKeyValue) => {
    const date = new Date(`${dateKeyValue}T12:00:00`);
    return `<div class="time-off-item"><span>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span><button class="time-off-remove" type="button" data-remove-time-off="${dateKeyValue}">Restore availability</button></div>`;
  }).join("");
}

function saveTimeOffDates(dates) {
  const updatedTimeOff = { ...state.timeOff, [state.managedAdvisor]: dates };
  try {
    localStorage.setItem("advisr-advisor-time-off", JSON.stringify(updatedTimeOff));
  } catch (error) {
    console.error("Could not save advisor time off.", error);
    const status = document.querySelector("#timeOffStatus");
    status.textContent = "Time off could not be saved. Check this browser’s storage settings and try again.";
    status.classList.add("error");
    return false;
  }
  state.timeOff = updatedTimeOff;
  renderTimeOffDates(state.managedAdvisor);
  renderCalendar();
  return true;
}

function addAdvisorTimeOff(date) {
  const status = document.querySelector("#timeOffStatus");
  if (!isValidDateKey(date) || date < dateKey(new Date())) {
    status.textContent = "Choose today or a future date.";
    status.classList.add("error");
    return;
  }
  const dates = state.timeOff[state.managedAdvisor] || [];
  if (dates.includes(date)) {
    status.textContent = "That date is already marked unavailable.";
    status.classList.remove("error");
    return;
  }
  if (!saveTimeOffDates([...dates, date])) return;
  status.textContent = "Date marked unavailable. Students can’t book you that day.";
  status.classList.remove("error");
}

function removeAdvisorTimeOff(date) {
  const dates = state.timeOff[state.managedAdvisor] || [];
  if (!dates.includes(date)) return;
  const status = document.querySelector("#timeOffStatus");
  if (!saveTimeOffDates(dates.filter((item) => item !== date))) return;
  status.textContent = "Availability restored for that date.";
  status.classList.remove("error");
}

function renderAdvisorAppointments(advisorId) {
  const upcoming = readAppointments()
    .filter((appointment) => appointment.advisorId === advisorId && appointmentDateTime(appointment) >= new Date())
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
  const target = document.querySelector("#advisorAppointments");
  if (upcoming.length === 0) {
    target.innerHTML = `<div class="appointment-empty advisor-empty">No upcoming appointments are booked with you.</div>`;
    return;
  }
  target.innerHTML = `<div class="advisor-appointment-list">${upcoming.map((appointment) => {
    const date = new Date(`${appointment.date}T12:00:00`);
    const notes = typeof appointment.notes === "string" ? appointment.notes.trim() : "";
    return `<article class="advisor-appointment-item">
      <div class="appointment-date"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span></div>
      <div class="advisor-appointment-info">
        <strong>${escapeHTML(appointment.name || "Student")}</strong>
        <span>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${escapeHTML(appointment.time)}</span>
        <span>${escapeHTML(appointment.email || "")} · ${escapeHTML(appointment.format || "Video call")}</span>
        ${notes ? `<p class="appointment-notes"><strong>Student note:</strong> ${escapeHTML(notes)}</p>` : ""}
      </div>
    </article>`;
  }).join("")}</div>`;
}

function showDashboardView(view) {
  state.advisorMode = view === "advisor";
  document.querySelector("#studentDashboard").classList.toggle("hidden", state.advisorMode);
  document.querySelector("#advisorDashboard").classList.toggle("hidden", !state.advisorMode);
  document.querySelector("#helpCard").classList.toggle("hidden", state.advisorMode);
  document.querySelector("#pageTitle").textContent = state.advisorMode ? "Advisor portal" : "Student dashboard";
  const advisor = advisors.find((item) => item.id === state.managedAdvisor);
  const displayName = state.advisorMode && advisor ? advisor.name : "Austin Rich";
  document.querySelector("#headerUserName").textContent = displayName;
  document.querySelector("#headerAvatar").textContent = state.advisorMode && advisor ? advisor.initials : "AR";
  document.querySelector(".profile-button .profile-name strong").textContent = displayName;
  document.querySelector(".profile-button .profile-name small").textContent = state.advisorMode ? "Advisor" : "Class of 2027";
  document.querySelector(".profile-button .profile-avatar").textContent = state.advisorMode && advisor ? advisor.initials : "AR";
  document.querySelector(".profile-button").setAttribute("aria-label", `Sign out ${displayName}`);
  document.querySelector("#portalLabel").textContent = state.advisorMode ? "Advisor portal" : "Student portal";
  document.querySelectorAll(".main-nav .nav-item").forEach((item) => {
    const active = item.dataset.nav === (state.advisorMode ? "advisor" : "dashboard");
    const visible = state.authRole === "advisor"
      ? item.dataset.nav === "advisor"
      : item.dataset.nav !== "advisor";
    item.classList.toggle("hidden", !visible);
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function saveAdvisorAvailability() {
  const advisorId = state.managedAdvisor;
  if (!advisorId || !state.availability[advisorId]) return;
  const schedule = slotsByDay.map((_, dayIndex) => Array.from(
    document.querySelectorAll(`#advisorScheduleEditor input[data-day="${dayIndex}"]:checked`),
    (input) => input.value,
  ));
  const updatedAvailability = { ...state.availability, [advisorId]: schedule };
  const unavailableDates = new Set(state.timeOff[advisorId] || []);
  const selectedDay = state.date ? (new Date(`${state.date}T12:00:00`).getDay() + 6) % 7 : -1;
  if (state.advisor === advisorId && state.time && selectedDay >= 0
    && (!schedule[selectedDay].includes(state.time) || unavailableDates.has(state.date))) {
    state.time = null;
  }
  try {
    localStorage.setItem("advisr-advisor-availability", JSON.stringify(updatedAvailability));
  } catch (error) {
    console.error("Could not save advisor availability.", error);
    const status = document.querySelector("#availabilityStatus");
    status.textContent = "Availability could not be saved. Check this browser’s storage settings and try again.";
    status.classList.add("error");
    return;
  }
  state.availability = updatedAvailability;
  state.availability = updatedAvailability;
  document.querySelector("#availabilityStatus").textContent = "Availability saved. Students can now book these times.";
  document.querySelector("#availabilityStatus").classList.remove("error");
  renderSlots();
}

function renderAppointments() {
  const upcoming = readAppointments()
    .filter((item) => appointmentDateTime(item) >= new Date())
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
  const target = document.querySelector("#nextAppointmentContent");
  const appointment = upcoming[0];
  if (!appointment) {
    target.innerHTML = `<div class="appointment-empty"><div><div class="empty-calendar">▦</div>No upcoming sessions yet.<br>Book one when you’re ready!</div></div>`;
    return;
  }
  const advisor = advisors.find((item) => item.id === appointment.advisorId);
  const date = new Date(`${appointment.date}T12:00:00`);
  const appointmentId = appointment.id || appointment.createdAt;
  const notes = typeof appointment.notes === "string" ? appointment.notes.trim() : "";
  const notesMarkup = notes ? `<p class="appointment-notes"><strong>Your note:</strong> ${escapeHTML(notes)}</p>` : "";
  target.innerHTML = `<div class="appointment-item"><div class="appointment-date"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span></div><div class="appointment-info"><strong>${advisor ? advisor.name : "Student advisor"}</strong><span>${date.toLocaleDateString("en-US", { weekday: "long" })} · ${appointment.time}</span><span class="appointment-type">${appointment.format || "Video call"}</span>${notesMarkup}<button class="cancel-appointment-button" type="button" data-cancel-id="${appointmentId}">Cancel session</button></div></div>`;
}

function openAppointmentsDialog() {
  const upcoming = readAppointments()
    .filter((item) => appointmentDateTime(item) >= new Date())
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
  const list = upcoming.map((appointment) => {
    const advisor = advisors.find((item) => item.id === appointment.advisorId);
    const date = new Date(`${appointment.date}T12:00:00`);
    const appointmentId = appointment.id || appointment.createdAt;
    const notes = typeof appointment.notes === "string" ? appointment.notes.trim() : "";
    const notesMarkup = notes ? `<p class="appointment-notes"><strong>Your note:</strong> ${escapeHTML(notes)}</p>` : "";
    return `<div class="appointment-list-item"><div class="appointment-date"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span></div><div class="appointment-list-info"><strong>${advisor ? advisor.name : "Student advisor"}</strong><span>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${appointment.time}</span><span>${appointment.format || "Video call"}</span>${notesMarkup}</div><button class="cancel-appointment-button" type="button" data-cancel-id="${appointmentId}">Cancel</button></div>`;
  }).join("");
  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">YOUR SCHEDULE</div>
    <h2>Upcoming sessions</h2>
    <p class="dialog-intro">Review or cancel an advising session you’ve booked.</p>
    ${list ? `<div class="appointment-list">${list}</div>` : `<div class="appointment-empty dialog-empty">You don’t have any upcoming sessions.</div>`}
    <button class="dialog-secondary" type="button" data-close-dialog>Done</button>`;
  dialog.showModal();
}

function openCancelConfirmation(id) {
  const appointment = readAppointments().find((item) => (item.id || item.createdAt) === id);
  if (!appointment) {
    showToast("That session could not be found. Refresh your appointments and try again.");
    renderAppointments();
    return;
  }
  const advisor = advisors.find((item) => item.id === appointment.advisorId);
  const date = new Date(`${appointment.date}T12:00:00`);
  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">CANCEL SESSION</div>
    <h2>Are you sure?</h2>
    <p class="dialog-intro">This will remove your advising session. You can book another time whenever you’re ready.</p>
    <div class="confirmation-detail"><span><strong>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> · ${appointment.time}</span><span>${advisor ? advisor.name : "Student advisor"} · ${appointment.format || "Video call"}</span></div>
    <p class="dialog-error hidden" id="cancelError" role="alert"></p>
    <div class="dialog-actions"><button class="dialog-secondary" type="button" data-close-dialog>Keep session</button><button class="dialog-cancel" type="button" data-confirm-cancel="${id}">Cancel session</button></div>`;
  dialog.showModal();
}

function confirmAppointmentCancellation(id) {
  try {
    const appointments = readAppointments();
    const remaining = appointments.filter((item) => (item.id || item.createdAt) !== id);
    if (remaining.length === appointments.length) {
      throw new Error("The selected appointment no longer exists.");
    }
    localStorage.setItem("advisr-appointments", JSON.stringify(remaining));
  } catch (error) {
    console.error("Could not cancel the appointment.", error);
    const message = dialogContent.querySelector("#cancelError");
    if (message) {
      message.textContent = "We couldn’t cancel this session. Please check your browser storage settings and try again.";
      message.classList.remove("hidden");
    } else {
      showToast("We couldn’t cancel this session. Please try again.");
    }
    return;
  }
  renderAppointments();
  dialogContent.innerHTML = `
    <div class="confirm-icon">✓</div>
    <div class="dialog-eyebrow">SESSION CANCELED</div>
    <h2>Your session has been canceled.</h2>
    <p class="dialog-intro">The appointment has been removed from your upcoming sessions.</p>
    <button class="dialog-submit" type="button" data-close-dialog>Done</button>`;
  showToast("Your advising session has been canceled.");
}

function openDetailsDialog() {
  const advisor = advisors.find((item) => item.id === state.advisor);
  const date = new Date(`${state.date}T12:00:00`);
  state.detailsInProgress = true;
  updateBookingProgress();
  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">ALMOST THERE</div>
    <h2>Let’s get you ready.</h2>
    <p class="dialog-intro">Confirm your details and ${advisor.name} will be ready to meet with you.</p>
    <form id="bookingForm">
      <div class="dialog-field"><label for="studentName">Your name</label><input id="studentName" name="name" autocomplete="name" value="Austin Rich" required minlength="2" /></div>
      <div class="dialog-field"><label for="studentEmail">College email</label><input id="studentEmail" name="email" type="email" autocomplete="email" value="austin.rich@polk.edu" required /></div>
      <div class="dialog-field"><label for="meetingFormat">How would you like to meet?</label><select id="meetingFormat" name="format"><option>Video call</option><option>In person</option></select></div>
      <div class="dialog-field"><label for="sessionNotes">What would you like to discuss? <span>(optional)</span></label><textarea id="sessionNotes" name="notes" placeholder="Share a little context so your advisor can prepare..."></textarea></div>
      <div class="confirmation-detail"><span><strong>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> · ${state.time}</span><span>${advisor.name} · 30-minute session</span></div>
      <p class="dialog-error hidden" id="formError" role="alert"></p>
      <button class="dialog-submit" type="submit">Confirm my session <span>→</span></button>
    </form>`;
  dialogContent.querySelector("#bookingForm").addEventListener("submit", saveAppointment);
  dialog.showModal();
}

function saveAppointment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const appointment = {
    id: crypto.randomUUID(),
    advisorId: state.advisor,
    date: state.date,
    time: state.time,
    name: String(data.get("name")).trim(),
    email: String(data.get("email")).trim(),
    format: String(data.get("format")),
    notes: String(data.get("notes")).trim(),
    createdAt: new Date().toISOString(),
  };
  try {
    const appointments = readAppointments();
    appointments.push(appointment);
    localStorage.setItem("advisr-appointments", JSON.stringify(appointments));
  } catch (error) {
    console.error("Could not save your appointment.", error);
    const message = dialogContent.querySelector("#formError");
    message.textContent = "We couldn’t save your session in this browser. Check your storage settings and try again.";
    message.classList.remove("hidden");
    return;
  }
  state.bookingComplete = true;
  renderAppointments();
  const advisor = advisors.find((item) => item.id === state.advisor);
  const date = new Date(`${state.date}T12:00:00`);
  dialogContent.innerHTML = `
    <div class="confirm-icon">✓</div>
    <div class="dialog-eyebrow">YOU’RE ALL SET</div>
    <h2>Your session is booked.</h2>
    <p class="dialog-intro">A confirmation is on its way to ${appointment.email}. We’re looking forward to helping you plan what’s next.</p>
    <div class="confirmation-detail"><span><strong>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> · ${appointment.time}</span><span>${advisor.name} · ${appointment.format}</span></div>
    <button class="dialog-submit" id="doneButton" type="button">Back to dashboard</button>`;
  dialogContent.querySelector("#doneButton").addEventListener("click", () => dialog.close());
  state.advisor = null;
  state.time = null;
  renderAdvisors();
  renderSlots();
  showToast("Your advising session is confirmed.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

advisorList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-advisor]");
  if (!button) return;
  state.advisor = button.dataset.advisor;
  const selectedDay = state.date ? (new Date(`${state.date}T12:00:00`).getDay() + 6) % 7 : -1;
  if (state.time && selectedDay >= 0
    && (!state.availability[state.advisor][selectedDay].includes(state.time)
      || (state.timeOff[state.advisor] || []).includes(state.date))) {
    state.time = null;
  }
  renderAdvisors();
  renderCalendar();
});

calendarWeek.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button || button.disabled) return;
  state.date = button.dataset.date;
  state.time = null;
  renderCalendar();
});

timeSlots.addEventListener("click", (event) => {
  const button = event.target.closest("[data-time]");
  if (!button || button.disabled) return;
  state.time = button.dataset.time;
  renderSlots();
});

document.querySelector("#prevWeek").addEventListener("click", () => {
  const today = startOfWeek(new Date());
  const previous = new Date(state.weekStart);
  previous.setDate(previous.getDate() - 7);
  if (previous < today) return;
  state.weekStart = previous;
  if (state.date && new Date(`${state.date}T12:00:00`) < state.weekStart) {
    state.date = null;
    state.time = null;
  }
  renderCalendar();
});

document.querySelector("#nextWeek").addEventListener("click", () => {
  state.weekStart.setDate(state.weekStart.getDate() + 7);
  renderCalendar();
});

document.querySelector("#advisorFilter").addEventListener("change", (event) => {
  state.topic = event.currentTarget.value;
  if (state.advisor && !advisors.some((advisor) => advisor.id === state.advisor && (state.topic === "All topics" || advisor.topic === state.topic))) {
    state.advisor = null;
    state.time = null;
  }
  renderAdvisors();
  renderSlots();
});

continueButton.addEventListener("click", () => {
  if (state.advisor && state.date && state.time) openDetailsDialog();
});

document.querySelector("#browseAdvisors").addEventListener("click", () => {
  document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#viewAll").addEventListener("click", (event) => {
  event.preventDefault();
  openAppointmentsDialog();
});

dialogContent.addEventListener("click", (event) => {
  const themeButton = event.target.closest("[data-select-theme]");
  if (themeButton) {
    saveTheme(themeButton.dataset.selectTheme);
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-id]");
  if (cancelButton) {
    openCancelConfirmation(cancelButton.dataset.cancelId);
    return;
  }
  const confirmButton = event.target.closest("[data-confirm-cancel]");
  if (confirmButton) {
    confirmAppointmentCancellation(confirmButton.dataset.confirmCancel);
    return;
  }
  if (event.target.closest("[data-close-dialog]")) dialog.close();
});

document.querySelector("#nextAppointmentContent").addEventListener("click", (event) => {
  const cancelButton = event.target.closest("[data-cancel-id]");
  if (cancelButton) openCancelConfirmation(cancelButton.dataset.cancelId);
});

document.querySelector("#saveAvailability").addEventListener("click", saveAdvisorAvailability);
document.querySelector("#returnToStudent").addEventListener("click", () => {
  signOut();
});

document.querySelector("#advisorScheduleEditor").addEventListener("change", (event) => {
  const toggle = event.target.closest("[data-unavailable-day]");
  if (!toggle) return;
  const dayIndex = toggle.dataset.unavailableDay;
  const timeInputs = document.querySelectorAll(`#advisorScheduleEditor input[data-day="${dayIndex}"]`);
  timeInputs.forEach((input) => {
    input.disabled = toggle.checked;
    if (toggle.checked) input.checked = false;
  });
});

document.querySelector("#timeOffForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const date = new FormData(event.currentTarget).get("date");
  addAdvisorTimeOff(String(date || ""));
  if (!document.querySelector("#timeOffStatus").classList.contains("error")) {
    event.currentTarget.reset();
    document.querySelector("#timeOffDate").min = dateKey(new Date());
  }
});

document.querySelector("#timeOffList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-time-off]");
  if (button) removeAdvisorTimeOff(button.dataset.removeTimeOff);
});

dialog.addEventListener("close", () => {
  if (state.bookingComplete) {
    state.bookingComplete = false;
    state.advisor = null;
    state.time = null;
  }
  state.detailsInProgress = false;
  updateBookingProgress();
});

document.querySelector(".main-nav").addEventListener("click", (event) => {
  const navItem = event.target.closest(".nav-item");
  if (!navItem) return;

  if (state.authRole === "advisor" && navItem.dataset.nav !== "advisor") {
    event.preventDefault();
    return;
  }

  document.querySelectorAll(".main-nav .nav-item").forEach((item) => {
    item.classList.remove("active");
    item.removeAttribute("aria-current");
  });
  navItem.classList.add("active");
  navItem.setAttribute("aria-current", "page");

  if (navItem.dataset.nav === "appointments") {
    event.preventDefault();
    openAppointmentsDialog();
  } else if (navItem.dataset.nav === "advisor") {
    event.preventDefault();
    if (state.advisorMode) renderAdvisorDashboard();
  } else if (navItem.dataset.nav === "dashboard" || navItem.dataset.nav === "booking" || navItem.dataset.nav === "resources") {
    showDashboardView("student");
    navItem.classList.add("active");
    navItem.setAttribute("aria-current", "page");
  }
});

document.querySelector("#loginRole").addEventListener("change", (event) => {
  const advisorSelected = event.currentTarget.value === "advisor";
  const advisorField = document.querySelector("#loginAdvisorField");
  const advisorSelect = document.querySelector("#loginAdvisor");
  advisorField.classList.toggle("hidden", !advisorSelected);
  advisorSelect.required = advisorSelected;
});

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const role = String(data.get("role"));
  const password = String(data.get("password"));
  const expectedPassword = role === "advisor" ? "12345" : "1234";
  const error = document.querySelector("#loginError");

  if (password !== expectedPassword) {
    error.textContent = "That password isn’t correct. Please try again.";
    error.classList.remove("hidden");
    document.querySelector("#loginPassword").focus();
    return;
  }

  state.authRole = role;
  state.managedAdvisor = role === "advisor" ? String(data.get("advisorId")) : null;
  loadUserTheme();
  state.advisor = null;
  state.time = null;
  state.detailsInProgress = false;
  state.bookingComplete = false;
  document.querySelector("#loginScreen").classList.add("hidden");
  document.querySelector("#appShell").classList.remove("hidden");
  if (role === "advisor") renderAdvisorDashboard();
  showDashboardView(role === "advisor" ? "advisor" : "student");
  error.textContent = "";
  error.classList.add("hidden");
});

function signOut() {
  if (dialog.open) dialog.close();
  state.authRole = null;
  state.advisorMode = false;
  state.managedAdvisor = null;
  state.advisor = null;
  state.time = null;
  state.detailsInProgress = false;
  state.bookingComplete = false;
  applyTheme("burgundy");
  showDashboardView("student");
  document.querySelector("#appShell").classList.add("hidden");
  document.querySelector("#loginScreen").classList.remove("hidden");
  document.querySelector("#loginRole").value = "student";
  document.querySelector("#loginAdvisorField").classList.add("hidden");
  document.querySelector("#loginAdvisor").required = false;
  document.querySelector("#loginPassword").value = "";
  document.querySelector("#loginError").textContent = "";
  document.querySelector("#loginError").classList.add("hidden");
  document.querySelector("#loginRole").focus();
}

document.querySelectorAll("[data-sign-out]").forEach((button) => {
  button.addEventListener("click", signOut);
});
document.querySelector(".profile-button").addEventListener("click", signOut);
document.querySelector("#openAppearance").addEventListener("click", openAppearanceDialog);

function initialize() {
  applyTheme("burgundy");
  state.availability = readAvailability();
  state.timeOff = readTimeOff();
  const today = new Date();
  document.querySelector("#todayLabel").textContent = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  const weekday = (today.getDay() + 6) % 7;
  state.date = dateKey(new Date(state.weekStart.getFullYear(), state.weekStart.getMonth(), state.weekStart.getDate() + weekday));
  renderAdvisors();
  renderCalendar();
  renderAppointments();
}

initialize();
