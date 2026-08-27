import * as THREE from 'three';
import { I18N } from '../config/i18n.js';
import { POOL } from '../core/Pool.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audioEngine, scene, mode = 'kid', hud = null) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audioEngine;
        this.scene = scene;
        this.mode = mode;
        this.hud = hud;
        this.lang = 'zh';

        this.clawOpen = true;
        this.isSecured = false;
        this.isCompleted = false;
        this.currentDistance = 1.0;

        this.targetObj = null;
        this._targetWorldPos = new THREE.Vector3();
        this._endEffectorWorldPos = new THREE.Vector3();

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
            // 🍓 兒童模式：立體草莓 (放在半徑 0.75m，極易夾取的位置)
            const berryGeo = new THREE.SphereGeometry(0.07, 16, 16);
            berryGeo.scale(1, 1.25, 1);
            const berryMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.1 });
            const berry = new THREE.Mesh(berryGeo, berryMat);
            berry.position.y = 0.08;
            berry.castShadow = true;
            itemGroup.add(berry);

            // 葉片
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.03, 5), leafMat);
            leaf.position.y = 0.16;
            itemGroup.add(leaf);

            // 初始放置位置 (X: -0.55, Z: 0.55 -> 半徑約 0.77m，近身好操作)
            itemGroup.position.set(-0.55, 0.12, 0.55);

        } else if (this.mode === 'advanced') {
            // 📱 3C 晶片
            const chipGeo = new THREE.BoxGeometry(0.12, 0.03, 0.12);
            const chipMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 });
            const chip = new THREE.Mesh(chipGeo, chipMat);
            chip.position.y = 0.03;
            chip.castShadow = true;
            itemGroup.add(chip);
            itemGroup.position.set(-0.6, 0.10, 0.6);

        } else {
            // 🧪 科研同位素晶球
            const coreGeo = new THREE.SphereGeometry(0.065, 16, 16);
            const coreMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = 0.07;
            core.castShadow = true;
            itemGroup.add(core);
            itemGroup.position.set(-0.65, 0.12, 0.65);
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
        const t = I18N[lang] || I18N.zh;
        const jarText = document.getElementById('jar-text');
        if (jarText) {
            let welcome = t.jarKidWelcome;
            if (this.mode === 'advanced') welcome = t.jarAdvWelcome;
            else if (this.mode === 'research') welcome = t.jarResWelcome;
            jarText.innerText = welcome;
        }
    }

    toggleGrip() {
        this.clawOpen = !this.clawOpen;
        if (this.audio) this.audio.playPneumatic();

        // 🌟 夾取判定：夾爪閉合且與目標距離 < 0.22m
        if (!this.clawOpen && this.currentDistance < 0.22 && !this.isSecured) {
            this.isSecured = true;
            if (this.audio) this.audio.playSuccess();
            
            const tip = document.getElementById('compact-mission-tip');
            if (tip) tip.innerText = (this.lang === 'en') ? "✅ Grabbed! Move to glowing socket" : "✅ 已成功夾取！請移至發光卡槽放低";

        } else if (this.clawOpen && this.isSecured) {
            // 放開物體
            this.isSecured = false;
            
            // 檢查是否已送達目標基座 (半徑 < 0.25m)
            const socketDist = this.targetObj.position.distanceTo(this.reactorSocket.position);
            if (socketDist < 0.35) {
                this.isCompleted = true;
                this.targetObj.position.copy(this.reactorSocket.position);
                this.targetObj.position.y += 0.08;
                if (this.audio) this.audio.playSuccess();

                const tip = document.getElementById('compact-mission-tip');
                if (tip) tip.innerText = (this.lang === 'en') ? "🎉 Mission Complete! Perfect Assembly!" : "🎉 任務圓滿達成！完美對位組裝！";
            }
        }
    }

    update(dt, targetPos, intensity) {
        if (!this.endEffector || !this.targetObj) return;

        this.endEffector.getWorldPosition(this._endEffectorWorldPos);
        this.targetObj.getWorldPosition(this._targetWorldPos);

        // 🌟 即時計算夾爪與物體的 3D 空間真實誤差距離
        this.currentDistance = this._endEffectorWorldPos.distanceTo(this._targetWorldPos);

        // 夾取後物件緊跟夾爪中心
        if (this.isSecured) {
            this.targetObj.position.copy(this._endEffectorWorldPos);
            this.targetObj.position.y -= 0.02;
        }
    }
}
