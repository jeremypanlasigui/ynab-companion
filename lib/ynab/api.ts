/**
 * YNAB API Client
 * Wraps YNAB REST endpoints according to OpenAPI 3.1.1 (v1.87.0)
 */

import {
  PlanSummary,
  Account,
  CategoryGroup,
  Category,
  TransactionDetail,
  NewTransaction,
} from "./types";

export class YNABApiClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl = "https://api.ynab.com/v1") {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `YNAB API Error: ${res.status} ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson?.error?.detail) {
          errorMessage = errorJson.error.detail;
        }
      } catch {
        // Fallback to text
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    return data.data as T;
  }

  /**
   * Get user's plans/budgets
   */
  async getPlans(): Promise<{ plans: PlanSummary[]; default_plan?: PlanSummary }> {
    return this.request<{ plans: PlanSummary[]; default_plan?: PlanSummary }>("/plans");
  }

  /**
   * Get complete details of a single plan (including accounts, categories, etc.)
   */
  async getPlan(planId: string, lastKnowledgeOfServer?: number): Promise<{
    plan: {
      id: string;
      name: string;
      last_modified_on: string;
      accounts: Account[];
      categories: Category[];
      category_groups: CategoryGroup[];
      transactions?: TransactionDetail[];
    };
    server_knowledge: number;
  }> {
    const query = lastKnowledgeOfServer ? `?last_knowledge_of_server=${lastKnowledgeOfServer}` : "";
    return this.request<{
      plan: any;
      server_knowledge: number;
    }>(`/plans/${planId}${query}`);
  }

  /**
   * Get accounts for plan
   */
  async getAccounts(planId: string): Promise<{ accounts: Account[]; server_knowledge: number }> {
    return this.request<{ accounts: Account[]; server_knowledge: number }>(`/plans/${planId}/accounts`);
  }

  /**
   * Get categories and category groups for plan
   */
  async getCategories(planId: string): Promise<{
    category_groups: (CategoryGroup & { categories: Category[] })[];
    server_knowledge: number;
  }> {
    return this.request<{
      category_groups: (CategoryGroup & { categories: Category[] })[];
      server_knowledge: number;
    }>(`/plans/${planId}/categories`);
  }

  /**
   * Get transactions for plan
   */
  async getTransactions(
    planId: string,
    options?: { since_date?: string; lastKnowledgeOfServer?: number }
  ): Promise<{ transactions: TransactionDetail[]; server_knowledge: number }> {
    const params = new URLSearchParams();
    if (options?.since_date) params.append("since_date", options.since_date);
    if (options?.lastKnowledgeOfServer) {
      params.append("last_knowledge_of_server", String(options.lastKnowledgeOfServer));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<{ transactions: TransactionDetail[]; server_knowledge: number }>(
      `/plans/${planId}/transactions${query}`
    );
  }

  /**
   * Create a single transaction
   */
  async createTransaction(
    planId: string,
    transaction: NewTransaction
  ): Promise<{ transaction: TransactionDetail; server_knowledge: number }> {
    return this.request<{ transaction: TransactionDetail; server_knowledge: number }>(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({ transaction }),
      }
    );
  }

  /**
   * Update category budgeted amount for a given month
   */
  async updateCategoryBudget(
    planId: string,
    month: string,
    categoryId: string,
    budgetedMilliunits: number
  ): Promise<{ category: Category; server_knowledge: number }> {
    return this.request<{ category: Category; server_knowledge: number }>(
      `/plans/${planId}/months/${month}/categories/${categoryId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          category: {
            budgeted: budgetedMilliunits,
          },
        }),
      }
    );
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(
    planId: string,
    transactionId: string
  ): Promise<{ transaction: TransactionDetail; server_knowledge: number }> {
    return this.request<{ transaction: TransactionDetail; server_knowledge: number }>(
      `/plans/${planId}/transactions/${transactionId}`,
      {
        method: "DELETE",
      }
    );
  }
}
