import * as THREE from 'three';
import { I18N } from '../config/i18n.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audioEngine, scene, mode = 'kid', hud = null, fx = null) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audioEngine;
        this.scene = scene;
        this.mode = mode;
        this.hud = hud;
        this.fx = fx;
        this.lang = 'zh';

        this.clawOpen = true;
        this.isSecured = false;
        this.isCompleted = false;
        this.currentDistance = 1.0;
        this.startTime = Date.now();

        this._endEffectorWorldPos = new THREE.Vector3();
        this._targetWorldPos = new THREE.Vector3();
        this._socketWorldPos = new THREE.Vector3();

        this.targetObj = null;
        this._targetBaseScale = 1.0;
        this._animTime = 0;

        this._spawnTargetItem();
        this._initScenario();
    }

    _spawnTargetItem() {
        if (this.targetObj) {
            this.scene.remove(this.targetObj);
            this.targetObj = null;
        }

        const isKid = (this.mode === 'kid');
        const itemGroup = new THREE.Group();

        if (isKid) {
            // 🍓 初熟立體草莓
            const berry = new THREE.Mesh(
                new THREE.SphereGeometry(0.065, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.1 })
            );
            berry.scale.set(1, 1.25, 1);
            berry.position.y = 0.05;
            berry.castShadow = true;
            itemGroup.add(berry);

            const leaf = new THREE.Mesh(
                new THREE.ConeGeometry(0.035, 0.025, 5),
                new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
            );
            leaf.position.y = 0.11;
            itemGroup.add(leaf);
            itemGroup.position.set(-0.48, 0.08, 0.48);

        } else if (this.mode === 'advanced') {
            const chip = new THREE.Mesh(
                new THREE.BoxGeometry(0.11, 0.025, 0.11),
                new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 })
            );
            chip.position.y = 0.025;
            chip.castShadow = true;
            itemGroup.add(chip);
            itemGroup.position.set(-0.52, 0.08, 0.52);

        } else {
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 })
            );
            core.position.y = 0.06;
            core.castShadow = true;
            itemGroup.add(core);
            itemGroup.position.set(-0.55, 0.08, 0.55);
        }

        this.scene.add(itemGroup);
        this.targetObj = itemGroup;
    }

    _initScenario() {
        const t = I18N[this.lang] || I18N.zh;
        const jarText = document.getElementById('jar-text');
        if (jarText) {
            let welcome = t.jarKidWelcome;
            if (this.mode === 'advanced') welcome = t.jarAdvWelcome;
            else if (this.mode === 'research') welcome = t.jarResWelcome;
            jarText.innerText = welcome;
        }
    }

    setLanguage(lang) {
        this.lang = lang;
        this._initScenario();
    }

    toggleGrip() {
        this.clawOpen = !this.clawOpen;

        if (this.clawOpen) {
            // 釋放夾爪
            if (this.audio) this.audio.playPneumatic();
            if (this.isSecured) {
                this.isSecured = false;
                
                // 檢查是否精確投放到目標卡槽 (半徑 < 0.32m)
                this.reactorSocket.getWorldPosition(this._socketWorldPos);
                const socketDist = this.targetObj.position.distanceTo(this._socketWorldPos);

                if (socketDist < 0.32) {
                    this._celebrateVictory();
                }
            }
        } else {
            // 🌟 夾取機械延遲與反饋
            if (this.audio) this.audio.playPneumatic();

            setTimeout(() => {
                if (this.currentDistance < 0.20 && !this.isSecured) {
                    this.isSecured = true;
                    if (this.audio) {
                        this.audio.playLock();
                        this.audio.playSuccess();
                    }
                    if (this.fx) {
                        this.fx.triggerBurst(this._endEffectorWorldPos, 0x00e5ff);
                        this.fx.triggerShake(0.03, 0.2);
                    }

                    const tip = document.getElementById('compact-mission-tip');
                    if (tip) {
                        tip.innerText = (this.lang === 'en') ? "✨ Secured! Deliver to the glowing socket" : "✨ 已牢固夾取！請移至發光卡槽放低";
                        tip.style.borderColor = "#00e5ff";
                    }
                }
            }, 120);
        }
    }

    _celebrateVictory() {
        this.isCompleted = true;
        this.targetObj.position.copy(this._socketWorldPos);
        this.targetObj.position.y += 0.08;

        const durationSec = ((Date.now() - this.startTime) / 1000).toFixed(1);

        if (this.audio) this.audio.playVictory();
        if (this.fx) {
            this.fx.triggerBurst(this._socketWorldPos, 0xffd700);
            this.fx.triggerShake(0.07, 0.45);
        }

        // 🌟 全息通關閃光與結算提示
        const tip = document.getElementById('compact-mission-tip');
        if (tip) {
            tip.innerText = (this.lang === 'en') 
                ? `🏆 Rank S! Completed in ${durationSec}s · Flawless!`
                : `🏆 S級評定！耗時 ${durationSec}秒 · 完美組裝！`;
            tip.style.borderColor = "#ffd700";
            tip.style.color = "#ffd700";
        }
    }

    update(dt, targetPos, intensity) {
        if (!this.endEffector || !this.targetObj) return;

        this._animTime += dt;
        this.endEffector.getWorldPosition(this._endEffectorWorldPos);
        this.targetObj.getWorldPosition(this._targetWorldPos);
        this.currentDistance = this._endEffectorWorldPos.distanceTo(this._targetWorldPos);

        // 🌟 3A 細節：草莓待機呼吸與靠近誘惑發光
        if (!this.isSecured && !this.isCompleted) {
            const breath = 1.0 + Math.sin(this._animTime * 4.0) * 0.03;
            this.targetObj.scale.set(breath, breath, breath);

            // 當機械臂極其靠近 (<0.3m) 時，草莓微微顫動興奮提示
            if (this.currentDistance < 0.30) {
                const excite = Math.sin(this._animTime * 16.0) * 0.004;
                this.targetObj.position.x += excite;
            }
        } else if (this.isSecured) {
            this.targetObj.position.copy(this._endEffectorWorldPos);
            this.targetObj.position.y -= 0.02;
            this.targetObj.scale.set(1.0, 1.0, 1.0);
        }
    }

    getDistance() {
        return this.currentDistance;
    }
}
