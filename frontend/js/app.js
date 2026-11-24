const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const pageState = { cameras: { page: 1, pages: 1 }, incidents: { page: 1, pages: 1 } };
let cameraRecords = new Map();
let incidentRecords = new Map();
let editCameraId = null;
let editIncidentId = null;

function initIcons() {
  if (window.lucide) lucide.createIcons();
}

function showToast(message, type = "success") {
  let stack = $(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i data-lucide="${type === "error" ? "circle-alert" : "circle-check"}"></i><span></span>`;
  $("span", toast).textContent = message;
  stack.appendChild(toast);
  initIcons();
  setTimeout(() => toast.remove(), 3800);
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  const element = typeof modal === "string" ? document.getElementById(modal) : modal;
  element?.classList.remove("open");
  element?.setAttribute("aria-hidden", "true");
}

function initModals() {
  $$(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("mousedown", event => {
      if (event.target === backdrop) closeModal(backdrop);
    });
  });
  $$("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") $$(".modal-backdrop.open").forEach(closeModal);
  });
}

function setProfile(user) {
  const profileName = $("#profileName");
  const profileRole = $("#profileRole");
  const profileAvatar = $("#profileAvatar");
  if (profileName) profileName.textContent = user.name;
  if (profileRole) profileRole.textContent = user.role;
  if (profileAvatar) profileAvatar.textContent = user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const welcome = $("#welcomeTitle");
  if (welcome) welcome.textContent = `Welcome back, ${user.name.split(/\s+/)[0]}`;
}

async function protectPage() {
  if (!window.SafeCityAPI.getToken()) {
    window.location.replace("login.html");
    return false;
  }
  const response = await SafeCityAPI.get("/auth/me");
  const user = response.data.user;
  localStorage.setItem("sindhSafeCityUser", JSON.stringify(user));
  setProfile(user);
  return true;
}

function initLayout() {
  initIcons();
  const sidebar = $(".sidebar");
  const overlay = $(".sidebar-overlay");
  $(".menu-btn")?.addEventListener("click", () => {
    sidebar?.classList.add("open");
    overlay?.classList.add("open");
  });
  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("open");
  });

  const page = document.body.dataset.page;
  $$(".nav-link").forEach(link => {
    if (link.dataset.page === page) link.classList.add("active");
  });

  $("#logoutButton")?.addEventListener("click", async () => {
    try {
      await SafeCityAPI.post("/auth/logout", {});
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      SafeCityAPI.clearSession();
      window.location.href = "login.html";
    }
  });
  const date = $("#currentDate");
  if (date) date.textContent = new Intl.DateTimeFormat("en-PK", { dateStyle: "long" }).format(new Date());
}

function badge(status) {
  const className = {
    Active: "badge-active", Offline: "badge-offline", Maintenance: "badge-maintenance",
    Open: "badge-new", "In Progress": "badge-investigating", Resolved: "badge-resolved",
    Low: "badge-active", Medium: "badge-new", High: "badge-investigating", Critical: "badge-offline"
  }[status] || "badge-new";
  const element = document.createElement("span");
  element.className = `badge ${className}`;
  element.textContent = status || "Unknown";
  return element;
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value == null || value === "" ? "—" : String(value);
  row.appendChild(cell);
  return cell;
}

function addActionButton(container, icon, title, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-btn${danger ? " danger" : ""}`;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.dataset.action = action;
  button.dataset.id = id;
  button.innerHTML = `<i data-lucide="${icon}"></i>`;
  container.appendChild(button);
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

function renderPager(containerId, kind, result, load) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { page, pages, total } = result.pagination;
  pageState[kind] = { page, pages };
  container.replaceChildren();
  const summary = document.createElement("span");
  summary.className = "date-label";
  summary.textContent = `${total} records · Page ${page} of ${Math.max(pages, 1)}`;
  const controls = document.createElement("div");
  controls.className = "actions";
  for (const [label, target, disabled] of [
    ["Previous", page - 1, page <= 1],
    ["Next", page + 1, page >= pages]
  ]) {
    const button = document.createElement("button");
    button.className = "btn btn-secondary";
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", () => load(target));
    controls.appendChild(button);
  }
  container.append(summary, controls);
}

function renderEmptyRow(body, columns, message) {
  body.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.textContent = message;
  row.appendChild(cell);
  body.appendChild(row);
}

async function loadCameras(page = 1) {
  const body = $("#cameraTableBody");
  if (!body) return [];
  renderEmptyRow(body, 6, "Loading cameras...");
  const search = $("#cameraSearch")?.value.trim() || "";
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) query.set("q", search);
  try {
    const response = await SafeCityAPI.get(`/cameras?${query}`);
    const cameras = response.data.cameras;
    cameraRecords = new Map(cameras.map(camera => [camera._id, camera]));
    body.replaceChildren();
    if (!cameras.length) renderEmptyRow(body, 6, "No cameras found.");
    cameras.forEach(camera => {
      const row = document.createElement("tr");
      addCell(row, camera.cameraId);
      addCell(row, camera.cameraName);
      addCell(row, camera.location);
      const status = document.createElement("td");
      status.appendChild(badge(camera.status));
      row.appendChild(status);
      addCell(row, formatDate(camera.updatedAt));
      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "actions";
      addActionButton(actions, "eye", "View", "camera-details", camera._id);
      addActionButton(actions, "pencil", "Edit", "camera-edit", camera._id);
      addActionButton(actions, "trash-2", "Delete", "camera-delete", camera._id, true);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      body.appendChild(row);
    });
    renderPager("cameraPagination", "cameras", response.data, loadCameras);
    initIcons();
    return cameras;
  } catch (error) {
    renderEmptyRow(body, 6, "Unable to load cameras.");
    showToast(error.message, "error");
    return [];
  }
}

function setCameraDetail(camera) {
  $("#detailCameraId").textContent = camera.cameraId;
  $("#detailCameraName").textContent = camera.cameraName;
  $("#detailCameraLocation").textContent = camera.location;
  $("#detailCameraType").textContent = camera.cameraType || "CCTV";
  $("#detailCameraDescription").textContent = camera.description || "—";
  $("#detailCameraStatus").replaceChildren(badge(camera.status));
}

function editCamera(camera) {
  editCameraId = camera._id;
  $("#cameraFormModal .modal-header h3").textContent = "Edit Camera";
  $("#cameraId").value = camera.cameraId || "";
  $("#cameraName").value = camera.cameraName || "";
  $("#cameraLocation").value = camera.location || "";
  $("#cameraType").value = camera.cameraType || "";
  $("#cameraStatus").value = camera.status || "Active";
  $("#cameraDescription").value = camera.description || "";
  openModal("cameraFormModal");
}

function resetCameraForm() {
  editCameraId = null;
  $("#cameraForm")?.reset();
  $("#cameraFormModal .modal-header h3").textContent = "Add Camera";
}

function initCameraPage() {
  if (document.body.dataset.page !== "cameras") return;
  loadCameras();
  let timer;
  $("#cameraSearch")?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadCameras(1), 250);
  });
  $("#cameraTableBody")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const camera = cameraRecords.get(button.dataset.id);
    if (!camera) return;
    if (button.dataset.action === "camera-details") {
      setCameraDetail(camera);
      openModal("cameraDetailModal");
    } else if (button.dataset.action === "camera-edit") {
      editCamera(camera);
    } else if (button.dataset.action === "camera-delete" && window.confirm(`Delete camera ${camera.cameraId}?`)) {
      try {
        await SafeCityAPI.delete(`/cameras/${camera._id}`);
        showToast("Camera deleted successfully.");
        await loadCameras(pageState.cameras.page);
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  });
  $("#cameraForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.cameraId) delete values.cameraId;
    try {
      if (editCameraId) {
        await SafeCityAPI.put(`/cameras/${editCameraId}`, values);
        showToast("Camera updated successfully.");
      } else {
        await SafeCityAPI.post("/cameras", values);
        showToast("Camera added successfully.");
      }
      closeModal("cameraFormModal");
      resetCameraForm();

      await loadCameras(1);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
 $$('[data-open-modal="cameraFormModal"]').forEach(button =>
  button.addEventListener("click", () => {
    resetCameraForm();
    openModal("cameraFormModal");
  })
);
}

async function loadIncidentCameras(selectedId = "") {
  const select = $("#incidentCamera");
  if (!select) return;
  try {
    const response = await SafeCityAPI.get("/cameras?limit=100");
    select.replaceChildren(new Option("No associated camera", ""));
    response.data.cameras.forEach(camera => {
      select.add(new Option(`${camera.cameraId} · ${camera.cameraName}`, camera._id));
    });
    select.value = selectedId || "";
  } catch (error) {
    showToast(`Could not load camera options: ${error.message}`, "error");
  }
}

async function loadIncidents(page = 1) {
  const body = $("#incidentTableBody");
  if (!body) return [];
  renderEmptyRow(body, 6, "Loading incidents...");
  const search = $("#incidentSearch")?.value.trim() || "";
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) query.set("q", search);
  try {
    const response = await SafeCityAPI.get(`/incidents?${query}`);
    const incidents = response.data.incidents;
    incidentRecords = new Map(incidents.map(incident => [incident._id, incident]));
    body.replaceChildren();
    if (!incidents.length) renderEmptyRow(body, 6, "No incidents found.");
    incidents.forEach(incident => {
      const row = document.createElement("tr");
      addCell(row, incident.incidentId);
      addCell(row, incident.incidentType);
      addCell(row, incident.location);
      addCell(row, formatDate(incident.createdAt));
      const status = document.createElement("td");
      status.appendChild(badge(incident.status));
      row.appendChild(status);
      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "actions";
      addActionButton(actions, "eye", "View", "incident-details", incident._id);
      addActionButton(actions, "pencil", "Edit", "incident-edit", incident._id);
      addActionButton(actions, "trash-2", "Delete", "incident-delete", incident._id, true);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      body.appendChild(row);
    });
    renderPager("incidentPagination", "incidents", response.data, loadIncidents);
    initIcons();
    return incidents;
  } catch (error) {
    renderEmptyRow(body, 6, "Unable to load incidents.");
    showToast(error.message, "error");
    return [];
  }
}

function setIncidentDetail(incident) {
  $("#detailIncidentId").textContent = incident.incidentId;
  $("#detailIncidentType").textContent = incident.incidentType;
  $("#detailIncidentPriority").replaceChildren(badge(incident.priority));
  $("#detailIncidentStatus").replaceChildren(badge(incident.status));
  $("#detailIncidentDate").textContent = formatDate(incident.createdAt);
  $("#detailIncidentLocation").textContent = incident.location;
  $("#detailIncidentTitle").textContent = incident.title;
  $("#detailIncidentDescription").textContent = incident.description || "—";
}

async function editIncident(incident) {
  editIncidentId = incident._id;
  $("#incidentFormModal .modal-header h3").textContent = "Edit Incident";
  $("#incidentTitle").value = incident.title || "";
  $("#incidentType").value = incident.incidentType || "";
  $("#incidentPriority").value = incident.priority || "Medium";
  $("#incidentStatus").value = incident.status || "Open";
  $("#incidentLocation").value = incident.location || "";
  $("#incidentDescription").value = incident.description || "";
  await loadIncidentCameras(incident.camera?._id || incident.camera || "");
  openModal("incidentFormModal");
}

function resetIncidentForm() {
  editIncidentId = null;
  $("#incidentForm")?.reset();
  $("#incidentFormModal .modal-header h3").textContent = "Add Incident";
  loadIncidentCameras();
}

function initIncidentPage() {
  if (document.body.dataset.page !== "incidents") return;
  loadIncidents();
  loadIncidentCameras();
  let timer;
  $("#incidentSearch")?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadIncidents(1), 250);
  });
  $("#incidentTableBody")?.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const incident = incidentRecords.get(button.dataset.id);
    if (!incident) return;
    if (button.dataset.action === "incident-details") {
      setIncidentDetail(incident);
      openModal("incidentDetailModal");
    } else if (button.dataset.action === "incident-edit") {
      await editIncident(incident);
    } else if (button.dataset.action === "incident-delete" && window.confirm(`Delete incident ${incident.incidentId}?`)) {
      try {
        await SafeCityAPI.delete(`/incidents/${incident._id}`);
        showToast("Incident deleted successfully.");
        await loadIncidents(pageState.incidents.page);
      } catch (error) {
        showToast(error.message, "error");
      }
    }
  });
  $("#incidentForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.camera) delete values.camera;
    try {
      if (editIncidentId) {
        await SafeCityAPI.put(`/incidents/${editIncidentId}`, values);
        showToast("Incident updated successfully.");
      } else {
        await SafeCityAPI.post("/incidents", values);
        showToast("Incident added successfully.");
      }
      closeModal("incidentFormModal");
      resetIncidentForm();
      await loadIncidents(1);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
 $$('[data-open-modal="incidentFormModal"]').forEach(button =>
  button.addEventListener("click", () => {
    resetIncidentForm();
    openModal("incidentFormModal");
  })
);
}

function createActivityItem(description, date, isNotification = false, notificationId = "") {
  const item = document.createElement("div");
  item.className = "activity-item";
  const dot = document.createElement("div");
  dot.className = "activity-dot";
  const copy = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = description;
  const time = document.createElement("span");
  time.textContent = formatDate(date);
  copy.append(text, time);
  if (isNotification && notificationId) {
    const markRead = document.createElement("button");
    markRead.className = "btn btn-secondary";
    markRead.type = "button";
    markRead.textContent = "Mark read";
    markRead.addEventListener("click", async () => {
      try {
        await SafeCityAPI.patch(`/notifications/${notificationId}/read`, {});
        await loadNotifications();
        showToast("Notification marked as read.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
    copy.appendChild(markRead);
  }
  item.append(dot, copy);
  return item;
}

async function loadDashboard() {
  try {
    const { data } = await SafeCityAPI.get("/dashboard/stats");
    $("#totalCameras").textContent = data.totalCameras;
    $("#activeCameras").textContent = data.activeCameras;
    $("#totalIncidents").textContent = data.totalIncidents;
    const body = $("#recentIncidentsBody");
    body.replaceChildren();
    if (!data.recentIncidents.length) {
      renderEmptyRow(body, 4, "No incidents have been reported.");
    } else {
      data.recentIncidents.forEach(incident => {
        const row = document.createElement("tr");
        addCell(row, incident.incidentId);
        addCell(row, incident.incidentType);
        addCell(row, incident.location);
        const status = document.createElement("td");
        status.appendChild(badge(incident.status));
        row.appendChild(status);
        body.appendChild(row);
      });
    }
  } catch (error) {
    showToast(error.message, "error");
    renderEmptyRow($("#recentIncidentsBody"), 4, "Dashboard statistics are unavailable.");
  }
  await loadActivity();
  await loadNotifications();
}

async function loadActivity() {
  const list = $("#activityList");
  try {
    const response = await SafeCityAPI.get("/activity?limit=5");
    list.replaceChildren();
    const entries = response.data.activities;
    if (!entries.length) return list.appendChild(createActivityItem("No recent activity.", ""));
    entries.forEach(entry => list.appendChild(createActivityItem(entry.description, entry.createdAt)));
  } catch (error) {
    list.replaceChildren(createActivityItem(`Unable to load activity: ${error.message}`, ""));
  }
}

async function loadNotifications() {
  const list = $("#notificationList");
  if (!list) return;
  try {
    const response = await SafeCityAPI.get("/notifications?limit=5");
    list.replaceChildren();
    const notifications = response.data.notifications;
    if (!notifications.length) return list.appendChild(createActivityItem("No notifications.", ""));
    notifications.forEach(notification => {
      const description = `${notification.title}: ${notification.message}${notification.isRead ? " (read)" : ""}`;
      list.appendChild(createActivityItem(description, notification.createdAt, !notification.isRead, notification._id));
    });
  } catch (error) {
    list.replaceChildren(createActivityItem(`Unable to load notifications: ${error.message}`, ""));
  }
}

function initAssistant() {
  const button = $("#aiFab");
  const panel = $("#aiPanel");
  if (!button || !panel) return;
  button.addEventListener("click", () => panel.classList.toggle("open"));
  $("#closeAi")?.addEventListener("click", () => panel.classList.remove("open"));
  const input = $("#chatInput");
  const messages = $("#chatMessages");
  const sendMessage = async () => {
    const question = input.value.trim();
    if (!question) return;
    const user = document.createElement("div");
    user.className = "chat-message user";
    user.textContent = question;
    messages.appendChild(user);
    input.value = "";
    const loading = document.createElement("div");
    loading.className = "chat-message bot";
    loading.textContent = "Checking system data...";
    messages.appendChild(loading);
    messages.scrollTop = messages.scrollHeight;
    try {
      const response = await SafeCityAPI.post("/assistant/query", { question });
      loading.textContent = response.data.answer;
    } catch (error) {
      loading.textContent = error.message;
    }
    messages.scrollTop = messages.scrollHeight;
  };
  $("#sendChat")?.addEventListener("click", sendMessage);
  input?.addEventListener("keydown", event => {
    if (event.key === "Enter") sendMessage();
  });
  $("#aiNav")?.addEventListener("click", event => {
    event.preventDefault();
    button.click();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initLayout();
  initModals();
  initAssistant();
  try {
    if (!await protectPage()) return;
  } catch (error) {
    showToast(error.message, "error");
    return;
  }
  const page = document.body.dataset.page;
  if (page === "dashboard") await loadDashboard();
  if (page === "cameras") initCameraPage();
  if (page === "incidents") initIncidentPage();
});
