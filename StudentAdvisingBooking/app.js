const PRIVATE_ACCESS_TOKEN = "advisr-private-link-2026";

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
  adminMode: false,
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
  if (state.authRole === "admin") return "advisr-theme:admin";
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
  if (!appointment || typeof appointment.date !== "string" || typeof appointment.time !== "string") {
    return new Date(NaN);
  }

  const date = new Date(`${appointment.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }

  const match = appointment.time.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/i);
  if (!match) return new Date(NaN);

  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

function normalizeAdvisorId(advisorId) {
  return String(advisorId ?? "").trim();
}

function readAppointmentRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem("advisr-appointments") || "[]");
    if (!Array.isArray(saved)) throw new Error("Saved appointments have an invalid format.");
    return saved
      .filter((item) => item && typeof item.date === "string" && typeof item.time === "string" && typeof item.advisorId === "string")
      .map((item) => ({ ...item, advisorId: normalizeAdvisorId(item.advisorId) }));
  } catch (error) {
    console.error("Could not read saved appointments.", error);
    return [];
  }
}

function readAppointments() {
  return readAppointmentRecords().filter((item) => item.status !== "cancelled");
}

function readCanceledAppointments() {
  return readAppointmentRecords().filter((item) => item.status === "cancelled"
    && isValidDateKey(item.date)
    && typeof item.cancelledAt === "string"
    && !Number.isNaN(new Date(item.cancelledAt).getTime()));
}

function getUpcomingAppointments() {
  return readAppointments()
    .filter((item) => !Number.isNaN(appointmentDateTime(item).getTime()))
    .filter((item) => appointmentDateTime(item) >= new Date())
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
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

function slotHasExpired(dateString, timeString, now = new Date()) {
  const date = new Date(`${dateString}T12:00:00`);
  const match = timeString.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/i);
  if (!match) return false;

  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;

  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, Number(match[2]), 0, 0);
  return slotDateTime <= now;
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
  const noSlots = document.querySelector("#noSlots");

  if ((state.timeOff[advisorId] || []).includes(state.date)) {
    state.time = null;
    timeSlots.innerHTML = "";
    noSlots.textContent = "This advisor is unavailable on this date. Please choose another day.";
    noSlots.classList.remove("hidden");
    updateSummary();
    return;
  }

  const slots = slotsByDay[index] || [];
  const availableTimes = new Set(state.availability[advisorId]?.[index] || []);
  const now = new Date();
  const sameDay = selectedDate.toDateString() === now.toDateString();

  if (state.time && !availableTimes.has(state.time)) state.time = null;
  if (state.time && sameDay && slotHasExpired(state.date, state.time, now)) state.time = null;

  timeSlots.innerHTML = slots.map((time) => {
    const unavailable = !availableTimes.has(time);
    const selected = state.time === time;
    const disabled = unavailable || (sameDay && slotHasExpired(state.date, time, now));
    return `<button class="time-slot${selected ? " selected" : ""}" type="button" data-time="${time}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}>${time}</button>`;
  }).join("");

  noSlots.textContent = "No times available for this day. Try another date.";
  noSlots.classList.toggle("hidden", slots.some((time) => availableTimes.has(time) && !(sameDay && slotHasExpired(state.date, time, now))));
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
  const targetAdvisorId = normalizeAdvisorId(advisorId);
  const upcoming = getUpcomingAppointments()
    .filter((appointment) => normalizeAdvisorId(appointment.advisorId) === targetAdvisorId);
  const target = document.querySelector("#advisorAppointments");
  if (upcoming.length === 0) {
    target.innerHTML = `<div class="appointment-empty advisor-empty">No upcoming appointments are booked with you.</div>`;
    return;
  }
  target.innerHTML = `<div class="advisor-appointment-list">${upcoming.map((appointment) => {
    const date = new Date(`${appointment.date}T12:00:00`);
    const notes = typeof appointment.notes === "string" ? appointment.notes.trim() : "";
    const appointmentId = appointment.id || appointment.createdAt;
    return `<article class="advisor-appointment-item">
      <div class="appointment-date"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span></div>
      <div class="advisor-appointment-info">
        <strong>${escapeHTML(appointment.name || "Student")}</strong>
        <span>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${escapeHTML(appointment.time)}</span>
        <span>${escapeHTML(appointment.email || "")} · ${escapeHTML(appointment.format || "Video call")}</span>
        ${notes ? `<p class="appointment-notes"><strong>Student note:</strong> ${escapeHTML(notes)}</p>` : ""}
      </div>
      <button class="cancel-appointment-button advisor-cancel-appointment" type="button" data-advisor-cancel-id="${escapeHTML(appointmentId)}">Cancel meeting</button>
    </article>`;
  }).join("")}</div>`;
}

function renderStudentCancellationNotices() {
  const notice = document.querySelector("#studentCancellationNotice");
  const target = document.querySelector("#studentCancellationList");
  const cancellations = readCanceledAppointments()
    .filter((appointment) => appointment.cancelledBy === "advisor"
      && !appointment.studentDismissedAt
      && typeof appointment.cancellationReason === "string"
      && appointment.cancellationReason.trim())
    .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

  if (cancellations.length === 0) {
    notice.classList.add("hidden");
    target.innerHTML = "";
    return;
  }

  notice.classList.remove("hidden");
  target.innerHTML = cancellations.map((appointment) => {
    const advisor = advisors.find((item) => item.id === normalizeAdvisorId(appointment.advisorId));
    const meetingDate = new Date(`${appointment.date}T12:00:00`);
    const canceledDate = new Date(appointment.cancelledAt);
    return `<article class="student-cancellation-item">
      <strong>${escapeHTML(advisor ? advisor.name : "Your advisor")} canceled your meeting</strong>
      <span>Scheduled for ${meetingDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${escapeHTML(appointment.time)}</span>
      <span>Reason: ${escapeHTML(appointment.cancellationReason.trim())}</span>
      <small>Notice from ${canceledDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</small>
      <button class="student-cancellation-dismiss" type="button" data-dismiss-cancellation-id="${escapeHTML(appointment.id || appointment.createdAt || "")}">Dismiss</button>
    </article>`;
  }).join("");
}

function dismissStudentCancellation(id) {
  const appointments = readAppointmentRecords();
  let found = false;
  const studentDismissedAt = new Date().toISOString();
  const updatedAppointments = appointments.map((item) => {
    if ((item.id || item.createdAt) !== id || item.status !== "cancelled" || item.cancelledBy !== "advisor") return item;
    found = true;
    return { ...item, studentDismissedAt };
  });
  if (!found) {
    showToast("That cancellation notice could not be found. Refresh the page and try again.");
    renderStudentCancellationNotices();
    return;
  }

  try {
    localStorage.setItem("advisr-appointments", JSON.stringify(updatedAppointments));
  } catch (error) {
    console.error("Could not dismiss the cancellation notice.", error);
    showToast("The notice could not be dismissed. Check this browser’s storage settings and try again.");
    return;
  }
  renderStudentCancellationNotices();
}

function renderAdminDashboard() {
  const scheduleTarget = document.querySelector("#adminAdvisorSchedules");
  scheduleTarget.innerHTML = advisors.map((advisor) => {
    const schedule = state.availability[advisor.id];
    const timeOff = [...(state.timeOff[advisor.id] || [])].sort();
    return `<article class="admin-advisor-card">
      <h3>${escapeHTML(advisor.name)}</h3>
      <p class="admin-advisor-role">${escapeHTML(advisor.role)}</p>
      <div class="admin-advisor-days">${weekdays.map((weekday, dayIndex) => {
        const workingTimes = schedule[dayIndex];
        const nonWorkingTimes = slotsByDay[dayIndex].filter((time) => !workingTimes.includes(time));
        return `<div class="admin-advisor-day">
          <strong>${weekday}</strong>
          <span><b>Working:</b> ${workingTimes.length ? workingTimes.map(escapeHTML).join(", ") : "Not working"}</span>
          <span><b>Not working:</b> ${nonWorkingTimes.length ? nonWorkingTimes.map(escapeHTML).join(", ") : "All listed times"}</span>
        </div>`;
      }).join("")}</div>
      <p class="admin-time-off"><b>Dates off:</b> ${timeOff.length
        ? timeOff.map((dateKeyValue) => new Date(`${dateKeyValue}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })).map(escapeHTML).join(", ")
        : "None recorded"}</p>
    </article>`;
  }).join("");

  const appointments = readAppointments()
    .filter((appointment) => advisors.some((advisor) => advisor.id === normalizeAdvisorId(appointment.advisorId)))
    .filter((appointment) => !Number.isNaN(appointmentDateTime(appointment).getTime()))
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b));
  const appointmentsTarget = document.querySelector("#adminAppointments");
  appointmentsTarget.innerHTML = appointments.length
    ? `<div class="admin-meeting-list">${appointments.map((appointment) => {
      const date = new Date(`${appointment.date}T12:00:00`);
      const advisor = advisors.find((item) => item.id === normalizeAdvisorId(appointment.advisorId));
      return `<article class="admin-meeting-row">
        <strong>${escapeHTML(appointment.name || "Student")}</strong>
        <span>${escapeHTML(advisor.name)}</span>
        <span>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${escapeHTML(appointment.time)}</span>
        <span>${escapeHTML(appointment.format || "Video call")}</span>
      </article>`;
    }).join("")}</div>`
    : `<div class="appointment-empty advisor-empty">No advisor meetings have been booked.</div>`;
}

function generateAdminReport() {
  const now = new Date();
  const todayKey = dateKey(now);
  const weekStartKey = dateKey(startOfWeek(now));
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearPrefix = String(now.getFullYear());
  const completedAppointments = readAppointments().filter((appointment) => {
    const appointmentTime = appointmentDateTime(appointment);
    return isValidDateKey(appointment.date)
      && !Number.isNaN(appointmentTime.getTime())
      && appointmentTime <= now;
  });
  const canceledAppointments = readCanceledAppointments().filter((appointment) => new Date(appointment.cancelledAt) <= now);
  const countFor = (appointments, advisorId, matchesPeriod, dateForAppointment = (appointment) => appointment.date) => appointments.filter((appointment) =>
    normalizeAdvisorId(appointment.advisorId) === advisorId && matchesPeriod(dateForAppointment(appointment))).length;
  const periods = [
    { label: "Today", matches: (date) => date === todayKey },
    { label: "This week", matches: (date) => date >= weekStartKey && date <= todayKey },
    { label: "This month", matches: (date) => date.startsWith(monthPrefix) },
    { label: "This year", matches: (date) => date.startsWith(yearPrefix) },
  ];
  const target = document.querySelector("#adminReport");
  target.innerHTML = `<section class="admin-report-section">
      <h3>Completed meetings</h3>
      <p class="admin-report-note">Meetings completed in the current calendar periods.</p>
      <div class="admin-report-table-wrap"><table class="admin-report-table">
        <thead><tr><th>Advisor</th>${periods.map((period) => `<th>${period.label}</th>`).join("")}</tr></thead>
        <tbody>${advisors.map((advisor) => `<tr><th scope="row">${escapeHTML(advisor.name)}</th>${periods.map((period) => `<td>${countFor(completedAppointments, advisor.id, period.matches)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </section>
    <section class="admin-report-section">
      <h3>Canceled meetings</h3>
      <p class="admin-report-note">Cancellations grouped by the date they were recorded. Cancellations made before tracking was added cannot be included.</p>
      <div class="admin-report-table-wrap"><table class="admin-report-table">
        <thead><tr><th>Advisor</th>${periods.map((period) => `<th>${period.label}</th>`).join("")}</tr></thead>
        <tbody>${advisors.map((advisor) => `<tr><th scope="row">${escapeHTML(advisor.name)}</th>${periods.map((period) => `<td>${countFor(canceledAppointments, advisor.id, period.matches, (appointment) => dateKey(new Date(appointment.cancelledAt)))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </section>`;
  target.classList.remove("hidden");
}

function showDashboardView(view) {
  state.advisorMode = view === "advisor";
  state.adminMode = view === "admin";
  document.querySelector("#studentDashboard").classList.toggle("hidden", state.advisorMode || state.adminMode);
  document.querySelector("#advisorDashboard").classList.toggle("hidden", !state.advisorMode);
  document.querySelector("#adminDashboard").classList.toggle("hidden", !state.adminMode);
  document.querySelector("#helpCard").classList.toggle("hidden", state.advisorMode || state.adminMode);
  document.querySelector("#pageTitle").textContent = state.advisorMode ? "Advisor portal" : state.adminMode ? "Administrator dashboard" : "Student dashboard";
  const advisor = advisors.find((item) => item.id === state.managedAdvisor);
  const displayName = state.advisorMode && advisor ? advisor.name : state.adminMode ? "Administrator" : "Austin Rich";
  document.querySelector("#headerUserName").textContent = displayName;
  document.querySelector("#headerAvatar").textContent = state.advisorMode && advisor ? advisor.initials : state.adminMode ? "AD" : "AR";
  document.querySelector(".profile-button .profile-name strong").textContent = displayName;
  document.querySelector(".profile-button .profile-name small").textContent = state.advisorMode ? "Advisor" : state.adminMode ? "Administrator" : "Class of 2027";
  document.querySelector(".profile-button .profile-avatar").textContent = state.advisorMode && advisor ? advisor.initials : state.adminMode ? "AD" : "AR";
  document.querySelector(".profile-button").setAttribute("aria-label", `Sign out ${displayName}`);
  document.querySelector("#portalLabel").textContent = state.advisorMode ? "Advisor portal" : state.adminMode ? "Administrator portal" : "Student portal";
  document.querySelectorAll(".main-nav .nav-item").forEach((item) => {
    const active = item.dataset.nav === (state.advisorMode ? "advisor" : "dashboard");
    const visible = state.authRole === "advisor"
      ? item.dataset.nav === "advisor"
      : state.authRole === "admin"
        ? item.dataset.nav === "dashboard"
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
  document.querySelector("#availabilityStatus").textContent = "Availability saved. Students can now book these times.";
  document.querySelector("#availabilityStatus").classList.remove("error");
  renderSlots();
}

function renderAppointments() {
  const upcoming = getUpcomingAppointments();
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

function openFaqDialog() {
  const faqItems = [
    {
      question: "How do I book an advising appointment?",
      answer: "Pick an advisor, choose a date and time that is still open, and finish the details form to confirm your session.",
    },
    {
      question: "What if I need to cancel or reschedule?",
      answer: "Open My appointments from the dashboard and use the cancel option for the session you want to update.",
    },
    {
      question: "What should I bring to my session?",
      answer: "A few ideas or questions you want help with is enough. Your advisor can guide you through the next steps after that.",
    },
    {
      question: "How much time do advising sessions take?",
      answer: "Most appointments are 30 minutes, and your advisor will make the most of that time to help with planning and next steps.",
    },
  ];

  const faqMarkup = faqItems.map((faq) => `
    <div class="faq-item">
      <h3>${faq.question}</h3>
      <p>${faq.answer}</p>
    </div>
  `).join("");

  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">STUDENT FAQ</div>
    <h2 tabindex="-1">Common advising questions</h2>
    <p class="dialog-intro">Quick answers for the most common scheduling and advising questions.</p>
    <div class="faq-list">${faqMarkup}</div>
    <button class="dialog-secondary" type="button" data-close-dialog>Done</button>`;
  if (!dialog.open) dialog.showModal();
  dialogContent.querySelector("h2").focus();
}

function openResourcesDialog() {
  const resources = [
    {
      title: "Academic planning",
      description: "Review your degree requirements, course sequence, and prerequisites. Bring a list of classes you’re considering so your advisor can help you plan your next term.",
    },
    {
      title: "Transfer credits",
      description: "If you’ve taken classes elsewhere, gather your transcripts and course details. Your advisor can help you identify what needs to be evaluated for transfer.",
    },
    {
      title: "Career and internships",
      description: "Think about the roles or fields you’re exploring. Bring a resume draft or questions about internships, interview preparation, and career experience.",
    },
    {
      title: "Financial aid questions",
      description: "Make a note of aid, scholarship, or deadline questions you want to discuss. Keep account numbers and other sensitive information private.",
    },
  ];

  const resourceMarkup = resources.map((resource) => `
    <div class="faq-item">
      <h3>${resource.title}</h3>
      <p>${resource.description}</p>
    </div>
  `).join("");

  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">STUDENT RESOURCES</div>
    <h2 tabindex="-1">Get ready for your next step</h2>
    <p class="dialog-intro">Use these quick guides to prepare for a conversation with your advisor.</p>
    <div class="faq-list">${resourceMarkup}</div>
    <button class="dialog-secondary" type="button" data-open-faqs aria-haspopup="dialog">View advising FAQs</button>
    <button class="dialog-secondary" type="button" data-close-dialog>Done</button>`;
  if (!dialog.open) dialog.showModal();
  dialogContent.querySelector("h2").focus();
}

function openAppointmentsDialog() {
  const upcoming = getUpcomingAppointments();
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

function openAdvisorCancelConfirmation(id) {
  const appointment = readAppointments().find((item) => (item.id || item.createdAt) === id
    && normalizeAdvisorId(item.advisorId) === state.managedAdvisor);
  if (!appointment) {
    showToast("That meeting could not be found. Refresh your schedule and try again.");
    renderAdvisorAppointments(state.managedAdvisor);
    return;
  }
  const advisor = advisors.find((item) => item.id === appointment.advisorId);
  const date = new Date(`${appointment.date}T12:00:00`);
  dialogContent.innerHTML = `
    <div class="dialog-eyebrow">CANCEL MEETING</div>
    <h2>Cancel this advising meeting?</h2>
    <p class="dialog-intro">The student will be able to see the cancellation reason when they sign in.</p>
    <div class="confirmation-detail"><span><strong>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> · ${escapeHTML(appointment.time)}</span><span>${escapeHTML(advisor ? advisor.name : "Advisor")} · ${escapeHTML(appointment.format || "Video call")}</span></div>
    <form id="advisorCancelForm" data-appointment-id="${escapeHTML(id)}">
      <div class="dialog-field"><label for="advisorCancellationReason">Reason for canceling</label><textarea id="advisorCancellationReason" name="reason" maxlength="500" required placeholder="Let the student know why this meeting needs to be canceled."></textarea></div>
      <p class="dialog-error hidden" id="advisorCancelError" role="alert"></p>
      <div class="dialog-actions"><button class="dialog-secondary" type="button" data-close-dialog>Keep meeting</button><button class="dialog-cancel" type="submit">Cancel meeting</button></div>
    </form>`;
  dialogContent.querySelector("#advisorCancelForm").addEventListener("submit", confirmAdvisorAppointmentCancellation);
  dialog.showModal();
}

async function sendNotificationEmail(email, subject, text) {
  if (!email) return;

  try {
    const response = await fetch("/api/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: email, subject, text }),
    });

    const outcome = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(outcome.message || "Email delivery failed.");
    }
  } catch (error) {
    console.error("Could not send email notification.", error);
    showToast("Your email notification could not be sent. Please check the SMTP setup.");
  }
}

function recordAppointmentCancellation(id, cancelledBy, cancellationReason = "") {
  const appointments = readAppointmentRecords();
  let found = false;
  const cancelledAt = new Date().toISOString();
  const updatedAppointments = appointments.map((item) => {
    if ((item.id || item.createdAt) !== id || item.status === "cancelled") return item;
    found = true;
    return { ...item, status: "cancelled", cancelledAt, cancelledBy, cancellationReason };
  });
  if (!found) throw new Error("The selected appointment no longer exists.");
  localStorage.setItem("advisr-appointments", JSON.stringify(updatedAppointments));
}

async function confirmAppointmentCancellation(id) {
  const appointment = readAppointments().find((item) => (item.id || item.createdAt) === id);
  if (!appointment) {
    const message = dialogContent.querySelector("#cancelError");
    if (message) {
      message.textContent = "That session could not be found. Refresh your appointments and try again.";
      message.classList.remove("hidden");
    } else {
      showToast("That session could not be found. Refresh your appointments and try again.");
    }
    return;
  }

  try {
    recordAppointmentCancellation(id, "student");
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

  const advisor = advisors.find((item) => item.id === appointment.advisorId);
  const date = new Date(`${appointment.date}T12:00:00`);
  const emailSubject = `Meeting canceled with ${advisor ? advisor.name : "Advisor"}`;
  const emailBody = `Meeting with ${advisor ? advisor.name : "Advisor"} at ${appointment.time} on ${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} has been canceled.`;
  await sendNotificationEmail(appointment.email, emailSubject, emailBody);

  renderAppointments();
  dialogContent.innerHTML = `
    <div class="confirm-icon">✓</div>
    <div class="dialog-eyebrow">SESSION CANCELED</div>
    <h2>Your session has been canceled.</h2>
    <p class="dialog-intro">The appointment has been removed from your upcoming sessions.</p>
    <button class="dialog-submit" type="button" data-close-dialog>Done</button>`;
  showToast("Your advising session has been canceled.");
}

function confirmAdvisorAppointmentCancellation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.dataset.appointmentId;
  const reason = String(new FormData(form).get("reason") || "").trim();
  const errorMessage = form.querySelector("#advisorCancelError");
  if (!reason) {
    errorMessage.textContent = "Enter a reason so the student knows why the meeting was canceled.";
    errorMessage.classList.remove("hidden");
    form.querySelector("#advisorCancellationReason").focus();
    return;
  }

  const appointment = readAppointments().find((item) => (item.id || item.createdAt) === id
    && normalizeAdvisorId(item.advisorId) === state.managedAdvisor);
  if (!appointment) {
    errorMessage.textContent = "That meeting could not be found. Refresh your schedule and try again.";
    errorMessage.classList.remove("hidden");
    return;
  }

  try {
    recordAppointmentCancellation(id, "advisor", reason);
  } catch (error) {
    console.error("Could not cancel the advisor meeting.", error);
    errorMessage.textContent = "The meeting could not be canceled. Check this browser’s storage settings and try again.";
    errorMessage.classList.remove("hidden");
    return;
  }

  renderAdvisorAppointments(state.managedAdvisor);
  dialogContent.innerHTML = `
    <div class="confirm-icon">✓</div>
    <div class="dialog-eyebrow">MEETING CANCELED</div>
    <h2>Cancellation recorded.</h2>
    <p class="dialog-intro">Your reason will appear on the student dashboard the next time they sign in.</p>
    <button class="dialog-submit" type="button" data-close-dialog>Done</button>`;
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

async function saveAppointment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const appointment = {
    id: crypto.randomUUID(),
    advisorId: normalizeAdvisorId(state.advisor),
    date: state.date,
    time: state.time,
    name: String(data.get("name")).trim(),
    email: String(data.get("email")).trim(),
    format: String(data.get("format")),
    notes: String(data.get("notes")).trim(),
    createdAt: new Date().toISOString(),
  };
  try {
    const appointments = readAppointmentRecords();
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
  const emailSubject = `Appointment confirmed: ${advisor ? advisor.name : "Advisor"} at ${appointment.time}`;
  const studentName = appointment.name || "Student";
  const advisorName = advisor ? advisor.name : "Advisor";
  const meetingFormat = appointment.format || "Video call";
  const emailBody = `Student name: ${studentName}\nAdvisor name: ${advisorName}\nTime: ${appointment.time}\nDate: ${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}\nMeeting type: ${meetingFormat}\n\nYour advising meeting is confirmed.`;
  await sendNotificationEmail(appointment.email, emailSubject, emailBody);
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

document.querySelector("#helpCard").addEventListener("click", (event) => {
  const faqButton = event.target.closest("[data-open-faqs]");
  if (!faqButton) return;
  event.preventDefault();
  openFaqDialog();
});

const studentResourcesCard = document.querySelector("#resources");
studentResourcesCard.addEventListener("click", openResourcesDialog);
studentResourcesCard.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openResourcesDialog();
});

dialogContent.addEventListener("click", (event) => {
  const faqButton = event.target.closest("[data-open-faqs]");
  if (faqButton) {
    openFaqDialog();
    return;
  }
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

document.querySelector("#advisorAppointments").addEventListener("click", (event) => {
  const cancelButton = event.target.closest("[data-advisor-cancel-id]");
  if (cancelButton) openAdvisorCancelConfirmation(cancelButton.dataset.advisorCancelId);
});

document.querySelector("#studentCancellationList").addEventListener("click", (event) => {
  const dismissButton = event.target.closest("[data-dismiss-cancellation-id]");
  if (dismissButton) dismissStudentCancellation(dismissButton.dataset.dismissCancellationId);
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

  if ((state.authRole === "advisor" && navItem.dataset.nav !== "advisor")
    || (state.authRole === "admin" && navItem.dataset.nav !== "dashboard")) {
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
  } else if (navItem.dataset.nav === "resources") {
    event.preventDefault();
    showDashboardView("student");
    navItem.classList.add("active");
    navItem.setAttribute("aria-current", "page");
    openResourcesDialog();
  } else if (navItem.dataset.nav === "dashboard" || navItem.dataset.nav === "booking") {
    showDashboardView(state.authRole === "admin" ? "admin" : "student");
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

document.querySelector("#generateAdminReport").addEventListener("click", generateAdminReport);

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!hasPrivateAccess()) {
    const error = document.querySelector("#loginError");
    error.textContent = "This site is private. Use the full invite link sent to you.";
    error.classList.remove("hidden");
    return;
  }

  const data = new FormData(event.currentTarget);
  const role = String(data.get("role"));
  const password = String(data.get("password"));
  const expectedPassword = role === "advisor" ? "12345" : role === "admin" ? "123456" : "1234";
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
  if (role === "student") renderStudentCancellationNotices();
  if (role === "advisor") renderAdvisorDashboard();
  if (role === "admin") {
    renderAdminDashboard();
    document.querySelector("#adminReport").classList.add("hidden");
  }
  showDashboardView(role === "advisor" ? "advisor" : role === "admin" ? "admin" : "student");
  error.textContent = "";
  error.classList.add("hidden");
});

function signOut() {
  if (dialog.open) dialog.close();
  state.authRole = null;
  state.advisorMode = false;
  state.adminMode = false;
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

function hasPrivateAccess() {
  const token = new URLSearchParams(window.location.search).get("access");
  return token === PRIVATE_ACCESS_TOKEN;
}

function applyPrivateAccessGate() {
  const loginScreen = document.querySelector("#loginScreen");
  const appShell = document.querySelector("#appShell");
  const loginForm = document.querySelector("#loginForm");
  const loginError = document.querySelector("#loginError");

  if (hasPrivateAccess()) {
    loginScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    loginError.textContent = "";
    loginError.classList.add("hidden");
    loginForm.dataset.privateAccess = "granted";
    return;
  }

  loginForm.dataset.privateAccess = "locked";
  loginForm.querySelectorAll("input, select, button").forEach((element) => {
    element.disabled = true;
  });

  loginError.textContent = "This site is private. Use the full invite link sent to you.";
  loginError.classList.remove("hidden");
  loginScreen.classList.remove("hidden");
  appShell.classList.add("hidden");

  const accessNote = document.createElement("p");
  accessNote.className = "login-security-note";
  accessNote.textContent = "Private access link required: ?access=advisr-private-link-2026";
  accessNote.style.marginTop = "0.5rem";
  accessNote.style.fontWeight = "600";
  const existingNote = loginForm.querySelector(".login-security-note");
  if (existingNote) {
    existingNote.textContent = "Private access link required: ?access=advisr-private-link-2026";
    existingNote.style.fontWeight = "600";
  } else {
    loginForm.prepend(accessNote);
  }
}

function initialize() {
  applyPrivateAccessGate();
  if (!hasPrivateAccess()) return;

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

  const refreshTodaySlots = () => {
    if (!state.date) return;
    const selectedDate = new Date(`${state.date}T12:00:00`);
    if (selectedDate.toDateString() === new Date().toDateString()) renderSlots();
  };
  window.setInterval(refreshTodaySlots, 15_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshTodaySlots();
  });
}

initialize();
