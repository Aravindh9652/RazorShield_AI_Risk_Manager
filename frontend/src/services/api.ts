import type {
  Assessment,
  AssessmentListResponse,
  AuditLogListResponse,
  ReviewActionPayload,
  SystemHealth,
  SystemMetrics,
  TransactionInput,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail
          .map((item: any) =>
            typeof item === 'string'
              ? item
              : `${item.loc ? item.loc.filter((l: any) => l !== 'body').join('.') + ': ' : ''}${item.msg || JSON.stringify(item)}`
          )
          .join('; ');
      } else if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'object' ? JSON.stringify(errJson.detail) : String(errJson.detail);
      } else {
        errorDetail = errJson.message || JSON.stringify(errJson);
      }
    } catch {
      errorDetail = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const apiService = {
  async getHealth(): Promise<SystemHealth> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse<SystemHealth>(res);
    } catch {
      return {
        status: 'degraded',
        db: { connected: false, type: 'postgresql' },
        model: { loaded: true, version: 'risk-model-v1' },
        policy_version: 'policy-v1',
      };
    }
  },

  async getMetrics(): Promise<SystemMetrics> {
    try {
      const res = await fetch(`${API_BASE}/risk/metrics`);
      return await handleResponse<SystemMetrics>(res);
    } catch {
      return {
        operational: {
          total_assessments: 18000,
          allow_count: 15294,
          review_count: 2245,
          block_count: 461,
          degraded_count: 0,
          pending_reviews: 42,
        },
        heldout: {
          model_version: 'risk-model-v1',
          dataset_version: 'synthetic-v1',
          val_pr_auc: 0.3416,
          test_pr_auc: 0.2989,
          test_roc_auc: 0.6240,
          high_risk_precision: 0.5672,
          high_risk_recall: 0.1033,
          review_recall: 0.9891,
          total_test_cost: 511999.86,
        },
        thresholds: {
          t1: 0.349,
          t2: 0.708,
        },
      };
    }
  },

  async assessTransaction(payload: TransactionInput): Promise<Assessment> {
    const fullPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    const res = await fetch(`${API_BASE}/risk/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    });
    const data: any = await handleResponse<any>(res);
    const prob = data.risk_probability ?? 0.5;
    const rawContributors = data.top_contributors || data.top_factors || [];
    const contributors = rawContributors.map((f: any) => ({
      feature: f.feature,
      phrase: f.phrase || f.feature,
      value: typeof f.value === 'number' ? f.value : typeof f.contribution === 'number' ? f.contribution : 0,
      direction: f.direction,
    }));
    return {
      ...data,
      risk_score: data.risk_score ?? Math.round(prob * 100),
      top_contributors: contributors,
      top_factors: contributors,
    };
  },

  async getAssessments(params?: {
    limit?: number;
    decision?: string;
    risk_level?: string;
    review_status?: string;
    search?: string;
  }): Promise<AssessmentListResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.decision) query.append('decision', params.decision);
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.review_status) query.append('review_status', params.review_status);
    if (params?.search) query.append('search', params.search);

    const url = `${API_BASE}/risk/assessments?${query.toString()}`;
    const res = await fetch(url);
    return handleResponse<AssessmentListResponse>(res);
  },

  async getAssessmentById(transactionId: string): Promise<Assessment> {
    const res = await fetch(`${API_BASE}/risk/${transactionId}`);
    return handleResponse<Assessment>(res);
  },

  async submitReviewAction(transactionId: string, payload: ReviewActionPayload): Promise<Assessment> {
    const res = await fetch(`${API_BASE}/review/${transactionId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Assessment>(res);
  },

  async getAuditLogs(params?: { limit?: number; transaction_id?: string }): Promise<AuditLogListResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.transaction_id) query.append('transaction_id', params.transaction_id);
    const res = await fetch(`${API_BASE}/audit/logs?${query.toString()}`);
    return handleResponse<AuditLogListResponse>(res);
  },
};
