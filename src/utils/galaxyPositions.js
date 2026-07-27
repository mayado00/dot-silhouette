/**
 * 나선 은하 모양의 도트 좌표를 절차적으로 생성한다.
 * 로그 나선 기반 + 두께 변조 + 별 무리(클러스터) + 헤이즈.
 * 중심부 밀도가 높고 바깥으로 갈수록 옅어지는 그라데이션 구조.
 *
 * zone: 'core' | 'bulge' | 'arm' | 'haze' | 'bg'
 * fade: 0~1 (중심=1, 가장자리로 갈수록 감소) — 렌더러에서 밝기/크기에 반영
 *
 * @param {object} opts
 * @param {number} opts.count - 총 도트 수 (기본 2400)
 * @param {number} opts.arms  - 나선팔 개수 (기본 3)
 */
export function generateGalaxyPositions(opts = {}) {
  const { count = 2400, arms = 3, random = Math.random } = opts;
  const pts = [];

  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const cx = 0.5;
  const cy = 0.5;
  const maxR = 0.47;
  const turns = 1.5;
  const globalTilt = random() * Math.PI * 2;

  const armPoint = (arm, t) => {
    const armOffset = (arm / arms) * Math.PI * 2;
    const theta = globalTilt + armOffset + t * turns * Math.PI * 2;
    const radius = 0.05 + t * (maxR - 0.05);
    return { theta, radius };
  };

  const armPhases = Array.from({ length: arms }, () => random() * Math.PI * 2);
  const widthAt = (arm, t) => {
    const base = 0.014 + t * 0.035;
    const mod =
      1 +
      0.55 * Math.sin(t * 5.5 * Math.PI + armPhases[arm]) +
      0.35 * Math.sin(t * 11 * Math.PI + armPhases[arm] * 2.3);
    return base * Math.max(0.35, mod);
  };

  // 바깥으로 갈수록 옅어지는 페이드 (중심=1 → 끝=0.35)
  const fadeAt = (t) => 1 - t * 0.65;

  // ── 1) 이너 코어 (~12%) : 아주 밀집된 흰 빛 덩어리
  const innerCount = Math.floor(count * 0.12);
  for (let i = 0; i < innerCount; i++) {
    const r = Math.abs(gauss()) * 0.032;
    const a = random() * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, zone: 'core', fade: 1 });
  }

  // ── 2) 벌지 (~10%) : 코어를 감싸는 골드빛 팽대부
  const bulgeCount = Math.floor(count * 0.1);
  for (let i = 0; i < bulgeCount; i++) {
    const r = 0.02 + Math.abs(gauss()) * 0.06;
    const a = random() * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, zone: 'bulge', fade: 0.95 });
  }

  // ── 3) 나선팔 본체 (~48%) : 중심 쪽으로 밀집 (pow > 1)
  const armCount = Math.floor(count * 0.48);
  for (let i = 0; i < armCount; i++) {
    const arm = i % arms;
    const t = Math.pow(random(), 1.5); // 중심부 밀집, 바깥 희박
    const { theta, radius } = armPoint(arm, t);

    const w = widthAt(arm, t);
    const perp = gauss() * w;
    const along = gauss() * w * 1.6;
    const perpAngle = theta + Math.PI / 2;

    const x = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * perp + Math.cos(theta) * along * 0.3;
    const y = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * perp + Math.sin(theta) * along * 0.3;

    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    pts.push({ x, y, zone: 'arm', arm, fade: fadeAt(t) });
  }

  // ── 4) 별 무리 클러스터 (~18%) : 중심 쪽에 더 많이
  const clusterTotal = Math.floor(count * 0.18);
  const clusterCount = 10 + Math.floor(random() * 5);
  const perCluster = Math.floor(clusterTotal / clusterCount);
  for (let c = 0; c < clusterCount; c++) {
    const arm = c % arms;
    const t = 0.1 + Math.pow(random(), 1.3) * 0.8; // 중심 쪽 편향
    const { theta, radius } = armPoint(arm, t);
    const drift = gauss() * widthAt(arm, t) * 0.8;
    const perpAngle = theta + Math.PI / 2;
    const ccx = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * drift;
    const ccy = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * drift;
    const clusterR = 0.018 + random() * 0.03;
    const cfade = fadeAt(t);

    for (let i = 0; i < perCluster; i++) {
      const r = Math.abs(gauss()) * clusterR;
      const a = random() * Math.PI * 2;
      const x = ccx + Math.cos(a) * r;
      const y = ccy + Math.sin(a) * r;
      if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
      pts.push({ x, y, zone: 'arm', arm, fade: cfade });
    }
  }

  // ── 5) 헤이즈 (~8%) : 중심 쪽 편향 + 강한 페이드
  const hazeCount = Math.floor(count * 0.08);
  for (let i = 0; i < hazeCount; i++) {
    const arm = i % arms;
    const t = Math.pow(random(), 1.4);
    const { theta, radius } = armPoint(arm, t);
    const w = widthAt(arm, t) * 3.2;
    const perp = gauss() * w;
    const perpAngle = theta + Math.PI / 2;
    const x = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * perp;
    const y = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * perp;
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    pts.push({ x, y, zone: 'haze', arm, fade: fadeAt(t) * 0.8 });
  }

  // ── 6) 배경 별 (나머지 ~4%) : 희미하게
  const bgCount = count - pts.length;
  for (let i = 0; i < bgCount; i++) {
    pts.push({
      x: 0.02 + random() * 0.96,
      y: 0.02 + random() * 0.96,
      zone: 'bg',
      fade: 0.5 + random() * 0.3,
    });
  }

  return pts;
}
