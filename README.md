# 🦾 J.A.R. 在手之上 3D | JAR Beyond the Hand 3D

---

## 📖 關於本專案 (About This Project)

### 繁體中文

這是為了我和兒子共渡美好時光而打造的個人非商業機器人科普專案！從日常生活中對工程機械的好奇出發，我們希望在瀏覽器中親手重現一台高精度的 6-DoF 工業與科研級機械臂，讓孩子能在指尖操作中理解逆向運動學、動力學反饋與自動化控制的奧妙。

誠邀所有朋友、教育工作者與機器人愛好者一同化身自動化工程師，在溫室採摘、精密組裝與科研取樣的挑戰中，體驗精準操控與力學探索的純粹樂趣！

### English

This project is a personal, non-commercial robotics education endeavor created to share meaningful and inspiring time with my son. Born out of our shared curiosity for engineering and robotics, we set out to build a high-fidelity, 6-DoF robotic arm simulator directly inside the browser—allowing children and learners to intuitively grasp the beauty of inverse kinematics, dynamic force feedback, and automation control.

We warmly invite friends, educators, and robotics enthusiasts to step into the shoes of an automation engineer, take on realistic harvesting, assembly, and laboratory tasks, and experience the pure joy of precision mechanical control!

---

## 🌟 核心特色 (Key Features)

### 繁體中文

* **🦾 工業級逆向運動學與動力學 (Industrial Kinematics & Dynamics)**：
* **阻尼循環坐標下降法 (Damped CCD-IK)**：整合阻尼最小二乘法（DLS）奇異點防抖，在關節極限與後方死區自動進行平滑姿態重整（Shoulder Flip Routing）。
* **加速度與加加速度限制 (Jerk / Acceleration Limiting)**：引入角加速度濾波（$\Delta \omega \le \alpha_{\max} \cdot \Delta t$），真實呈現工業重型伺服馬達的啟動慣性與重量感。
* **柔性邊界減速 (Soft Clamping)**：取代傳統硬截斷，在關節逼近物理極限時透過非線性曲線主動降速，徹底消除高頻震顫。
* **靜力學關節力矩估算 ($\tau_i$)**：實時計算連桿重力力矩與末端負載力矩（$N \cdot m$），支援馬達選型與負載安全監控。



* **🔬 科研級即時遙測與數據採集 (Research-Grade Telemetry & Data Acquisition)**：
* **6-DoF 軌跡數據記錄與 CSV 導出**：一鍵記錄時間戳、空間坐標、四軸關節角、即時力矩、追蹤誤差與功耗，便於導入 MATLAB / Python 進行科學分析。
* **64 點滑動窗口 FFT 頻譜分析**：即時離散傅立葉變換（DFT/FFT），鎖定機械臂末端振動的一階共振頻率（Hz）。
* **不確定度量化 (Uncertainty Quantification)**：即時統計末端位姿誤差均值、標準差與 $95\%$ 信心區間（$\text{Mean} \pm \text{CI}_{95\%}$）。



* **🕹️ 3A 級雙模態操作手感 (Responsive Control Architecture)**：
* **Pointer Events 統一輸入架構**：完整相容滑鼠、多點觸控與數位觸控筆，支援 Pointer Capture 全域鎖定。
* **指數阻尼響應曲線 (1.8-Order Curve)**：整合 $8\%$ 防誤觸死區，實現微幅操作精準對位、大幅推動高速巡航。
* **連續加權混合輸入 (Soft-Blend Hybrid Input)**：支援鍵盤（WASD/QE）與雙虛擬搖桿無縫交替操控，消除數位/類比切換跳變。
* **關鍵閾值微觸覺回饋 (Haptic Feedback)**：跨越死區、觸及邊界極限及氣動抓取時觸發原生微震動反饋。



* **⚡ 60FPS 零垃圾回收架構 (Zero-GC Architecture)**：
* 徹底消除主動畫迴圈（`animate` / `solve`）內的堆記憶體分配（Heap Allocations），全數運算複用靜態向量與矩陣池（`Pool.js`）。
* 杜絕 JavaScript 垃圾回收引發的畫面掉幀，在行動裝置與低功耗設備上維持持續穩定的 60FPS 幀率。



* **🎨 全息 HUD、自適應場景與多語言支援 (Holographic HUD, Adaptive Scenarios & i18n)**：
* **三大階梯式任務情境**：🌱 兒童溫室採摘（寬容碰撞、引導提示）、🏭 工業流水線組裝、🧪 科研實驗室自動化。
* **動態全息視覺**：CSS Design Tokens、掃描線微光干擾、呼吸光暈邊框及 S 級通關金色粒子爆發。
* **即時雙語切換**：繁體中文與英文介面即時熱切換。



---

### English

* **🦾 Industrial Kinematics & Dynamics**:
* **Damped Cyclic Coordinate Descent (CCD-IK)**: Incorporates Damped Least Squares (DLS) singularity filtering and automated shoulder-flip routing in rear singularity zones.
* **Jerk & Acceleration Limiting**: Enforces joint angular acceleration thresholds ($\Delta \omega \le \alpha_{\max} \cdot \Delta t$) to reflect the physical inertia and torque buildup of industrial servo actuators.
* **Nonlinear Soft Clamping**: Replaces abrupt angular clipping with boundary deceleration curves, preventing numerical jitter near joint physical limits.
* **Static Joint Torque Estimation ($\tau_i$)**: Computes real-time gravitational and payload torque distribution ($N \cdot m$) across all joints.

* **🔬 Research-Grade Telemetry & Data Acquisition**:
* **6-DoF Telemetry & CSV Export**: Real-time logging of timestamps, Cartesian coordinates, joint angles, torques, tracking errors, and power consumption for direct MATLAB/Python workflow integration.
* **64-Point Sliding FFT Spectrum**: Dynamic frequency-domain modal decomposition detecting primary resonance peaks (0–30 Hz).

* **🕹️ Responsive Control Architecture**:
* **Unified Pointer Events API**: Seamless cross-device support for mouse, multi-touch, and stylus input with Pointer Capture tracking.
* **1.8-Order Exponential Response Curve**: Configured with an 8% deadzone, delivering sub-millimeter precision at minor deflections and rapid traversal at full range.
* **Soft-Blend Hybrid Input**: Smooth weighted transition between keyboard (WASD/QE) and virtual analog joysticks without abrupt step inputs.
* **Threshold Haptic Feedback**: Native micro-vibrations triggered upon crossing deadzones, reaching physical motion limits, and activating pneumatic grippers.

* **⚡ 60FPS Zero-GC Runtime**:
* Elimination of dynamic heap allocations and temporary object creation inside the simulation pipeline via pre-allocated matrix/vector pools (`Pool.js`).
* Prevents JavaScript Garbage Collection pauses, ensuring a continuous 60FPS refresh rate on mobile and embedded devices.

* **🎨 Holographic HUD, Multi-Tier Scenarios & i18n**:
* **Three Progressive Operational Tiers**: 🌱 Agricultural Harvesting, 🏭 Industrial Line Assembly, and 🧪 Cleanroom Research Automation.
* **Holographic Visual Design**: CSS Design Tokens, dynamic scanline overlays, breathing neon borders, and golden S-rank celebration FX.
* **Live Dual-Language Localization**: Instant hot-swapping between Traditional Chinese (繁中) and English across all UI modules.

---

## 🗂️ 模組架構 (Architecture)

```text
JAR-Beyond-the-Hand/
├── index.html                # 應用程式入口、PWA 配置、全息 HUD 與 Import Map / App Entry & HUD
├── manifest.json             # PWA 行動裝置安裝設定檔 / PWA Manifest
├── LICENSE                   # MIT 開源授權條款 / Open Source License
├── css/
│   └── style.css             # 全息 HUD 樣式、全屏掃描線與響應式雙搖桿佈局 / Styles & RWD Tokens
└── src/
    ├── main.js               # 程式進入點、模式轉場與生命週期管理 / Main Entry & Lifecycle
    ├── config/
    │   └── i18n.js           # 繁中 / 英文雙語國際化字典 / Localization Dictionary
    ├── controls/
    │   ├── InputMapper.js    # 物理平滑濾波、非線性速度響應與鍵盤搖桿加權映射 / Input Mapper
    │   └── JoystickManager.js# Pointer Events 雙搖桿、死區過濾與觸覺回饋 / Virtual Joysticks
    ├── core/
    │   ├── Pool.js           # 零垃圾回收靜態向量與矩陣池 / Zero-GC Static Pools
    │   ├── AudioEngine.js    # Web Audio API 伺服馬達音調與氣動音效引擎 / Procedural Soundscape
    │   ├── SceneManager.js   # 3D 場景建構、程序化 PBR 光照與 UnrealBloom 泛光管線 / Scene & Lighting
    │   └── MainController.js # 主迴圈控制器、力矩動力學估算與生命週期釋放 / Simulation Loop
    ├── gameplay/
    │   └── MissionManager.js # 任務狀態機、抓取物理判定與評分結算 / Mission Logic & Scoring
    ├── kinematics/
    │   ├── ArmBuilder.js     # 程序化機械臂關節、伸縮連桿與液壓活塞裝配 / Procedural Arm Rigging
    │   └── CCDIKSolver.js    # 阻尼 CCD-IK 解算器、DLS 奇異點迴避與角加速度限制 / CCD-IK Solver
    └── render/
        └── HUDManager.js     # 遙測數據顯示、6-DoF CSV 記錄器與 FFT 頻譜分析儀 / Telemetry & FFT

```

---

## 🎮 控制指南 (Controls)

| 操作動作 (Action) | 電腦鍵盤 (Keyboard) | 觸控 / 滑鼠 (Touch / Mouse) |
| --- | --- | --- |
| **末端水平平移 (Horizontal X/Z)** | `W` / `A` / `S` / `D` | 左側虛擬搖桿拖曳 (Left Joystick) |
| **末端垂直升降 (Vertical Elevation)** | `Q` (下降) / `E` (上升) | 右側虛擬搖桿拖曳 (Right Joystick) |
| **氣動夾爪抓取 / 釋放 (Grip Toggle)** | `Space` (空白鍵) | 點擊右下角 **GRIP** 按鈕 |
| **視角旋轉與縮放 (Camera Orbit)** | 滑鼠左鍵拖曳 / 滾輪 | 單指滑動背景 / 雙指捏合縮放 |

---

## 📜 授權條款 (License)

本專案採用 [MIT License](https://www.google.com/search?q=LICENSE) 授權開源。歡迎學術研究者、教育工作者與機器人愛好者自由使用、修改與引用！

This project is open-source software licensed under the [MIT License](https://www.google.com/search?q=LICENSE). Researchers, educators, and roboticists are warmly invited to utilize, extend, and cite this platform.
