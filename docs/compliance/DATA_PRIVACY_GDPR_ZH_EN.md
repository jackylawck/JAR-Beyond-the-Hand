# Data Privacy, Zero-Retention & GDPR Compliance Statement
# 數據隱私、零保留架構與 GDPR/PIPL 合規聲明

---

## 1. Core Principles / 核心架構原則

| Compliance Framework / 監管框架 | Status / 狀態 | Architecture Implementation / 架構實作 |
|---|---|---|
| **EU General Data Protection Regulation (GDPR)** | **100% Compliant** | Zero-Server Processing / No Tracking Cookies |
| **HK Personal Data (Privacy) Ordinance (PDPO Cap. 486)** | **100% Compliant** | No Personal Identifiable Information (PII) Collected |
| **PRC Personal Information Protection Law (PIPL)** | **100% Compliant** | No Cross-border Data Transmission (零跨境傳輸) |

---

## 2. Technical Safeguards / 技術安全保障

### 2.1 Zero-Server & Client-Side Local Execution (純前端本地運算)
- **No Remote Telemetry Storage**: All dynamic kinematic calculations, FFT frequency data, and CSV generation occur exclusively within the user's local browser memory (RAM via WebGL & Web Audio APIs).
- **No Backend Logging**: The application operates without a backend database or user profiling infrastructure. No IP addresses, device identifiers, or tracking fingerprints are logged or transmitted.

### 2.2 CSV Export Security (導出數據安全性)
- **Formula Injection Mitigation**: All generated CSV telemetry streams implement string sanitization (prepending safe escaping to fields starting with `=`, `+`, `-`, `@`, `\t`, `\r`) to prevent spreadsheet calculation injection attacks upon local download.

---

## 3. 中文說明

本模擬器採用**純前端沙盒架構（Zero-Server Architecture）**：
1. **無個人私隱收集**：系統不設任何用戶帳號、不寫入跨站追蹤 Cookie、不收集任何生物特徵或個人身份識別資訊（PII）。
2. **無數據跨境傳輸**：所有 6-DoF 關節遙測、震動頻譜計算與 CSV 導出完全在用戶終端瀏覽器本地記憶體內即時完成，不會上傳至任何遠端伺服器。
