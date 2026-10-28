import apiClient from "./apiClient";

export interface Plan {
    id: number;
    name: string;
    description: string;
    status: number;
    createdAt: string;
    updatedAt: string;
}

export interface UserPlan {
    id: number;
    name: string;
    description: string;
}

export interface UpdatedUser {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    other_name: string | null;
    plan_id: number;
    role_id: number;
    Plan: UserPlan;
}

interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    description: string;
    data: T;
}

export const plansService = {
    async getPlans(): Promise<Plan[]> {
        const response =
            await apiClient.get<ApiResponse<Plan[]>>("/plan/get-all");
        return response.data.data;
    },

    async updateUserPlan(
        userId: number | string,
        planId: number,
    ): Promise<UpdatedUser> {
        const response = await apiClient.put<ApiResponse<UpdatedUser>>(
            `/user/edit/${userId}`,
            { plan_id: planId },
        );
        return response.data.data;
    },
};
