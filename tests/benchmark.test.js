import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { InertiaCalculator } from '../src/physics/InertiaCalculator.js';

test('InertiaCalculator - Sphere Analytical Benchmark Verification', () => {
    const r = 0.1;
    const rho = 1000; // 1.0 g/cm³ = 1000 kg/m³
    const infill = 1.0;

    const geo = new THREE.SphereGeometry(r, 64, 32);
    const result = InertiaCalculator.computeProperties(geo, rho / 1000, infill);

    const expectedMass = (4 / 3) * Math.PI * Math.pow(r, 3) * rho;
    const massError = Math.abs((result.mass - expectedMass) / expectedMass) * 100;

    assert.ok(massError < 0.5, `Mass error (${massError.toFixed(3)}%) must be under 0.5%`);
    assert.ok(result.tensor[2][2] > 0, 'Izz must be positive');
});
