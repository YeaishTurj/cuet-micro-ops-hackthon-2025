import * as Sentry from "@sentry/browser";
import { initOtel } from "./otel.js";
import { initSentry } from "./sentry.js";
import "./styles.css";

initOtel();
initSentry();

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

let requestLog = [];

/**
 * Call the API and return response metadata
 */
async function callApi(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep text
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    requestId: res.headers.get("x-request-id"),
    traceparent: res.headers.get("traceparent"),
  };
}

function createBadge(label) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = label;
  return span;
}

function addLog(entry) {
  requestLog = [entry, ...requestLog].slice(0, 6);
  renderLog();
}

async function handleHealth() {
  try {
    const result = await callApi("/health");
    document.querySelector(".health-status").textContent = result.ok
      ? "healthy"
      : "unhealthy";
    addLog(result);
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function handleCheckFile() {
  try {
    const fileId = Number(document.querySelector(".file-id-input").value);
    const result = await callApi("/v1/download/check", {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    });
    addLog(result);
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function handleStartDownload() {
  try {
    const fileId = Number(document.querySelector(".file-id-input").value);
    const result = await callApi("/v1/download/start", {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    });
    if (result.ok) {
      document.querySelector(".job-message").textContent =
        "Download started — watch Jaeger for traces.";
    } else {
      document.querySelector(".job-message").textContent =
        "Download failed — check Sentry/Jaeger.";
    }
    addLog(result);
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function handleSentryTest() {
  try {
    const fileId = Number(document.querySelector(".file-id-input").value);
    const result = await callApi(`/v1/download/check?sentry_test=true`, {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    });
    addLog(result);
  } catch (error) {
    Sentry.captureException(error);
  }
}

function renderLog() {
  const container = document.querySelector(".log");
  container.innerHTML = "";

  if (requestLog.length === 0) {
    container.innerHTML = '<p class="muted">No calls yet.</p>';
    return;
  }

  requestLog.forEach((r) => {
    const row = document.createElement("div");
    row.className = "log-row";

    const meta = document.createElement("div");
    meta.className = "log-meta";

    const statusPill = document.createElement("span");
    statusPill.className = r.ok ? "pill pill-ok" : "pill pill-err";
    statusPill.textContent = r.status;
    meta.appendChild(statusPill);

    if (r.requestId) {
      const reqPill = document.createElement("span");
      reqPill.className = "pill";
      reqPill.textContent = `req: ${r.requestId}`;
      meta.appendChild(reqPill);
    }

    if (r.traceparent) {
      const tracePill = document.createElement("span");
      tracePill.className = "pill";
      tracePill.textContent = `traceparent: ${r.traceparent}`;
      meta.appendChild(tracePill);
    }

    row.appendChild(meta);

    const body = document.createElement("pre");
    body.className = "log-body";
    body.textContent = JSON.stringify(r.data, null, 2);
    row.appendChild(body);

    container.appendChild(row);
  });
}

// Wire up event listeners
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".btn-health").addEventListener("click", handleHealth);
  document
    .querySelector(".btn-check")
    .addEventListener("click", handleCheckFile);
  document
    .querySelector(".btn-start")
    .addEventListener("click", handleStartDownload);
  document
    .querySelector(".btn-sentry")
    .addEventListener("click", handleSentryTest);
});
