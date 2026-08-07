/**
 * ═════════════════════════════════════════════════════════════════════════════
 * Phase 2 API Services - Usage Guide
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * All services follow the same pattern:
 * 1. Import the service: import { brandService } from '@/services/brandService'
 * 2. Call async function: const result = await brandService.listBrands()
 * 3. apiClient handles auth header + token refresh automatically
 * 4. Response extraction happens inside service (response.data.data)
 * 5. Services DON'T update Zustand stores (UI components do that)
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─── BRAND SERVICE ──────────────────────────────────────────────────────────

import { brandService } from '@/services/brandService';

// List all brands
const brands = await brandService.listBrands();

// Get single brand
const brand = await brandService.getBrand(1);

// Create brand (with or without logo file)
const newBrand = await brandService.createBrand({
  name: 'My Newsletter',
  fromName: 'John Doe',
  fromEmail: 'hello@newsletter.com',
  replyToEmail: 'reply@newsletter.com',
  logo: logoFileInput.files?.[0], // optional File object
});

// Update brand identity
const updated = await brandService.updateBrandIdentity(1, {
  name: 'Updated Name',
  fromName: 'Jane Doe',
});

// Update privacy settings
await brandService.updatePrivacySettings(1, {
  track_opens: true,
  track_clicks: true,
  set_campaign_notif: false,
});

// Update sending limit
await brandService.updateSendingLimit(1, {
  sending_limit: 'Monthly Limit',
  number_email_per_month: 1000,
  reset_day_id: 1, // lookup ID
});

// Update footer
await brandService.updateFooterSettings(1, {
  unsuscribe_information: '123 Main St, City, ST 12345', // typo in API
  newsletter_badge: true,
});

// Delete brand
await brandService.deleteBrand(1);

// ─── DOMAIN SERVICE ─────────────────────────────────────────────────────────

import { domainService } from '@/services/domainService';

// List all domains
const domains = await domainService.listDomains();

// Get single domain
const domain = await domainService.getDomain(5);

// Create domain
const newDomain = await domainService.createDomain({
  brand_id: 1,
  name: 'newsletter.example.com',
  region_id: 2, // lookup ID
  enable_open_tracking: false, // optional
  enable_click_tracking: false, // optional
});

// Update domain (⚠️ Different field names than create!)
await domainService.updateDomain(5, {
  open_tracking: true,  // NOT enable_open_tracking
  click_tracking: true, // NOT enable_click_tracking
  tls: 'TLS1.2',
});

// Delete domain
await domainService.deleteDomain(5);

// Create domain and poll for DNS verification (helper)
const { domain: createdDomain, verified } = await domainService.createAndPollDomain(
  {
    brand_id: 1,
    name: 'newsletter.example.com',
    region_id: 2,
  },
  10,    // max attempts
  2000   // delay between attempts (ms)
);

// ─── SMTP SERVICE ──────────────────────────────────────────────────────────

import { smtpService } from '@/services/smtpService';

// Get SMTP settings
const smtp = await smtpService.getSMTPSettings(3);

// Create SMTP settings
// ⚠️ Schema unclear - backend will clarify which fields to use
const newSmtp = await smtpService.createSMTPSettings({
  host: 'smtp.gmail.com',
  port: 587,
  username: 'user@gmail.com',
  password: 'app-password',
  encryption: 'tls', // ssl | tls | none
  from_email: 'hello@newsletter.com',
  from_name: 'My Newsletter',
});

// Update SMTP settings
await smtpService.updateSMTPSettings(3, {
  password: 'new-password',
  from_name: 'Updated Name',
});

// Delete SMTP settings
await smtpService.deleteSMTPSettings(3);

// Test SMTP connection (if endpoint exists)
const testResult = await smtpService.testSMTPConnection({
  host: 'smtp.gmail.com',
  port: 587,
  username: 'user@gmail.com',
  password: 'app-password',
  encryption: 'tls',
  from_email: 'hello@newsletter.com',
});

// ─── LOOKUP SERVICE ────────────────────────────────────────────────────────

import { lookupService } from '@/services/lookupService';

// Individual lookups (with caching)
const regions = await lookupService.getRegions();
const smtpProviders = await lookupService.getSMTPProviders();
const securityProtocols = await lookupService.getSecurityProtocols();
const sendingLimits = await lookupService.getSendingLimits();
const dayOfMonths = await lookupService.getDayOfMonths();
const postEveries = await lookupService.getPostEveries();
const durations = await lookupService.getDurations();
const stopPostAfters = await lookupService.getStopPostAfters(); // fallback to durations if 404

// Fetch all lookups in parallel (best for app initialization)
const allLookups = await lookupService.getAllLookups();
// Returns: { regions, smtpProviders, securityProtocols, sendingLimits, dayOfMonths, postEveries, durations, stopPostAfters }

// Cache management
lookupService.clearCache(); // clear all
lookupService.clearCacheForEndpoint('regions'); // clear specific

// ═════════════════════════════════════════════════════════════════════════════
// INTEGRATION WITH EXISTING COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

// BrandsPage.tsx example:
import { brandService } from '@/services/brandService';
import { domainService } from '@/services/domainService';

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const loadBrands = async () => {
      const data = await brandService.listBrands(); // ← Replace mock call
      setBrands(data);
    };
    loadBrands();
  }, []);

  const handleAddDomain = async (name: string, region: string) => {
    // Find region ID from region name (need lookup data first)
    const domain = await domainService.createDomain({
      brand_id: activeBrand.id,
      name,
      region_id: lookupRegionIdByName(region),
    });
    return domain;
  };

  // Similar patterns for handleVerifyDomain, handleSaveSmtp, etc.
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXT STEPS FOR FULL INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 1. Create useLookupData hook to fetch + cache lookups at app startup
 *    - Call lookupService.getAllLookups() once on App mount
 *    - Store in Zustand lookupStore or React Context
 *    - Components access via hook: const lookups = useLookupData()
 * 
 * 2. Update BrandsPage.tsx handlers
 *    - Replace mock brandService calls with real brandService calls
 *    - Replace mock domainService calls with real domainService calls
 *    - Replace mock smtpService calls with real smtpService calls
 *    - No UI changes needed (function signatures match)
 * 
 * 3. Wire components to form handlers
 *    - AddDomainSection: call domainService.createDomain() + .deleteDomain()
 *    - SmtpSettingsSection: call smtpService.createSMTPSettings() + .updateSMTPSettings()
 *    - PrivacySection: call brandService.updatePrivacySettings()
 *    - SendingLimitSection: call brandService.updateSendingLimit()
 *    - FooterSettingsSection: call brandService.updateFooterSettings()
 * 
 * 4. Handle field transformations (camelCase ↔ snake_case)
 *    - Services already handle this in payloads
 *    - Components pass camelCase, services convert to snake_case
 *    - API responses auto-convert back (or manually map if needed)
 * 
 * 5. Confirm with backend team
 *    - Field name mismatches (see CRITICAL ISSUES in phase2-api-fields-mapping.md)
 *    - JWT vs Bearer header format
 *    - SMTP schema (free text vs lookup IDs)
 *    - multipart/form-data for logo upload
 * 
 * 6. Test error handling
 *    - 400 errors (validation failures)
 *    - 401 errors (token refresh)
 *    - 404 errors (resource not found)
 *    - 500 errors (server errors)
 */
