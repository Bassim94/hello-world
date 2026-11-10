import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING, computeCost, computeQuantities } from './pricing';
import { jungleGym } from './products/jungleGym';
import { hasBlockers, validateConfig } from './validation';

const base = () => jungleGym.defaultConfig();

describe('Jungle Gym geometry', () => {
  it('loads the 300 × 150 × 220 cm default', () => {
    expect(base().dims).toEqual({ width: 300, depth: 150, height: 220 });
  });

  it('stays inside the configured envelope', () => {
    for (const dims of [base().dims, { width: 450, depth: 250, height: 260 }, { width: 150, depth: 70, height: 120 }]) {
      const parts = jungleGym.build({ ...base(), dims }).filter((p) => p.componentId !== 'connector');
      for (const p of parts) {
        const ext = p.shape === 'box' ? p.size : p.axis === 'x' ? [p.size[1], p.size[0], p.size[0]] : p.axis === 'y' ? [p.size[0], p.size[1], p.size[0]] : [p.size[0], p.size[0], p.size[1]];
        expect(Math.abs(p.position[0]) + ext[0] / 2).toBeLessThanOrEqual(dims.width / 2 + 1e-6);
        expect(Math.abs(p.position[2]) + ext[2] / 2).toBeLessThanOrEqual(dims.depth / 2 + 1e-6);
        expect(p.position[1] + ext[1] / 2).toBeLessThanOrEqual(dims.height + 1e-6);
        expect(p.position[1] - ext[1] / 2).toBeGreaterThanOrEqual(-1e-6);
      }
    }
  });

  it('gives unique part ids', () => {
    const ids = jungleGym.build(base()).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('adds and removes activity parts', () => {
    const all = jungleGym.build(base());
    for (const a of ['monkey_bars', 'ladder', 'net']) {
      expect(all.some((p) => p.group === a)).toBe(true);
      const cfg = { ...base(), activities: { ...base().activities, [a]: false } };
      expect(jungleGym.build(cfg).some((p) => p.group === a)).toBe(false);
    }
  });

  it('adds intermediate posts for wide frames', () => {
    const posts = (w: number) => jungleGym.build({ ...base(), dims: { ...base().dims, width: w } }).filter((p) => p.componentId === 'post').length;
    expect(posts(150)).toBe(4);
    expect(posts(300)).toBe(6);
    expect(posts(450)).toBe(8);
  });
});

describe('Quantities and cost', () => {
  it('quantities grow with size', () => {
    const small = computeQuantities(jungleGym.build(base()));
    const big = computeQuantities(jungleGym.build({ ...base(), dims: { width: 400, depth: 200, height: 250 } }));
    expect(big.woodVolumeM3).toBeGreaterThan(small.woodVolumeM3);
    expect(big.ropeLengthM).toBeGreaterThan(small.ropeLengthM);
  });

  it('price = cost / (1 - margin), totals reconcile', () => {
    const c = computeCost(jungleGym.build(base()), base(), DEFAULT_PRICING);
    expect(c.directCost).toBeCloseTo(c.lines.reduce((s, l) => s + l.total, 0));
    expect(c.productionCost).toBeCloseTo(c.directCost * 1.15);
    expect(c.sellingPrice).toBeCloseTo(c.productionCost / 0.65);
    expect(c.grossMarginPct).toBeCloseTo(35);
    expect(c.totalWithVat).toBeCloseTo(c.sellingPrice * 1.15);
  });

  it('removing the net removes rope cost', () => {
    const cfg = { ...base(), activities: { ...base().activities, net: false } };
    expect(computeCost(jungleGym.build(cfg), cfg, DEFAULT_PRICING).byCategory.ropes).toBe(0);
  });
});

describe('Validation', () => {
  it('default design is never clean: approval + room warnings', () => {
    const codes = validateConfig(base(), null, 'visual_concept').map((i) => i.code);
    expect(codes).toContain('no_engineering_approval');
    expect(codes).toContain('room_missing');
    expect(codes).toContain('mb_grip_height');
  });

  it('blocks when the room is too small', () => {
    const issues = validateConfig(base(), { width: 250, depth: 300, height: 280 }, 'visual_concept');
    expect(hasBlockers(issues)).toBe(true);
  });

  it('warns on tight clearance and blocks a too-shallow monkey-bar lane', () => {
    const tight = validateConfig(base(), { width: 400, depth: 300, height: 280 }, 'visual_concept').map((i) => i.code);
    expect(tight).toContain('room_side_clearance');
    const shallow = validateConfig({ ...base(), dims: { ...base().dims, depth: 70 } }, null, 'visual_concept');
    expect(shallow.some((i) => i.code === 'lane_depth' && i.severity === 'blocker')).toBe(true);
  });
});
