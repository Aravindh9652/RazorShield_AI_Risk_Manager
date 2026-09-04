export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Decision = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'reviewed';

export interface TopContributor {
  feature: string;
  phrase: string;
  value: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface TransactionInput {
  transaction_id: string;
  merchant_id: string;
  customer_id: string;
  device_id: string;
  amount: number;
  currency: string;
  timestamp?: string;
  payment_method: string;
  merchant_category: string;
  customer_account_age_days: number;
  device_age_days: number;
  new_device: number;
  transaction_count_1h: number;
  transaction_count_24h: number;
  amount_sum_24h: number;
  customer_avg_amount: number;
  amount_deviation: number;
  failed_attempts_24h: number;
  customer_transaction_count: number;
  previous_chargebacks: number;
  location_distance_from_previous: number;
  ip_risk_score: number;
  country_risk_score: number;
  account_velocity: number;
  customer_history_score: number;
  transaction_hour?: number;
  is_weekend?: number;
}

export interface Assessment {
  assessment_id: string;
  transaction_id: string;
  merchant_id: string;
  customer_id: string;
  device_id?: string;
  amount: number;
  currency: string;
  timestamp: string;
  payment_method: string;
  merchant_category: string;
  risk_score: number;
  risk_probability: number;
  risk_level: RiskLevel;
  decision: Decision;
  degraded: boolean;
  degraded_reason?: string | null;
  explanation_status: string;
  top_contributors: TopContributor[];
  policy_applied: string;
  duplicate: boolean;
  review_status?: ReviewStatus;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
}

export interface AssessmentListResponse {
  total: number;
  items: Assessment[];
}

export interface AuditLog {
  id: string | number;
  event_type: string;
  transaction_id?: string;
  assessment_id?: string;
  actor?: string;
  action?: string;
  payload?: Record<string, any>;
  details?: Record<string, any>;
  timestamp?: string;
  created_at?: string;
}

export interface AuditLogListResponse {
  total: number;
  items: AuditLog[];
}

export interface SystemHealth {
  status: 'ok' | 'healthy' | 'degraded' | 'unavailable';
  db: { connected?: boolean; type?: string } | string;
  model: { loaded?: boolean; version?: string } | string;
  model_version?: string;
  policy_version?: string;
  time?: string;
}

export interface SystemMetrics {
  operational: {
    total_assessments: number;
    allow_count: number;
    review_count: number;
    block_count: number;
    degraded_count: number;
    pending_reviews: number;
  };
  heldout: {
    model_version: string;
    dataset_version: string;
    val_pr_auc: number;
    test_pr_auc: number;
    test_roc_auc: number;
    high_risk_precision: number;
    high_risk_recall: number;
    review_recall: number;
    total_test_cost: number;
  };
  thresholds: {
    t1: number;
    t2: number;
  };
}

export interface ReviewActionPayload {
  action: 'approve' | 'reject' | 'mark_reviewed';
  actor: string;
  note?: string;
}
