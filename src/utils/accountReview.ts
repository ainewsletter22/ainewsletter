const ACCOUNT_REVIEW_STORAGE_KEY = "ingage_account_review_required";

export function getAccountReviewRequired(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(ACCOUNT_REVIEW_STORAGE_KEY) === "true";
}

export function setAccountReviewRequired(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCOUNT_REVIEW_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent("ingage-account-review-change", { detail: enabled }));
}
