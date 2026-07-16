# LifeFlow Hospital EMR - AI Chatbot & Agent Stack Documentation

This document outlines the detailed architecture, technology stack, model configurations, API integration layer, and role-based access control (RBAC) guardrails used for the AI Chatbot and Database Agents in the LifeFlow Hospital Management System (HMS).

---

## 🛠️ Technology Stack Overview

The AI Chatbot is built directly into the core Express/TypeScript backend server and communicates with the React/TypeScript frontend via a chat widget.

### 1. Core Technologies
*   **Backend Runtime**: Node.js & Express (TypeScript)
*   **Database ORM**: Sequelize (mapped to SQLite by default, configurable for MySQL)
*   **AI Integration Endpoint**: OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)
*   **API Client**: Standard Node.js `fetch` interface with async/await retry fallback pipeline
*   **Frontend Chat Interface**: React chat client with real-time markdown-rendered tables and action triggers

---

## 📡 AI Models & API Configuration

The backend connects to **OpenRouter** to query LLM candidate models. It employs a list of candidate free/low-cost instruction-following models, cycling down the sequence with a 100ms delay if any API rate limits or outages are hit.

### candidate Model List
1.  **Primary Model**: `tencent/hy3:free` (Tencent Hunyuan 3)
2.  **Fallback Model 1**: `qwen/qwen3-coder:free` (Qwen 3 Coder 32B Instruct)
3.  **Fallback Model 2**: `meta-llama/llama-3.3-70b-instruct:free` (Llama 3.3 70B Instruct)
4.  **Fallback Model 3**: `meta-llama/llama-3.2-3b-instruct:free` (Llama 3.2 3B Instruct)

### API Key Configuration
*   **Environment variable**: `OPENROUTER_API_KEY`
*   **Referer Header**: `http://localhost:5000`
*   **App Identification**: `LifeFlow HMS Chatbot`

---

## 🤖 Agent Design & Tool Calling (Function Calling)

The chatbot functions as a **ReAct Agent** (Reasoning and Acting). It receives a system guardrail instruction listing the user's role-based access rights along with standard tools defined in JSON.

### 1. Guardrails & System Prompts
The system prompt dynamically pulls the user's logged-in profile and maps their role to the allowed sidebar menus:
*   **Admin**: Full access.
*   **Doctor**: Dashboard, Patients, Appointments, Doctors Schedule, Bed Admissions, Laboratory Tests, Profile.
*   **Receptionist**: Dashboard, Patient Registration, Patients, Appointments, Token Queue, Doctors Schedule, Billing & Invoices, Reports, Profile.
*   **Pharmacist**: Dashboard, Pharmacy & Stock, Profile.
*   **Lab Technician**: Dashboard, Laboratory Tests, Profile.
*   **Accountant**: Dashboard, Patients, Pharmacy & Stock, Billing & Invoices, Reports, Profile.
*   **Nurse**: Dashboard, Patients, Appointments, Bed Admissions, Profile.

If the user requests details or database actions outside their menu mapping, the agent blocks execution locally.

### 2. Available Database Action Tools
The Agent communicates actions to the backend via structured JSON payloads:

```json
{
  "tool": "tool_name",
  "parameters": {
    "param_name": "param_val"
  }
}
```

*   **`get_dashboard_stats`**: Retrieves global EMR metrics (patients, occupied beds, billed revenue, daily expenses).
*   **`register_patient`**: Registers patient details (creates a login user credentials account and links a Sequelize Patient record, generating MR numbers sequentially).
*   **`get_patients_list`**: Search directory.
*   **`check_inventory`**: Handles pharmacy stock catalog queries and writes (supports `add_stock` with auto-registration of unknown medicines, `create` to register new entries, and `delete` to remove them safely).
*   **`billing_summary`**: Fetches an overview of unpaid/pending invoices.
*   **`test_request`**: Pulls laboratory request records.
*   **`manage_appointments`**: Schedules appointments, automatically resolving patient MR numbers or string names to SQLite IDs.
*   **`token_queue_status`**: Generates and updates waiting list tokens.
*   **`manage_beds`**: Wards occupancy and admissions, automatically linking IPD admissions and creating room-charge billing invoices.
*   **`doctors_schedule`**: Queries doctors' availability.
*   **`manage_staff`**: Handles staff registration (`create` / `delete`), automatically initializing doctor records if role is "doctor".
*   **`activity_audit`**: Logs admin-level audit logs.
*   **`manage_settings`**: Pulls EMR system parameters.
*   **`get_report`**: Extracts Daily Billing Collections, Patient Intake logs, and Appointment tallies by date range.

---

## 🏎️ Optimization and Parser Latency Reduction
*   **Format Markdown Mapping**: Instead of feeding database results back to the LLM to write a conversational summary (which doubles API call cost and latency), the backend uses `formatToolResultMarkdown` to directly render Sequelize JSON payloads into high-contrast Markdown tables.
*   **Safety Cleanup**: Strips model guardrail debug headers (e.g. `User Safety:`, `Safety Categories:`) and raw XML/JSON tool payloads from conversational logs before delivering to the frontend.
