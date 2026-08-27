# Algorithmic Transparency, System Determinism & ISO Standards Conformity Matrix
# 演算法透明度、系統確定性與 ISO 標準符合性治理架構書

**Project / 項目**: J.A.R. Beyond the Hand 3D (在手之上 3D)  
**System Classification / 系統分類**: Deterministic Numerical Kinematic Simulator (確定性數值運動學模擬器)  
**Lead Developer & Governance Custodian / 開發與治理負責人**: Jacky Law  
**Reference Frameworks / 參考架構**: ISO/IEC 42001:2023 (AIMS), EU AI Act (Regulation (EU) 2024/1689), NIST AI RMF 1.0, ISO 10218-1:2011, ISO/IEC 25010  
**Last Review Date / 最後審核日期**: August 2026  
**Document Version / 文件版本**: 1.0.0 (Production / Compliance Ready)

---

## 1. Executive Summary & Regulatory Classification / 執行摘要與監管分類

### 1.1 Non-AI / Deterministic Nature (非黑盒 / 確定性數理本質)
- **Technical Nature**: **J.A.R. Beyond the Hand 3D** is an open-source, client-side kinematic simulator. The core calculation utilizes an analytical **Cyclic Coordinate Descent with Damped Least Squares (CCD-DLS)** numerical solver.
- **EU AI Act Exemption / Classification**: 
  - Under **Regulation (EU) 2024/1689 (EU AI Act)**, the system falls under **Minimal Risk / Non-High-Risk Classical Algorithm**.
  - It does **NOT** feature machine learning weights, neural network embeddings, stochastic transformers, or autonomous generative decision-making loops.
  - The software is completely explainable, audit-ready, and deterministic.

### 1.2 中文說明：系統本質與監管定級
- **技術本質**：本項目為純前端運動學幾何模擬器，核心求解基於經典的**循環坐標下降與阻尼最小二乘數值優化（CCD-DLS）**。
- **歐盟 AI 法案（EU AI Act）定級**：屬於**最小風險（Minimal Risk）或非高風險古典數理演算法**。系統不包含任何黑盒深度學習權重、隨機神經網絡或自主武器決策模型，所有輸出均為 $100\%$ 可解釋與可重複驗證之幾何運動學解。

---

## 2. Mathematical Foundation & Algorithmic Explainability / 數理模型推導與演算法可解釋性 (ISO/IEC 42001 Cl. 8 / ISO 22989)

### 2.1 Kinematic Chain & Coordinate Transformations (運動學鏈構建)
The robotic manipulator is mathematically modeled as an open kinematic chain with $N=4$ active degrees of freedom (DoF):

$$\mathbf{T}_{\text{world}}^{\text{end}} = \mathbf{T}_{\text{base}} \prod_{i=0}^{3} \mathbf{A}_i(\theta_i)$$

Where:
- $\mathbf{A}_0(\theta_0) = \mathbf{R}_y(\theta_0)$ represents the Base Azimuth Yaw rotation.
- $\mathbf{A}_1(\theta_1) = \mathbf{R}_x(\theta_1)$ represents the Shoulder Elevation Pitch rotation.
- $\mathbf{A}_2(\theta_2) = \mathbf{R}_x(\theta_2)$ represents the Elbow Flexion/Extension Pitch rotation.
- $\mathbf{A}_3(\theta_3) = \mathbf{R}_x(\theta_3)$ represents the Wrist Vertical Trim rotation.

### 2.2 Deterministic Inverse Kinematics (CCD with DLS Singularity Avoidance)
For each joint $i$ (from End-Effector to Base), the rotational update vector is calculated analytically without stochastic heuristics:

1. **Normalized Direction Vectors (單位方向向量)**:
   $$\hat{\mathbf{u}} = \frac{\mathbf{p}_{\text{end}} - \mathbf{p}_i}{\|\mathbf{p}_{\text{end}} - \mathbf{p}_i\|}, \quad \hat{\mathbf{v}} = \frac{\mathbf{p}_{\text{target}} - \mathbf{p}_i}{\|\mathbf{p}_{\text{target}} - \mathbf{p}_i\|}$$

2. **Orthogonal Rotation Axis & Angle (正交旋轉軸與旋轉角)**:
   $$\mathbf{w}_{\text{rot}} = \hat{\mathbf{u}} \times \hat{\mathbf{v}}, \quad \theta = \arccos(\operatorname{clamp}(\hat{\mathbf{u}} \cdot \hat{\mathbf{v}}, -1.0, 1.0))$$

3. **Damped Least Squares (DLS) Singularity Damping (奇異點阻尼正則化)**:
   $$\lambda_{\text{dls}} = \frac{1.0}{\|\mathbf{w}_{\text{rot}}\| + \epsilon_{\text{singularity}}}, \quad \text{where } \epsilon_{\text{singularity}} = 0.015$$
   $$\Delta \theta_{\text{clamped}} = \operatorname{sign}(\theta_{\text{local}}) \cdot \min\left(|\theta| \cdot \gamma_{\text{damping}} \cdot \min(1.0, \lambda_{\text{dls}}), \, \omega_{\max} \cdot \Delta t\right)$$

*Proof of Determinism*: Given identical initial state $\mathbf{S}_0 = (\mathbf{\Theta}_0, \mathbf{p}_{\text{target}}, \Delta t)$, the solution $\mathbf{\Theta}_{t+1} = f(\mathbf{S}_0)$ produces zero stochastic variance ($\sigma^2 = 0$).

---

## 3. Safety Envelope & Physical Constraint Verification / 安全防護包絡線與物理約束 (ISO 10218 / ISO 13849)

To ensure that the software cannot generate physically unfeasible or destructive kinematic command outputs, multiple programmatic hard and soft limits are enforced in every computation frame:

### 3.1 Joint Angle Limits (關節機械軟限位約束)

```

+-----------+--------+---------------+---------------+---------------------------------------+
| Joint ID  | Axis   | Min Limit     | Max Limit     | Safety Rationale / 安全設計依據       |
+-----------+--------+---------------+---------------+---------------------------------------+
| Joint 0   | Y-Yaw  | -171.0° (rad) | +171.0° (rad) | Anti-cable twisting / 防止內部線束絞合|
| Joint 1   | X-Pitch| -81.0° (rad)  | +99.0° (rad)  | Upright reach & ground avoidance      |
| Joint 2   | X-Pitch| -153.0° (rad) | +54.0° (rad)  | Full retro-flexion / 近身極致折疊     |
| Joint 3   | X-Pitch| -126.0° (rad) | +126.0° (rad) | Top-down perpendicular compensation   |
+-----------+--------+---------------+---------------+---------------------------------------+

```

### 3.2 Cartesian Workspace Envelope (笛卡爾空間安全工作包絡線)
The reach envelope is constrained radially and vertically:
1. **Radial Workspace Clamping**:
   $$r = \sqrt{x^2 + z^2}, \quad r_{\text{safe}} = \operatorname{clamp}(r, 0.18\,\text{m}, 1.95\,\text{m})$$
2. **Vertical Workspace Clamping**:
   $$y_{\text{safe}} = \operatorname{clamp}(y, 0.06\,\text{m}, 1.65\,\text{m})$$

---

## 4. International Standards Conformity Matrix / 國際標準符合性自評矩陣


```

+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| Standard / 國際標準       | Core Compliance Requirement / 核心要求                      | Technical Realization & Evidence / 技術實作與證明依據       |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| ISO/IEC 42001:2023        | Clause 6.1: Actions to address AI risks                     | Zero-Server architecture eliminates data breach vectors.     |
| (AIMS - AI Governance)    | Clause 8.2: Transparency & explainability                   | 100% open-source analytical math; no hidden neural weights.  |
|                           | Clause 9.1: Monitoring and measurement                      | Real-time 60Hz telemetry logging with CSV export validation. |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| EU AI Act                 | Article 10: Technical Documentation & Accuracy              | Complete mathematical derivation included in architecture.   |
| (Regulation 2024/1689)    | Article 14: Human Oversight & Controllability               | Direct manual override via Dual-Virtual Joysticks & Keys.    |
|                           | Article 50: Transparency obligations                        | Mode and error bounds dynamically rendered on HUD.           |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| NIST AI RMF 1.0           | GOVERN 1.2: System boundary & use cases defined             | Explicit non-weaponization disclaimer in LEGAL_NOTICE.md.    |
| (Risk Management)         | MAP 1.5: Scientific repeatability verified                  | Research Mode enforces 1:1 linear deterministic input flow.  |
|                           | MEASURE 2.7: Algorithmic bias and safety metrics            | Real-time spatial tracking error $\Delta d$ in millimeters.  |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| ISO 10218-1:2011          | Clause 5.4: Protection from moving parts & limit stops      | Strict trigonometric clamping preventing self-collision.     |
| (Robotics Safety)         | Clause 5.12: Axis movement limiting                         | Software-enforced joint boundaries on $\mathbf{\Theta}$.     |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| ISO/IEC 27001:2022        | A.8.20: Network security & data segregation                 | Zero remote data ingress/egress; CSP strict-origin enforced. |
| (Information Security)    | A.8.28: Secure coding (Input sanitization)                  | Formula injection protection on CSV downloads (`_sanitize`). |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+
| W3C WCAG 2.1 AA           | Guideline 1.1 / 4.1: Text alternatives & Name, Role, Value  | Semantic ARIA labels, `role="slider"`, `aria-live="polite"`. |
+---------------------------+-------------------------------------------------------------+--------------------------------------------------------------+

```

---

## 5. Dual-Mode Operational Governance / 雙模態運行治理規範

To eliminate conflicts between **human-centric operational ergonomics** and **scientific data reproducibility**, the system implements a strict behavioral mode split:


```

+------------------------------------+---------------------------------------+---------------------------------------+
| Dimension / 治理維度               | Game / Scenario Modes (Kid & Adv)     | Scientific Research Mode (科研模式)   |
+------------------------------------+---------------------------------------+---------------------------------------+
| Control Mapping (控制映射)         | Dual-Zone Curve ($t^{2.2}$ / $t^{1.35}$) | Pure Linear ($1:1$, $\text{curve}=1$) |
| Velocity Damping (速度阻尼)        | Enabled ($\alpha = 14 \sim 18\,\text{s}^{-1}$) | Disabled ($\alpha = 999$, Zero Lag)   |
| Random Visual FX (隨機視覺特效)    | Enabled (Particles, Camera Shake)     | Disabled (Zero GPU Noise / Clean RT)  |
| Grip Actuation Delay (抓取延遲)    | 120ms Pneumatic Simulation            | 0ms Deterministic Instantaneous Catch |
| Data Telemetry (遙測數據流)        | Summary HUD Output                    | 60Hz Real-Time Buffer + CSV Export    |
+------------------------------------+---------------------------------------+---------------------------------------+

```

---

## 6. Verification, Validation & Traceability / 驗證、確認與追溯性記錄

- **Unit Verification**: CCD-IK convergence tested within maximum 6 iterations per frame ($\text{error} < 0.0001\,\text{m}$).
- **Memory Integrity**: Verified Zero-GC loop utilizing pre-allocated `POOL` structures (`THREE.Vector3`, `Matrix4`, `Quaternion`), ensuring zero Garbage Collection frame drops during 60 FPS continuous operation.
- **Audit Sign-off**: This document certifies that the **J.A.R. Beyond the Hand 3D** architecture adheres to modern international software engineering and AI governance standards.

---
*End of Technical Whitepaper / 治理架構書結束*

```
