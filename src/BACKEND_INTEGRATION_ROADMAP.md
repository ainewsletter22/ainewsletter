# Backend Integration Roadmap

This document tracks the remaining tasks to fully integrate the Ingage AI backend endpoints and resolve UI/UX issues.

## 1. Onboarding Flow (Profile Setup) - PARTIAL
## 1. Onboarding Flow (Profile Setup) - DONE
- [x] Integrate `getOnboardingMeta` into the Profile/Onboarding page.
  - [x] `GET /app-purposes/list`
  - [x] `GET /company-kinds/list`
  - [x] `GET /company-sizes/list`
  - [x] `GET /goals/list`
  - [x] `GET /roles-in-company/list`
- [ ] Save User Profile/Onboarding Data (Endpoint Pending from Backend)
- [x] Save User Profile/Onboarding Data
  - [x] `PUT /user/save-onboarding-info`
  - [x] `POST /goals/save-goals`

## 2. Granular Location Services - DONE
- [x] Add City dropdown to `FindClients.tsx`.
  - [x] `GET /cities/list/:countryId/:stateId`

## 3. Leads & Workflow History - DONE
- [x] Create a "Search History" or "Jobs" view.
  - [x] `GET /leads/jobs` (List all historical searches)
  - [x] `GET /leads/jobs/:jobId` (Fetch specific job metadata)
  - [ ] `POST /leads/inspect-n8n` (Removed: Backend confirmed documentation error)

## 4. Client Category Management (Folders) - DONE
- [x] Connect `FindClients.tsx` saving logic to backend folders.
- [x] Connect `ManageClients.tsx` folders to the backend.
  - [x] `GET /client-categories/list`
  - [x] `POST /client-categories/create` (Manual creation)
  - [x] `PUT /client-categories/update/:id` (Rename folder)
  - [x] `DELETE /client-categories/delete/:id` (Remove folder)

## 5. Saved Clients (The "Manage Clients" Grid) - DONE
- [x] Connect the main clients list to live data.
  - [x] `GET /clients/list`
  - [x] `GET /clients/clients-list/:clientCatId` (Filtering by folder)
  - [x] `POST /clients/add` (Manual client entry)
  - [x] `PUT /clients/update/:id` (Editing client details)
  - [x] `DELETE /clients/delete/:id` (Removing leads)
- [x] Implement Lead Export functionality.
  - [x] `GET /clients/export?format=(xlsx|csv|xml|json)`

## 6. UX Refinement (Postponed)
- [ ] Map Precision & Africa Map bug (To be revisited)