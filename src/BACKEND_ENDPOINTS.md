Ingage AI
Add collection description…
﻿
User
Add folder description…
﻿
POSTlogin
{{ingLocal}}/auth/login
Authenticates a user and returns an access token.
Method: POST
Path: /auth/login
Submit user credentials (email and password) in the request body to receive a JWT or session token used for subsequent authenticated requests.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_1d5f}}
Bodyraw (json)
json
{
  "email": "cybsam3@gmail.com",
  "password": "12345"
}
GETlogout
{{ingLocal}}/auth/logout
Logs out the currently authenticated user and invalidates their session.
Method: GET
Path: /auth/logout
Requires a valid authentication token. Calling this endpoint ends the user's active session.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
POSTRegister
{{ingLocal}}/auth/register
Registers a new user account in the system.
Method: POST
Path: /auth/register
Submit the required user details (e.g., name, email, password) in the request body. A confirmation email may be sent to verify the user's email address after registration.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYnJAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6Ik1CUiIsImxhc3RfbmFtZSI6IiBDb21wdXRlcnMiLCJsYXN0X2xvZ2luIjoiVGh1IEFwciAzMCAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlRodSBBcHIgMzAgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjEsInBhc3N3b3JkIjoiJDJhJDEwJG5ZTkdvYkJNYktXYlpNQi9lTDg3VS51bG44QU1HVUVuYllqNHlSaHVZeDZVeUFhWXVRS21TIiwiaWF0IjoxNzc3ODk0MzQwLCJleHAiOjE3Nzk2MjIzNDB9.6tHLkDEwvqbU8D8jsIozb0X8ruHgIWbZHL_xixvS4sw
Bodyraw (json)
json
{
  "email": "cybsam3@gmail.com",
  "password": "12345",
  "first_name": "Gbenga",
  "last_name": "Doe"
}
GETconfirm email
{{ingLocal}}/auth/confirm-email/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImlhdCI6MTc4MDA4OTUwMiwiZXhwIjoxNzgwMTc1OTAyfQ.G2A4irYTV75bns2h4B0eAQVIC6QcZom9W47RLhzKph0
Confirms a user's email address using a verification token.
Method: GET
Path: /auth/confirm-email/:token
Path Parameters:
token — The email verification token sent to the user's email address after registration.
This endpoint activates the user's account upon successful token validation.
﻿
POSTforgot password
{{ingage_live}}auth/forgot-password
Initiates the password recovery process by sending a reset link to the user's email.
Method: POST
Path: /auth/forgot-password
Submit the user's registered email address in the request body. A password reset link will be sent to that email if the account exists.
﻿
Bodyraw (json)
json
{
  "email": "cybsam3@gmail.com"
}
POSTreset password
{{ingLocal}}/auth/reset-password
Resets the user's password using a valid reset token.
Method: POST
Path: /auth/reset-password
Submit the reset token (received via email) along with the new password in the request body. The token must be valid and unexpired for the password to be updated.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYnJAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6Ik1CUiIsImxhc3RfbmFtZSI6IiBDb21wdXRlcnMiLCJsYXN0X2xvZ2luIjoiVGh1IEFwciAzMCAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlRodSBBcHIgMzAgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjEsInBhc3N3b3JkIjoiJDJhJDEwJG5ZTkdvYkJNYktXYlpNQi9lTDg3VS51bG44QU1HVUVuYllqNHlSaHVZeDZVeUFhWXVRS21TIiwiaWF0IjoxNzc3ODk0MzQwLCJleHAiOjE3Nzk2MjIzNDB9.6tHLkDEwvqbU8D8jsIozb0X8ruHgIWbZHL_xixvS4sw
Bodyraw (json)
View More
json
{
  "password": "12345678",
  "confirm_password": "12345678",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImlhdCI6MTc4MDA4MDc3MCwiZXhwIjoxNzgwMDgwODkwfQ.n1zwJWSAHmfgfUC7wWATN2p88BFUj4OUxjo4PoUdfoM"
}
POSTresend forgot password
{{ingLocal}}/auth/reset-password
Resends the forgot-password reset email to the user.
Method: POST
Path: /auth/reset-password
Use this endpoint when the user did not receive or the previous reset password email has expired. Submit the user's email address in the request body to trigger a new reset email.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYnJAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6Ik1CUiIsImxhc3RfbmFtZSI6IiBDb21wdXRlcnMiLCJsYXN0X2xvZ2luIjoiVGh1IEFwciAzMCAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlRodSBBcHIgMzAgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjEsInBhc3N3b3JkIjoiJDJhJDEwJG5ZTkdvYkJNYktXYlpNQi9lTDg3VS51bG44QU1HVUVuYllqNHlSaHVZeDZVeUFhWXVRS21TIiwiaWF0IjoxNzc3ODk0MzQwLCJleHAiOjE3Nzk2MjIzNDB9.6tHLkDEwvqbU8D8jsIozb0X8ruHgIWbZHL_xixvS4sw
Bodyraw (json)
View More
json
{
  "password": "12345678",
  "confirm_password": "12345678",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImlhdCI6MTc4MDA4MDc3MCwiZXhwIjoxNzgwMDgwODkwfQ.n1zwJWSAHmfgfUC7wWATN2p88BFUj4OUxjo4PoUdfoM"
}
Onboarding
Add folder description…
﻿
GETget all app purposes
{{ingLocal}}/app-purposes/list
Retrieves a list of all available app purposes for onboarding.
Method: GET
Path: /app-purposes/list
Returns all app purpose options presented to users during the onboarding flow to understand their intended use of the application. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_11mf}}
GETget all company kinds
{{ingLocal}}/company-kinds/list
Retrieves a list of all available company kinds for onboarding.
Method: GET
Path: /company-kinds/list
Returns all company kind options (e.g., sole proprietorship, LLC, corporation) used during the onboarding process to classify the user's business type. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
GETget all company sizes
{{ingLocal}}/company-sizes/list
Retrieves a list of all available company size options for onboarding.
Method: GET
Path: /company-sizes/list
Returns all company size categories (e.g., 1–10 employees, 11–50 employees) used during onboarding to profile the user's organization. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
GETget all goals
{{ingLocal}}/goals/list
Retrieves a list of all available goals for onboarding.
Method: GET
Path: /goals/list
Returns all goal options presented to users during onboarding to capture their primary objectives for using the platform. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_11mf}}
GETget all roles in company
{{ingLocal}}/roles-in-company/list
Retrieves a list of all available roles within a company for onboarding.
Method: GET
Path: /roles-in-company/list
Returns all role options (e.g., CEO, Manager, Developer) used during onboarding to identify the user's position within their organization. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_11mf}}
Country
Add folder description…
﻿
GETget all countries with state
{{ingLocal}}/countries/list
Retrieves a list of all countries along with their associated states.
Method: GET
Path: /countries/list
Returns all country records, each including a nested list of states/provinces. Useful for populating location-based dropdowns during onboarding or client creation. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
State
Add folder description…
﻿
GETget all states with country id
{{ingLocal}}/states/list/161
Retrieves all states belonging to a specific country.
Method: GET
Path: /states/list/:countryId
Path Parameters:
countryId — The unique identifier of the country (e.g., 161 for Nigeria).
Returns a list of all states/provinces associated with the given country ID. Useful for populating state dropdowns based on a selected country. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
City
Add folder description…
﻿
GETget all cities with state id and country id
{{ingLocal}}/cities/list/161/3064
Retrieves all states belonging to a specific country.
Method: GET
Path: /states/list/:countryId
Path Parameters:
countryId — The unique identifier of the country (e.g., 161 for Nigeria).
Returns a list of all states/provinces associated with the given country ID. Useful for populating state dropdowns based on a selected country. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_0b1c}}
Business Niches
Add folder description…
﻿
GETget all business Niches
{{ingLocal}}/business-niches/list
Retrieves a list of all available business niches.
Method: GET
Path: /business-niches/list
Returns all business niche options that can be associated with clients or company profiles. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Leads
Add folder description…
﻿
POSTget clients
{{ingLocal}}/leads/generate
Triggers AI-powered lead generation to find potential clients.
Method: POST
Path: /leads/generate
Submit search criteria or filters in the request body to initiate a lead generation job. The job runs asynchronously — use the Job Status or Get Single endpoints to track progress. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_0x5k}}
Bodyraw (json)
json
{
  "prompt": "find 3 furniture shops in Chanchaga Minna Nigeria"
}
GETJob status
{{ingLocal}}/leads/jobs/81583261-be6a-42a9-9c74-378658f9b805
Retrieves the current status of a lead generation job.
Method: GET
Path: /leads/jobs/:jobId
Path Parameters:
jobId — The unique identifier of the lead generation job.
Returns the job's current status (e.g., pending, processing, completed, failed). Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJHYmVuZ2EiLCJsYXN0X25hbWUiOiJEb2UiLCJsYXN0X2xvZ2luIjoiVHVlIEp1biAwOSAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlR1ZSBKdW4gMDkgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjIsInBhc3N3b3JkIjoiJDJhJDEwJDJGSVhTMG95VUJiQTQ5emsvdFhoSi5SZGFRaDNKTkprSnMvZlR1QTVpWkR1eVlXSlIwQ0VlIiwiY29uZmlybV9lbWFpbCI6MSwiaWF0IjoxNzgwOTYwNjY5LCJleHAiOjE3ODI2ODg2Njl9.eOIPw4D01Ox_JPhTkM8Pz_IDG5FgexdJK8eGX-FkDYk
Bodyraw (json)
json
{
  "prompt": "Find me 10 restaurants in Kubwa, Abuja Nigeria"
}
POSTsave leads/client
{{ingLocal}}/leads/save
Saves generated leads or clients to the system.
Method: POST
Path: /leads/save
Submit the lead or client data in the request body to persist them as client records. Typically called after reviewing results from a completed lead generation job. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyraw (json)
json
{
  "ids": [2,3,4],
  "client_category_id": 1
}
GETget all jobs
{{ingLocal}}/leads/jobs
Retrieves a list of all lead generation jobs.
Method: GET
Path: /leads/jobs
Returns all lead generation jobs associated with the authenticated user, including their statuses and metadata. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyraw (json)
json
{
  "ids": [1],
  "client_category_id": 1
}
GETget single
{{ingLocal}}/leads/jobs/a2145def-4cec-4927-99db-acf09f12a7f5
Retrieves the details of a single lead generation job by its ID.
Method: GET
Path: /leads/jobs/:jobId
Path Parameters:
jobId — The unique identifier of the lead generation job.
Returns full details of the specified job including status, parameters, and timestamps. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyraw (json)
json
{
  "ids": [1],
  "client_category_id": 1
}
GETget lead results
{{ingLocal}}/leads/jobs/c1f18199-e9b0-4bb5-931e-8fe4ec8ee72a/results
Retrieves the lead results produced by a completed lead generation job.
Method: GET
Path: /leads/jobs/:jobId/results
Path Parameters:
jobId — The unique identifier of the completed lead generation job.
Returns the list of leads/clients discovered by the AI for the specified job. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJHYmVuZ2EiLCJsYXN0X25hbWUiOiJEb2UiLCJsYXN0X2xvZ2luIjoiVHVlIEp1biAwOSAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlR1ZSBKdW4gMDkgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjIsInBhc3N3b3JkIjoiJDJhJDEwJDJGSVhTMG95VUJiQTQ5emsvdFhoSi5SZGFRaDNKTkprSnMvZlR1QTVpWkR1eVlXSlIwQ0VlIiwiY29uZmlybV9lbWFpbCI6MSwiaWF0IjoxNzgwOTYwNjY5LCJleHAiOjE3ODI2ODg2Njl9.eOIPw4D01Ox_JPhTkM8Pz_IDG5FgexdJK8eGX-FkDYk
Bodyraw (json)
json
{
  "prompt": "Find me 10 restaurants in Kubwa, Abuja Nigeria"
}
POSTview 8n8 response
{{ingLocal}}/leads/inspect-n8n
Inspects and views the raw response payload received from the n8n automation workflow.
Method: POST
Path: /leads/inspect-n8n
Submit the n8n webhook or callback payload in the request body to inspect and debug the data returned by the n8n integration during lead generation. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJHYmVuZ2EiLCJsYXN0X25hbWUiOiJEb2UiLCJsYXN0X2xvZ2luIjoiVHVlIEp1biAwOSAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlR1ZSBKdW4gMDkgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjIsInBhc3N3b3JkIjoiJDJhJDEwJDJGSVhTMG95VUJiQTQ5emsvdFhoSi5SZGFRaDNKTkprSnMvZlR1QTVpWkR1eVlXSlIwQ0VlIiwiY29uZmlybV9lbWFpbCI6MSwiaWF0IjoxNzgwOTYwNjY5LCJleHAiOjE3ODI2ODg2Njl9.eOIPw4D01Ox_JPhTkM8Pz_IDG5FgexdJK8eGX-FkDYk
Bodyraw (json)
json
{
  "prompt": "Find me 10 car wash in abuja, fct Nigeria"
}
Client Category
Add folder description…
﻿
GETget all
{{ingLocal}}/client-categories/list
Retrieves a list of all client categories.
Method: GET
Path: /client-categories/list
Returns all available client category records used to classify clients. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
GETget by id
{{ingLocal}}/client-categories/1
Retrieves a single client category by its unique ID.
Method: GET
Path: /client-categories/:id
Path Parameters:
id — The unique identifier of the client category (e.g., 1).
Returns the details of the specified client category. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
POSTcreate
{{ingLocal}}/client-categories/create
Creates a new client category.
Method: POST
Path: /client-categories/create
Submit the category details (e.g., name, description) in the request body. Returns the newly created client category on success. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Bodyform-data
name
Hotels
description
for accomodation
PUTupdate
{{ingLocal}}/client-categories/update/2
Updates an existing client category by its ID.
Method: PUT
Path: /client-categories/update/:id
Path Parameters:
id — The unique identifier of the client category to update (e.g., 1).
Submit the updated category fields in the request body. Returns the updated category on success. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyform-data
name
Restaurants
description
for fooddd
DELETEdelete
{{ingLocal}}/client-categories/delete/2
Deletes a client category by its ID.
Method: DELETE
Path: /client-categories/delete/:id
Path Parameters:
id — The unique identifier of the client category to delete (e.g., 2).
Permanently removes the specified client category. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyform-data
name
Restaurants
description
for food
Clients
Add folder description…
﻿
GETget all
{{ingLocal}}/clients/list
Retrieves a list of all clients in the system.
Method: GET
Path: /clients/list
Returns a paginated or full list of client records. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
GETget count by client cat id
{{ingLocal}}/clients/list
Retrieves the count of clients grouped by client category ID.
Method: GET
Path: /clients/list
Returns client count statistics filtered or grouped by client category. Requires authentication. Query parameters may be used to filter by a specific category ID.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
GETget all by client cat id
{{ingLocal}}/clients/clients-list/1
Retrieves all clients belonging to a specific client category.
Method: GET
Path: /clients/clients-list/:clientCatId
Path Parameters:
clientCatId — The ID of the client category (e.g., 1).
Returns a list of clients filtered by the specified category ID. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
GETget by id
{{ingLocal}}/clients/1
Retrieves a single client record by its unique ID.
Method: GET
Path: /clients/:id
Path Parameters:
id — The unique identifier of the client (e.g., 1).
Returns the full details of the specified client. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
GETexport xlsx
{{ingLocal}}/clients/export?format=xlsx
Exports the client list as an Excel (XLSX) file.
Method: GET
Path: /clients/export
Query Parameters:
format=xlsx — Specifies the export format as Excel.
Returns a downloadable XLSX file containing all client records. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJHYmVuZ2EiLCJsYXN0X25hbWUiOiJEb2UiLCJsYXN0X2xvZ2luIjoiVHVlIEp1biAwOSAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlR1ZSBKdW4gMDkgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjIsInBhc3N3b3JkIjoiJDJhJDEwJDJGSVhTMG95VUJiQTQ5emsvdFhoSi5SZGFRaDNKTkprSnMvZlR1QTVpWkR1eVlXSlIwQ0VlIiwiY29uZmlybV9lbWFpbCI6MSwiaWF0IjoxNzgxMTExMDM1LCJleHAiOjE3ODI4MzkwMzV9.CvbjtRxQMutLG7f9gwg5fcgdoLl_GcsACCuO4DFyRTo
Query Params
format
xlsx
GETimport xlsx
{{ingLocal}}/clients/export?format=xlsx
Imports client data from an Excel (XLSX) file.
Method: GET
Path: /clients/export?format=xlsx
Use this endpoint to import client records from an XLSX file into the system. The request body should include the file to be uploaded. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywiZW1haWwiOiJjeWJzYW0zQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJHYmVuZ2EiLCJsYXN0X25hbWUiOiJEb2UiLCJsYXN0X2xvZ2luIjoiVHVlIEp1biAwOSAyMDI2IiwiY3VycmVudF9sb2dpbiI6IlR1ZSBKdW4gMDkgMjAyNiIsInN1c3BlbmQiOjAsInJvbGVfaWQiOjIsInBhc3N3b3JkIjoiJDJhJDEwJDJGSVhTMG95VUJiQTQ5emsvdFhoSi5SZGFRaDNKTkprSnMvZlR1QTVpWkR1eVlXSlIwQ0VlIiwiY29uZmlybV9lbWFpbCI6MSwiaWF0IjoxNzgxMTExMDM1LCJleHAiOjE3ODI4MzkwMzV9.CvbjtRxQMutLG7f9gwg5fcgdoLl_GcsACCuO4DFyRTo
Query Params
format
xlsx
GETexport csv
{{ingLocal}}/clients/export?format=csv
Exports the client list as a CSV file.
Method: GET
Path: /clients/export
Query Parameters:
format=csv — Specifies the export format as CSV.
Returns a downloadable CSV file containing all client records. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Query Params
format
csv
GETexport xml
{{ingLocal}}/clients/export?format=xml
Exports the client list as an XML file.
Method: GET
Path: /clients/export
Query Parameters:
format=xml — Specifies the export format as XML.
Returns a downloadable XML file containing all client records. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Query Params
format
xml
GETexport json
{{ingLocal}}/clients/export?format=json
Exports the client list as a JSON file.
Method: GET
Path: /clients/export
Query Parameters:
format=json — Specifies the export format as JSON.
Returns a downloadable JSON file containing all client records. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Query Params
format
json
POSTcreate
{{ingLocal}}/clients/add
Creates a new client record in the system.
Method: POST
Path: /clients/add
Submit the client's details (e.g., name, category, contact info) in the request body. Returns the newly created client object on success. Requires authentication.
﻿
Request Headers
Authorization
JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJqb2huQGdtYWlsLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIiwibGFzdF9sb2dpbiI6bnVsbCwiY3VycmVudF9sb2dpbiI6bnVsbCwic3VzcGVuZCI6bnVsbCwicm9sZV9pZCI6MiwicGFzc3dvcmQiOiIkMmEkMTAkL0kyR0FtOWZQLzZCbmdyZ1ZLV0F5ZTdsOW4uZlZtZ0MuLlFtcEVDT00vSTNBeWJvbWkwQnUiLCJpYXQiOjE3Nzk4OTMwNjksImV4cCI6MTc4MTYyMTA2OX0.Bz6HMPFOS3oXEBtwVhizjg2DSPbK0XTk8-9l39L3vv4
Bodyraw (json)
json
{
    "display_name": "Petty Cash Taqueria & Bar",
    "phone": "13239335300",
    "email_1": "press@pettycashtaqueria.com",
    "site": "http://pettycashtaqueria.com/",
    "client_category_id": 1
}
PUTupdate
{{ingLocal}}/clients/update/4
Updates an existing client record by its ID.
Method: PUT
Path: /clients/update/:id
Path Parameters:
id — The unique identifier of the client to update (e.g., 4).
Submit the updated client fields in the request body. Returns the updated client object on success. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyraw (json)
json
{
    "business_name": "Gbenga Salon"
}
DELETEdelete
{{ingLocal}}/clients/delete/9
Deletes a client record by its ID.
Method: DELETE
Path: /clients/delete/:id
Path Parameters:
id — The unique identifier of the client to delete (e.g., 2).
Permanently removes the specified client from the system. Requires authentication.
﻿
Request Headers
Authorization
JWT {{supabase_service_role_api_key_16fg}}
Bodyform-data
name
Restaurants
description
for food

PUT /user/save-onboarding-info

req
{
  "company_kind_id": 1,
  "role_in_company_id": 2,
  "company_size_id": 7,
  "app_purpose_id": 9
}

resp
{
    "status": 200,
    "success": true,
    "message": "User profile updated successfully",
    "description": "User profile updated successfully",
    "data": {
        "id": 1,
        "email": "cybsam3@gmail.com",
        "first_name": "Gbenga",
        "last_name": "Doe",
        "other_name": null,
        "confirm_email": 1,
        "current_login": "Sat Jun 13 2026",
        "last_login": "Sun Jun 14 2026",
        "suspend": 0,
        "role_id": 2,
        "app_purpose_id": 9,
        "company_kind_id": 1,
        "role_in_company_id": 2,
        "company_size_id": 7,
        "createdAt": "2026-06-13T13:09:52.000Z",
        "updatedAt": "2026-06-14T21:51:03.000Z"
    }
}

POST /goals/save-goals

req
{
  "goal_ids": [1]
}

resp
{
    "status": 200,
    "success": true,
    "message": "Login goals saved successfully",
    "description": "Login goals saved successfully",
    "data": {
        "user_id": 1,
        "goal_ids": [
            1
        ]
    }
}