


Ingage AI API Documentation



Brand and Domain Part
Integration Reference

Overview
This document describes the REST API exposed by the Ingage AI platform. It covers four resource groups: Brand, SMTP Setting, Domain, and Lookup. Brands represent the sender identity used for email campaigns. SMTP Settings define the outbound mail server configuration used to deliver campaigns. Domains represent the sending domains associated with a brand, along with their tracking configuration. Lookup endpoints return reference data (dropdown options) consumed by the other three resource groups.
This version reorganizes the original API notes into a standard reference format, with consistent sections for each endpoint (method and path, description, authentication, path parameters, request body, example payload, and response). Where the original notes contained inconsistencies, such as mismatched field names between an endpoint's description and its example payload, a Note has been added below the relevant endpoint to flag it for confirmation with the backend team before the frontend integration is finalized.

Environments
The original API notes reference two environment variables, used as the base URL for requests:

Parameter
Type
Description
{{ingage_live}}
string
Base URL for the production (live) environment.
{{ingLocal}}
string
Base URL for the local development environment.


Throughout this document, endpoint paths are shown relative to a single {{base_url}} placeholder. Frontend applications should configure this value per environment (for example, through an environment variable such as NEXT_PUBLIC_API_BASE_URL or REACT_APP_API_BASE_URL) rather than hardcoding a live or local host.

Authentication
Every endpoint in this API requires a bearer style JSON Web Token (JWT). The token must be sent in the Authorization request header. The Brand endpoints in the original notes format this header as JWT
<token>, while the SMTP Setting and Domain endpoints describe it as a Bearer token; both forms are documented per endpoint below exactly as specified, but frontend code should treat the header value as a single configurable constant so that either convention can be adopted consistently once confirmed with the backend team.
Example header:
Authorization: JWT <token>	

Security Note on Credentials
Note: The original API notes included what appear to be live secret values in the example requests, including a Resend API key and a Supabase service role key used as a sample JWT. Service role keys and provider API keys grant broad access and should never be embedded in client side code, shared documentation, or version control. This document has redacted those example values. If the original values were genuine production credentials, they should be rotated immediately, since they may already have been exposed to anyone with access to the source notes.

Response and Error Conventions
Across all resource groups, the API follows a consistent pattern:

Parameter
Type
Description
201 Created
Success
Returned by create endpoints, along with the newly created object.
200 OK
Success
Returned by get, list, update, and delete endpoints, along with the relevant object or a confirmation message.
404 Not Found
Error
Returned by get one, update one, and delete one endpoints when the given ID does not exist.


Frontend applications should check the HTTP status code rather than assuming success, and surface the 404 case as a user facing message (for example, "This brand no longer exists") rather than a generic error.

Brand
A brand represents a sender identity used for email campaigns: its display name, sending email address, reply to address, logo, and the third party credentials used to deliver mail on its behalf.
POST /brand/create
Registers a new brand in the Ingage AI platform. A brand represents a sender identity used for email campaigns, including its display name, email configuration, logo, and third party sending credentials (for example, a Resend API key). The request is submitted as multipart/form-data so that a logo file can be uploaded alongside the text fields.

Method
POST
Endpoint
{{base_url}}/brand/create
Authentication
Required. Send a valid JWT in the Authorization header as: JWT <token>


Request Body (multipart/form-data)

Field
Type
Required
Description
brand_name
string
Yes
The display name of the brand.
from_name
string
Yes
The sender name shown in outgoing emails.
from_email
string
Yes
The sender email address for outgoing emails.
reply_to_email
string
No
The email address recipients should reply to.
logo
file
No
The brand logo image file.
resend_api_key
string
No (Must be sent to facilitate emailing)
The Resend API key used to send emails on behalf of this brand.


Example Request (form-data)



Response
201 Created. Returns the newly created brand object, including its assigned id and all submitted fields.
Note: Because this endpoint expects multipart/form-data, build the request body with the browser FormData API rather than JSON.stringify. Do not set a Content-Type header manually when using FormData; let the browser set the multipart boundary automatically.



GET /brand/all
Returns a list of all brands registered in the platform. Each entry includes identity details such as name, sender email, reply to address, logo, and associated configuration. Useful for populating brand selection dropdowns, dashboards, or administrative views.

Method
GET
Endpoint
{{base_url}}/brand/all
Authentication
Required. Send a valid JWT in the Authorization header as: JWT <token>


Request Body: None.
Response
200 OK. Returns an array of brand objects, each containing id, brand_name, from_name, from_email, reply_to_email, logo, and other stored configuration fields.


GET /brand/get-one/:id
Fetches the full details of a single brand using its unique numeric identifier. Returns all stored fields, including sender identity, email configuration, logo, and any associated campaign or AI settings.

Method
GET
Endpoint
{{base_url}}/brand/get-one/1
Authentication
Required. Send a valid JWT in the Authorization header as: JWT <token>


Path Parameters

Parameter
Type
Description
id
integer
The unique ID of the brand to retrieve (e.g., 1).


Request Body: None.
Response
200 OK with the matching brand object. 404 Not Found if no brand with the given ID exists.


PATCH /brand/update-one/:id
Partially updates the configuration of an existing brand, including sender identity, email tracking preferences, campaign scheduling, AI agent settings, newsletter configuration, and unsubscribe or footer details. Only the fields included in the request body are updated; omitted fields remain unchanged.


Method
PATCH
Endpoint
{{base_url}}/brand/update-one/1
Authentication
Required. Send a valid JWT in the Authorization header as: JWT <token>


Path Parameters

Parameter
Type
Description
id
integer
The unique ID of the brand to update (e.g., 1).


Request Body (application/json)

Field
Type
Required
Description
brand_name
string
-
Updated display name of the brand.
send_via
string
-
Email sending provider (e.g., resend).
sending_limit
string
-
Maximum number of emails allowed per sending cycle.
from_name
string
-
Sender name shown in outgoing emails.
from_email
string
-
Sender email address.
reply_to_email
string
-
Reply to email address.
track_opens
boolean
-
Whether to track email opens.
track_clicks
boolean
-
Whether to track link clicks in emails.
set_campaign_notif
boolean
-
Whether to enable campaign notifications.
limits_id
integer
-
Reference ID for the sending limit tier (see Lookup: sending limit).
number_email_per_m onth
integer
-
Monthly email sending cap.
reset_day_id
integer
-
Reference ID for the monthly reset day (see Lookup: day of month).
newsletter_badge
boolean
-
Whether to display a newsletter badge.
ai_agent_id
integer
-
ID of the AI agent assigned to this brand.
business_type
string
-
Type of business (e.g., SaaS).
ai_goal
string
-
The AI campaign goal (e.g., Increase engagement).
tone_id
integer
-
ID of the writing tone used for AI generated content.
product_link_id
integer
-
ID of the product link associated with campaigns.
post_every_id
integer
-
ID representing the posting frequency (see Lookup: post every).




Field
Type
Required
Description
duration_id
integer
-
ID representing the campaign duration (see Lookup: duration).
stop_post_id
integer
-
ID representing the stop posting rule (see Lookup: stop post after).
regen_headline
boolean
-
Whether to auto regenerate email headlines.
regen_email_body
boolean
-
Whether to auto regenerate email body content.
start_date
string
-
Campaign start date (YYYY-MM-DD).
stop_date
string
-
Campaign stop date (YYYY-MM-DD).
test_email
string
-
Email address used for test sends.
schedule_date
string
-
Scheduled send date (YYYY-MM-DD).
schedule_time
string
-
Scheduled send time (HH:MM:SS).
unsuscribe_informatio n
string
-
Unsubscribe notice text shown in the email footer. (Field name preserved as returned by the API.)
footer_address
string
-
Physical mailing address shown in the email footer.


Example Request Body






Response
200 OK with the updated brand object reflecting all applied changes.
Note: This endpoint accepts a partial payload. Only send the fields the user actually changed on the form rather than the full object, to avoid accidentally overwriting other settings with stale client side state.
Note: The field name unsuscribe_information is spelled this way in the live API and should be kept exactly as shown; it is likely a typo of unsubscribe_information on the backend, but the frontend must match the current spelling until the API changes.


DELETE /brand/delete-one/:id
Permanently removes a specific brand using its unique numeric identifier. Once deleted, the brand and all its associated configuration, including sender identity, campaign settings, and AI preferences, are no longer available. This action is irreversible.

Method
DELETE
Endpoint
{{base_url}}/brand/delete-one/1
Authentication
Required. Send a valid JWT in the Authorization header as: JWT <token>


Path Parameters

Parameter
Type
Description
id
integer
The unique ID of the brand to delete (e.g., 1).


Request Body: None.
Response
200 OK confirming the brand has been deleted. 404 Not Found if no brand with the given ID exists.
Note: Because this action is irreversible, the frontend should show a confirmation dialog before calling this endpoint.

SMTP Setting
An SMTP setting defines the outbound mail server configuration used to deliver transactional or campaign email. Multiple configurations can be stored, though typically one is active per brand at a time.
POST /smtp-setting/create
Creates a new SMTP configuration used to send outbound email (notifications, alerts, or transactional messages) on behalf of the application. Multiple configurations can be stored for different environments or brands, though typically only one is active at a time.

Method
POST
Endpoint
{{base_url}}/smtp-setting/create
Authentication
Required. Bearer token in the Authorization header.


Request Body (application/json)

Field
Type
Required
Description
host
string
Yes
The SMTP server hostname (e.g., smtp.gmail.com, smtp.mailgun.org).
port
integer
Yes
The SMTP server port (e.g., 465 for SSL, 587 for TLS).
username
string
Yes
The SMTP account username or email address used for authentication.
password
string
Yes
The SMTP account password or app specific password.
encryption
string
Yes
The encryption protocol to use: ssl, tls, or none.
from_email
string
Yes
The sender email address that will appear in outgoing emails.
from_name
string
No
The display name associated with the sender email address.


Example Request Body



Response
201 Created. Returns the newly created SMTP setting object, including its assigned id and all provided configuration fields.

Note: The documented field list (host, port, username, password, encryption, from_email, from_name) differs from the sample payload shown for this endpoint, which instead references brand_id, smtp_prov_id, and sec_prot_id. The sample appears to use lookup IDs from the SMTP provider and security protocol lookup endpoints in place of free text encryption and provider values. Confirm the authoritative schema with the backend team before final integration, and use the
/lookup/smtp-providers and /lookup/security-protocols endpoints to source valid IDs if the lookup based schema is correct.


GET /smtp-setting/get-one/:id
Fetches the details of a specific SMTP setting, including host, port, encryption type, sender email, and username. Useful for viewing or verifying an existing configuration before using it or making updates.

Method
GET
Endpoint
{{base_url}}/smtp-setting/get-one/1
Authentication
Required. Bearer token in the Authorization header.


Path Parameters

Parameter
Type
Description
id
integer
The unique identifier of the SMTP setting to retrieve (e.g., 1).


Request Body: None.
Response
200 OK with the matching SMTP setting object. 404 Not Found if no record exists with the given ID.
Note: The original specification listed a brand form-data body (brand_name, logo, resend_api_key, and so on) for this GET request. That appears to be a copy paste error from the Brand create endpoint; a GET request should not send a request body, so it has been omitted here.


PATCH /smtp-setting/update-one/:id
Partially updates an existing SMTP setting. Only the fields provided are updated; all others remain unchanged. Useful for rotating credentials, changing host or port, switching encryption protocols, or updating the sender address without recreating the entire configuration.

Method
PATCH
Endpoint
{{base_url}}/smtp-setting/update-one/1
Authentication
Required. Bearer token in the Authorization header.


Path Parameters


Parameter
Type
Description
id
integer
The unique identifier of the SMTP setting to update (e.g., 1).


Request Body (application/json)

Field
Type
Required
Description
host
string
-
The new SMTP server hostname.
port
integer
-
The new SMTP server port.
username
string
-
The updated SMTP account username or email.
password
string
-
The updated SMTP account password or app specific password.
encryption
string
-
The updated encryption protocol: ssl, tls, or none.
from_email
string
-
The updated sender email address.
from_name
string
-
The updated display name for the sender.


Example Request Body



Response
200 OK with the updated SMTP setting object. 404 Not Found if no record exists with the given ID.


DELETE /smtp-setting/delete-one/:id
Permanently removes an SMTP setting. Deleting an active configuration may disrupt outbound email delivery until a new configuration is created or another existing one is activated.

Method
DELETE
Endpoint
{{base_url}}/smtp-setting/delete-one/1
Authentication
Required. Bearer token in the Authorization header.


Path Parameters

Parameter
Type
Description
id
integer
The unique identifier of the SMTP setting to delete (e.g., 1).



Request Body: None.
Response
200 OK with a confirmation message or the deleted record. 404 Not Found if no record exists with the given ID.
Note: Warn the user before deleting an SMTP setting that is currently active for a brand, since outbound mail may stop working until a replacement is configured.

Domain
A domain represents a sending domain associated with a brand, including its region and its open and click tracking configuration.
POST /domain/create
Creates a new sending domain associated with a brand, including regional and email tracking configuration used for open and click tracking.

Method
POST
Endpoint
{{base_url}}/domain/create
Authentication
Required. Bearer token in the Authorization header.


Request Body (application/json)

Field
Type
Required
Description
brand_id
integer
-
The brand this domain belongs to.
name
string
-
The domain name to register (e.g., new.sam).
region_id
integer
-
Reference ID for the sending region (see Lookup: regions).
custom_return_path
string
-
The custom return path subdomain used for bounce handling (e.g., bounce).
tracking_subdomain
string
-
The subdomain used for open and click tracking links (e.g., links).
enable_open_tracking
boolean
-
Whether to enable open tracking for this domain.
enable_click_tracking
boolean
-
Whether to enable click tracking for this domain.


Example Request Body



Response
201 Created. Returns the newly created domain object, including its assigned id and all provided fields.

Note: The general endpoint description refers only to name and description as domain fields, while the sample request shows the fuller schema above (brand_id, region_id, tracking configuration, and so on). The fuller schema is documented here as the field list since it reflects the actual sample payload.


PATCH /domain/update/:id
Partially updates an existing domain record. Only the fields included in the request body are updated; omitted fields remain unchanged.

Method
PATCH
Endpoint
{{base_url}}/domain/update/1
Authentication
Required. Bearer token in the Authorization header.


Path Parameters

Parameter
Type
Description
id
integer
The unique identifier of the domain to update.


Request Body (application/json)

Field
Type
Required
Description
open_tracking
boolean
-
Whether to enable open tracking.
click_tracking
boolean
-
Whether to enable click tracking.
tracking_subdomain
string
-
The subdomain used for tracking links.
tls
string
-
TLS enforcement setting for the domain (e.g., enforced).


Example Request Body



Response
200 OK with the updated domain object reflecting the applied changes.
Note: Field names differ slightly between the create and update payloads (enable_open_tracking versus open_tracking). Confirm with the backend team whether both naming conventions are accepted, or standardize on one before the frontend integration is finalized.

DELETE /domain/delete/:id
Permanently removes a domain record. Care should be taken to ensure the domain is not actively referenced by other entities before deletion, as this may cause data integrity issues.

Method
DELETE
Endpoint
{{base_url}}/domain/delete/5
Authentication
Required. Bearer token in the Authorization header.


Path Parameters

Parameter
Type
Description
id
integer
The unique identifier of the domain to delete.


Request Body: None.
Response
200 OK with a confirmation message indicating the domain was successfully deleted.


GET /domain/all
Returns a list of all domain records in the system. Useful for populating dropdowns, filters, or administrative views where a complete list of domains is needed.

Method
GET
Endpoint
{{base_url}}/domain/all
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Response
200 OK. Returns an array of domain objects, each including id, name, description, and other associated metadata.


GET /domain/get-one/:id
Fetches the details of a single domain record. Useful when the full details of one domain are needed without fetching the entire list.

Method
GET
Endpoint
{{base_url}}/domain/get-one/1
Authentication
Required. Bearer token in the Authorization header.




Path Parameters

Parameter
Type
Description
id
integer
The unique identifier of the domain to retrieve.


Request Body: None.
Response
200 OK with a single domain object. 404 Not Found if the domain does not exist.

Lookup
Lookup endpoints return read only reference data used to populate dropdown menus and to resolve the ID based fields referenced elsewhere in this document (for example, limits_id, reset_day_id, post_every_id, duration_id, stop_post_id, and region_id). All lookup endpoints are GET requests that take no request body and no query parameters.
SMTP Providers
Supported SMTP provider options (e.g., Gmail, Outlook, SendGrid, Mailgun) used to populate SMTP provider dropdowns.

Method
GET
Endpoint
{{base_url}}/lookup/smtp-providers
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "Gmail" }	



Security Protocols
Supported email security protocols (e.g., SSL, TLS, STARTTLS) used to populate security protocol dropdowns.

Method
GET
Endpoint
{{base_url}}/lookup/security-protocols
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "TLS" }	



Sending Limits
Predefined maximum email sending thresholds used to populate sending limit dropdowns.

Method
GET
Endpoint
{{base_url}}/lookup/sending-limits
Authentication
Required. Bearer token in the Authorization header.



Request Body: None.
Example Response Item
{ "id": 1, "name": "500 per day" }	



Day of Month
Valid day of month values (1 through 31) used for scheduling recurring campaigns or posts.

Method
GET
Endpoint
{{base_url}}/lookup/day-of-months
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "1" }	



Post Every
Posting frequency intervals (e.g., Daily, Weekly, Bi weekly, Monthly) used to populate a Post Every dropdown.

Method
GET
Endpoint
{{base_url}}/lookup/post-everies
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "Daily" }, { "id": 2, "name": "Weekly" }	



Duration
Duration values (e.g., 1 Month, 3 Months, 6 Months) used to populate campaign duration dropdowns.

Method
GET
Endpoint
{{base_url}}/lookup/durations
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.

Example Response Item
{ "id": 1, "name": "1 Month" }, { "id": 2, "name": "3 Months" }	



Stop Post After
Duration or count based thresholds used to determine when a recurring campaign should automatically stop.

Method
GET
Endpoint
{{base_url}}/lookup/durations
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "1 Month" }, { "id": 2, "name": "3 Months" }	
Note: This endpoint is documented with the same path as Duration (/lookup/durations) in the original specification. Confirm with the backend team whether Stop Post After should have its own dedicated path (for example, /lookup/stop-post-afters) or genuinely reuses the Duration lookup values.


Regions
Geographic regions (e.g., North America, Europe, Africa, Asia-Pacific) used for targeting or localization.

Method
GET
Endpoint
{{base_url}}/lookup/regions
Authentication
Required. Bearer token in the Authorization header.


Request Body: None.
Example Response Item
{ "id": 1, "name": "North America" }, { "id": 2, "name": "Europe" }	
