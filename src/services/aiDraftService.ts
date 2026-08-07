export interface AiDraftResponse {
  subject: string;
  preview: string;
  body: string;
}

export interface AiDraftPayload {
  headline?: string;
  description?: string;
  productLink?: string;
  brandName?: string;
}

export const aiDraftService = {
  async generateDraft(payload: AiDraftPayload): Promise<AiDraftResponse> {
    console.log('[aiDraftService] generateDraft payload', payload);

    await new Promise((resolve) => window.setTimeout(resolve, 400));

    const subject = payload.headline?.trim() || 'AI generated newsletter';
    const preview = payload.description?.trim() || 'A polished update for your audience';
    const body = `
      <h2>${subject}</h2>
      <p>${preview}</p>
      ${payload.productLink ? `<p><a href="${payload.productLink}">Learn more</a></p>` : ''}
    `;

    const response = { subject, preview, body };
    console.log('[aiDraftService] generateDraft response', response);
    return response;
  },
};
