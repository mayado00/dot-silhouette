/**
 * 나선 은하 모양의 도트 좌표를 절차적으로 생성한다.
 * 로그 나선 기반 + 두께 변조 + 별 무리(클러스터) + 헤이즈로
 * 회화적인 부피감과 다이나믹함을 표현.
 *
 * zone: 'core' | 'arm' | 'haze' | 'bg'
 *
 * @param {object} opts
 * @param {number} opts.count - 총 도트 수 (기본 2400)
 * @param {number} opts.arms  - 나선팔 개수 (기본 3)
 * @returns {{x:number, y:number, zone?:string, arm?:number}[]}
 */
export function generateGalaxyPositions(opts = {}) {
  const { count = 2400, arms = 3 } = opts;
  const pts = [];

  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const cx = 0.5;
  const cy = 0.5;
  const maxR = 0.47;
  const turns = 1.5;
  const globalTilt = Math.random() * Math.PI * 2;

  // 팔 위 특정 위치의 좌표 계산 헬퍼
  const armPoint = (arm, t) => {
    const armOffset = (arm / arms) * Math.PI * 2;
    const theta = globalTilt + armOffset + t * turns * Math.PI * 2;
    const radius = 0.05 + t * (maxR - 0.05);
    return { theta, radius };
  };

  // 팔 두께 변조: 위치(t)에 따라 굵어졌다 가늘어졌다 (팔마다 다른 위상)
  const armPhases = Array.from({ length: arms }, () => Math.random() * Math.PI * 2);
  const widthAt = (arm, t) => {
    const base = 0.014 + t * 0.035;
    // 저주파 + 고주파 사인 조합으로 유기적인 굵기 변화 (0.4x ~ 1.9x)
    const mod =
      1 +
      0.55 * Math.sin(t * 5.5 * Math.PI + armPhases[arm]) +
      0.35 * Math.sin(t * 11 * Math.PI + armPhases[arm] * 2.3);
    return base * Math.max(0.35, mod);
  };

  // ── 1) 중심 코어 (~12%)
  const coreCount = Math.floor(count * 0.12);
  for (let i = 0; i < coreCount; i++) {
    const r = Math.abs(gauss()) * 0.05;
    const a = Math.random() * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, zone: 'core' });
  }

  // ── 2) 나선팔 본체 (~54%) : 두께가 변하는 팔
  const armCount = Math.floor(count * 0.54);
  for (let i = 0; i < armCount; i++) {
    const arm = i % arms;
    const t = Math.pow(Math.random(), 0.75);
    const { theta, radius } = armPoint(arm, t);

    const w = widthAt(arm, t);
    // 수직 산포 + 접선 방향으로도 살짝 흘려서 붓터치 느낌
    const perp = gauss() * w;
    const along = gauss() * w * 1.6;
    const perpAngle = theta + Math.PI / 2;

    const x = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * perp + Math.cos(theta) * along * 0.3;
    const y = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * perp + Math.sin(theta) * along * 0.3;

    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    pts.push({ x, y, zone: 'arm', arm });
  }

  // ── 3) 별 무리 클러스터 (~20%) : 팔 위 곳곳에 뭉친 덩어리
  const clusterTotal = Math.floor(count * 0.2);
  const clusterCount = 10 + Math.floor(Math.random() * 5); // 10~14개 덩어리
  const perCluster = Math.floor(clusterTotal / clusterCount);
  for (let c = 0; c < clusterCount; c++) {
    const arm = c % arms;
    const t = 0.15 + Math.random() * 0.8;
    const { theta, radius } = armPoint(arm, t);
    // 클러스터 중심 (팔에서 살짝 벗어나기도)
    const drift = gauss() * widthAt(arm, t) * 0.8;
    const perpAngle = theta + Math.PI / 2;
    const ccx = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * drift;
    const ccy = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * drift;
    const clusterR = 0.018 + Math.random() * 0.03; // 덩어리 크기 다양

    for (let i = 0; i < perCluster; i++) {
      const r = Math.abs(gauss()) * clusterR;
      const a = Math.random() * Math.PI * 2;
      const x = ccx + Math.cos(a) * r;
      const y = ccy + Math.sin(a) * r;
      if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
      pts.push({ x, y, zone: 'arm', arm });
    }
  }

  // ── 4) 헤이즈 (~10%) : 팔 주변에 넓게 퍼진 희미한 먼지
  const hazeCount = Math.floor(count * 0.1);
  for (let i = 0; i < hazeCount; i++) {
    const arm = i % arms;
    const t = Math.pow(Math.random(), 0.7);
    const { theta, radius } = armPoint(arm, t);
    const w = widthAt(arm, t) * 3.2; // 팔보다 훨씬 넓게
    const perp = gauss() * w;
    const perpAngle = theta + Math.PI / 2;
    const x = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * perp;
    const y = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * perp;
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    pts.push({ x, y, zone: 'haze', arm });
  }

  // ── 5) 배경 별 (나머지 ~4%)
  const bgCount = count - pts.length;
  for (let i = 0; i < bgCount; i++) {
    pts.push({
      x: 0.02 + Math.random() * 0.96,
      y: 0.02 + Math.random() * 0.96,
      zone: 'bg',
    });
  }

  return pts;
}
