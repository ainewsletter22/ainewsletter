import type { FooterSettings } from "../types/Types";

/**
 * Generates the forced footer HTML for emails based on brand footer settings
 * The footer is appended to all emails regardless of template design
 */
export function generateEmailFooter(
  footerSettings: FooterSettings,
  sendType: "campaign" | "broadcast",
  logoUrl?: string
): string {
  const { unsubscribeText, companyName, address, cityStateZip, removeBadge } = footerSettings;

  // Determine the unsubscribe link based on send type
  const unsubscribeLink = sendType === "campaign"
    ? "{{unsubscribe_url}}"
    : "{{{RESEND_UNSUBSCRIBE_URL}}}";

  // Replace "unsubscribe" word with link (case-insensitive)
  const unsubscribeTextWithLink = unsubscribeText.replace(
    /unsubscribe/gi,
    `<a href="${unsubscribeLink}" style="color: #2563eb; text-decoration: underline;">unsubscribe</a>`
  );

  // Generate AI badge HTML
  const aiBadgeHtml = !removeBadge && logoUrl
    ? `
    <div style="margin-top: 16px; text-align: center;">
      <span style="display: inline-block; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #2563eb; background: transparent; padding: 4px 12px; border-radius: 9999px; border: 1px solid #3b82f6;">
        Powered by
        <span style="display: inline-block; vertical-align: middle; width: 16px; height: 16px; border-radius: 4px; color: white; font-size: 9px; font-weight: bold; line-height: 16px; text-align: center;">
          <img src="${logoUrl}" alt="" style="width: 100%; height: 100%; display: block;" />
        </span>
        <span style="color: black;">Ai Newsletter</span>
      </span>
    </div>
    `
    : "";

  // Generate the complete footer HTML
  const footerHtml = `
    <div style="border-radius: 16px; background-color: #eff6ff; padding: 16px; margin-top: 32px;">
      <div style="border-top: 1px solid #dbeafe; margin: 12px 0;"></div>
      <div style="text-align: center; font-size: 12px; color: #374151; line-height: 1.5; white-space: pre-line;">
        ${unsubscribeTextWithLink}
      </div>
      <div style="text-align: center; font-size: 12px; color: #374151; line-height: 1.5; margin-top: 12px;">
        ${companyName}<br />
        ${address}<br />
        ${cityStateZip}
      </div>
      ${aiBadgeHtml}
    </div>
  `;

  return footerHtml;
}

/**
 * Appends the forced footer to the email HTML
 * Removes any existing footer before adding the new one to ensure brand settings are always current
 */
export function appendFooterToEmail(
  emailHtml: string,
  footerSettings: FooterSettings,
  sendType: "campaign" | "broadcast",
  logoUrl?: string
): string {
  // Remove any existing footer by looking for the unique marker
  // We use the "border-radius: 16px; background-color: #eff6ff" as a marker since it's unique to our footer
  const footerStartMarker = '<div style="border-radius: 16px; background-color: #eff6ff';
  
  let htmlWithoutFooter = emailHtml;
  
  // Find and remove the existing footer
  const footerStartIndex = htmlWithoutFooter.indexOf(footerStartMarker);
  if (footerStartIndex !== -1) {
    
    // Find the closing div of the footer
    // Start depth at 1 since we're already inside the footer div
    let depth = 1;
    let footerEndIndex = footerStartIndex;
    for (let i = footerStartIndex + footerStartMarker.length; i < htmlWithoutFooter.length; i++) {
      if (htmlWithoutFooter.substring(i, i + 4) === '<div') {
        depth++;
      } else if (htmlWithoutFooter.substring(i, i + 6) === '</div>') {
        depth--;
        if (depth === 0) {
          footerEndIndex = i + 6;
          break;
        }
      }
    }
    htmlWithoutFooter = htmlWithoutFooter.substring(0, footerStartIndex) + htmlWithoutFooter.substring(footerEndIndex);
  }
  
  const footerHtml = generateEmailFooter(footerSettings, sendType, logoUrl);
  
  // Close any open body/html tags and append footer
  let htmlWithFooter = htmlWithoutFooter;
  
  // If the HTML ends with </body> or </html>, insert before them
  if (htmlWithFooter.trim().endsWith('</body>')) {
    htmlWithFooter = htmlWithFooter.replace('</body>', `${footerHtml}</body>`);
  } else if (htmlWithFooter.trim().endsWith('</html>')) {
    htmlWithFooter = htmlWithFooter.replace('</html>', `${footerHtml}</html>`);
  } else {
    // Just append at the end
    htmlWithFooter = htmlWithFooter + footerHtml;
  }
  
  return htmlWithFooter;
}
