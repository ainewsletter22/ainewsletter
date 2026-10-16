import apiClient from "./apiClient";

export interface CreateAccountReviewAppealPayload {
    brand_or_company_website: string;
    website_clients_dump_email: string;
    what_company_does_and_for_whom: string;
    email_type_sent_or_plan: string;
    how_you_plan_to_use_ai_newsletter: string;
}

export const appealService = {
    async createAccountReviewAppeal(payload: CreateAccountReviewAppealPayload) {
        const response = await apiClient.post(
            "/account-review-appeal/create",
            payload,
        );

        return response.data;
    },
};
