import type { SendVia } from "../types/Types";
import type { Category } from "../types/domain";

export interface BroadcastValidationError {
  type: "too_many_categories" | "category_too_large" | "general";
  message: string;
  categoryId?: number;
  categoryCount?: number;
  categorySize?: number;
}

export interface BroadcastValidationResult {
  isValid: boolean;
  errors: BroadcastValidationError[];
}

/**
 * Validates client category selection for broadcast mode
 * 
 * Broadcast Mode Rules:
 * - Max 3 categories per send
 * - Max 250,000 clients per category
 * 
 * @param selectedCategoryIds - Array of selected category IDs
 * @param categories - Array of all available categories with counts
 * @param sendVia - Current send mode
 * @returns Validation result with errors if any
 */
export function validateBroadcastSelection(
  selectedCategoryIds: number[],
  categories: Category[],
  sendVia?: SendVia
): BroadcastValidationResult {
  // If not in broadcast mode, no validation needed
  if (sendVia !== "broadcast") {
    return { isValid: true, errors: [] };
  }

  const errors: BroadcastValidationError[] = [];

  // Rule 1: Max 3 categories
  if (selectedCategoryIds.length > 3) {
    errors.push({
      type: "too_many_categories",
      message: `Broadcast mode allows maximum 3 categories. You selected ${selectedCategoryIds.length}.`,
      categoryCount: selectedCategoryIds.length,
    });
  }

  // Rule 2: Max 250k clients per category
  const MAX_CLIENTS_PER_CATEGORY = 250000;
  
  for (const categoryId of selectedCategoryIds) {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.count && category.count > MAX_CLIENTS_PER_CATEGORY) {
      errors.push({
        type: "category_too_large",
        message: `Category "${category.name}" has ${category.count.toLocaleString()} clients. Maximum allowed is 250,000.`,
        categoryId,
        categorySize: category.count,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gets a user-friendly error message from validation errors
 */
export function getValidationErrorMessage(result: BroadcastValidationResult): string {
  if (result.isValid) return "";
  
  if (result.errors.length === 1) {
    return result.errors[0].message;
  }
  
  // Multiple errors - combine them
  const messages = result.errors.map(e => e.message);
  return `Multiple issues:\n${messages.map(m => `• ${m}`).join("\n")}`;
}
