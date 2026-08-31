# RazorShield — Explainable AI Risk Manager for Merchants

> **Submission for Razorpay AI Buildathon — Track 02 (AI Risk Manager)**  
> **Repository Status**: Final Release Verified • 21/21 Automated Tests Passing

---

## Executive Summary

**RazorShield** is a scientifically defensible, end-to-end explainable transaction fraud risk management platform designed for merchant protection. It evaluates incoming digital payment requests using a trained **Random Forest** risk model, computes local **SHAP** feature attributions ("Top model contributors"), routes transactions through deterministic cost-optimized policy boundaries, logs immutable audit events, and provides a fail-safe **REVIEW** degraded mode in the event of infrastructure or model disruption.

---

## Track Alignment & Core Requirements

| Requirement | Implementation Status | Technical Details |
| :--- | :---: | :--- |
| **Working Risk Detector** | PASS | Online FastAPI REST service running at `/api/v1/risk/assess` |
| **Real ML Model** | PASS | Scikit-learn Random Forest Classifier (`risk-model-v1.joblib`) |
| **Precision & Recall** | PASS | High-risk precision: **56.72%**; Review recall: **98.91%** |
| **Held-Out Test Set** | PASS | Single-pass evaluation on 2,700 temporal holdout transactions |
| **False-Positive Cost** | PASS | Cost-based threshold optimization (₹511,999.86 test decision cost) |
| **Defense-Only Policy** | PASS | Fail-safe degraded mode defaults to `REVIEW` (zero silent auto-approvals) |
| **Explainable Predictions**| PASS | Local SHAP factor attributions ("Top model contributors") |
| **Auditability** | PASS | Immutable PostgreSQL audit event logging |
| **PostgreSQL Integration** | PASS | PostgreSQL 16 via SQLAlchemy 2.0 and `psycopg` 3 |
| **Reproducibility** | PASS | Centralized random seed (`seed=42`) and executable ML scripts |

---

## System Architecture

```text
[ Incoming Payment Request ]
           │
           ▼
[ FastAPI Gateway (/api/v1/risk/assess) ]
           │
           ├──► [ Health & Model Registry Check ] ──(If Unavailable)──► [ Degraded Mode: REVIEW ]
           │
           ▼
[ Temporal Feature Extractor ] ◄── (Past-Only Aggregations, No Future Leakage)
           │
           ▼
[ Random Forest Model (v1) ] ────► Computes Probability p ∈ [0, 1] & Risk Score (0-100)
           │
           ├──► [ SHAP TreeExplainer ] ──► Calculates Top Model Contributors
           │
           ▼
[ Deterministic Risk Policy Engine ]
   ├── p < 0.349        ──► ALLOW  (Low Operational Risk)
   ├── 0.349 ≤ p < 0.708 ──► REVIEW (Uncertainty Zone → Manual Queue)
   └── p ≥ 0.708        ──► BLOCK  (High Risk & Amount ≥ ₹25,000)
           │
           ▼
[ Audit Trail Logger ] ──► Writes Immutable Event to PostgreSQL
           │
           ▼
[ Analyst React Dashboard ] (Vite + TypeScript + Tailwind CSS)
```

---

## Data Pipeline & Leakage Prevention

- **Dataset Volume**: 18,000 synthetic transactions across 1,800 customers, 90 merchants, and 2,240 devices over 120 days.
- **Embedded Risk Scenarios**: 10 controlled fraud patterns including high velocity bursts, amount deviations, new device bursts, failed attempt spikes, suspicious IP/country risk, and prior chargebacks.
- **Strict Temporal Splitting**:
  - **Training Set (70%)**: 12,600 transactions (Fraud rate: 15.21%)
  - **Validation Set (15%)**: 2,700 transactions (Fraud rate: 15.63%)
  - **Held-Out Test Set (15%)**: 2,700 transactions (Fraud rate: 13.63%)
- **Data Leakage Guards**: Feature extraction enforces `assert_no_leakage_columns` to guarantee `fraud_label` is stripped. Aggregations append the current transaction to history *after* decision evaluation.

---

## Model Selection & Threshold Optimization

### Model Comparison (Validation Set)

| Model | Precision (@0.5) | Recall (@0.5) | F1 (@0.5) | ROC-AUC | PR-AUC (Primary) | Validation Cost |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Random Forest** | **0.4392** | **0.3507** | **0.3900** | **0.6325** | **0.3416** | **₹505,195.15** |
| **Logistic Regression** | 0.3091 | 0.4028 | 0.3498 | 0.6307 | 0.3245 | ₹534,120.40 |
| **XGBoost** | 0.2749 | 0.4123 | 0.3299 | 0.3153 | ₹549,810.00 |

### Operating Boundaries (Selected on Validation Set Only)
- $t_1 = 0.349$ (**REVIEW Boundary**): Captures **98.91%** of fraudulent transactions into manual analyst queues.
- $t_2 = 0.708$ (**HIGH / BLOCK Boundary**): Achieves **56.72%** precision for instant auto-blocks, minimizing false-positive merchant friction.

---

## Held-Out Test Evaluation Results

> Evaluated **EXACTLY ONCE** on the held-out test set post-selection.

- **Validation PR-AUC**: `0.3416`
- **Held-Out Test PR-AUC**: `0.2989`
- **Held-Out Test ROC-AUC**: `0.6240`
- **High-Risk Precision ($t_2 = 0.708$)**: `56.72%`
- **High-Risk Recall ($t_2 = 0.708$)**: `10.33%`
- **Review Fraud Recall ($t_1 = 0.349$)**: `98.91%`
- **Confusion Matrix ($t_2$)**: `TN: 2303, FP: 29, FN: 330, TP: 38`
- **Total Test Decision Cost**: `₹511,999.86` (₹189.63 / transaction)

---

## Explainability (SHAP)

SHAP TreeExplainer generates per-transaction factor attributions formatted into human-readable domain phrases:
- *Increased Risk Contribution*: `↑ Previous chargebacks on customer (+18.3%)`, `↑ Failed payment attempts in 24h (+14.3%)`, `↑ IP risk score (+9.2%)`.
- *Decreased Risk Contribution*: `↓ Customer account age (-9.2%)`, `↓ High prior customer history score (-9.0%)`.

---

## API Reference

- `GET  /api/v1/health`: System health reporting database and model registry status.
- `GET  /api/v1/risk/metrics`: Operational counters alongside held-out test metrics.
- `POST /api/v1/risk/assess`: Transaction risk assessment with ML inference & SHAP factors.
- `GET  /api/v1/risk/assessments`: Filterable list of transaction risk assessments.
- `GET  /api/v1/risk/{transaction_id}`: Detail view of individual transaction risk assessment.
- `POST /api/v1/review/{transaction_id}/action`: Submit analyst review action (`approve`, `reject`, `mark_reviewed`).
- `GET  /api/v1/audit/logs`: Immutable audit log timeline.

---

## Installation & Local Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Docker & Docker Compose (Optional for containerized PostgreSQL)

### 1. Backend Setup
```bash
# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend API server
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Automated Tests
```bash
.venv\Scripts\pytest -v tests/
```

### 4. Run Full Docker Containerized Stack
```bash
docker compose up --build
```

---

## Demo Story & Walkthrough

1. **Executive Overview**: Open `http://localhost:3000/`. Review real-time KPIs, risk level distribution charts, and synthetic time-series activity.
2. **Live Risk Monitor**: Navigate to `/monitor`. Search and filter transactions by risk level (`LOW`, `MEDIUM`, `HIGH`) and policy action.
3. **Transaction Assessor**: Navigate to `/assess`. Click *"High Risk Velocity Burst"* preset and hit *"Assess Transaction Risk"*. Inspect the returned `BLOCK` decision and SHAP factor attribution breakdown.
4. **Analyst Review Queue**: Navigate to `/reviews`. Select a transaction in `REVIEW` status, open the slide-over drawer, and click *"Approve Txn"*.
5. **Audit Trail**: Navigate to `/audit` to verify the reviewer's action has been logged into the immutable audit record.
6. **Model & Metrics**: Navigate to `/metrics` to view model transparency metrics, threshold cost curves, and confusion matrices.
7. **System Health**: Navigate to `/health` to verify all component services are operational.

---

## Limitations & Disclaimers

- **Synthetic Data**: Transactions and customer histories are synthetically generated for demonstration and reproducible benchmark evaluation.
- **Illustrative Business Costs**: Decision cost parameters (₹120 review cost, ₹400 block cost, ₹80 friction cost) represent illustrative synthetic business assumptions and do not reflect Razorpay's proprietary economic data.
- **Held-Out Evaluation**: All test set metrics are based on single-pass temporal holdout evaluation and are locked to preserve scientific defensibility.
