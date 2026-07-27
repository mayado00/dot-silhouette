/**
 * 나선 은하 모양의 도트 좌표를 절차적으로 생성한다.
 * 로그 나선(logarithmic spiral) 기반, 중심 코어 + 나선팔 구조.
 * 각 좌표에 zone('core'|'arm'|'bg')과 arm 인덱스를 부여해
 * 렌더러가 색상/크기를 구분할 수 있게 한다.
 *
 * @param {object} opts
 * @param {number} opts.count - 총 도트 수 (기본 1600)
 * @param {number} opts.arms  - 나선팔 개수 (기본 3)
 * @returns {{x:number, y:number, zone?:string, arm?:number}[]} 정규화 좌표 (0~1)
 */
export function generateGalaxyPositions(opts = {}) {
  const { count = 1600, arms = 3 } = opts;
  const pts = [];

  // 가우시안 난수 (Box-Muller)
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const cx = 0.5;
  const cy = 0.5;
  const maxR = 0.47;           // 최대 반경
  const turns = 1.6;            // 나선팔 감김 정도 (바퀴 수)
  const globalTilt = Math.random() * Math.PI * 2; // 전체 회전 랜덤

  // ── 1) 중심 코어 (~15%) : 밀집된 빛나는 중심부
  const coreCount = Math.floor(count * 0.15);
  for (let i = 0; i < coreCount; i++) {
    const r = Math.abs(gauss()) * 0.045;
    const a = Math.random() * Math.PI * 2;
    pts.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      zone: 'core',
    });
  }

  // ── 2) 나선팔 (~80%) : 팔을 따라 촘촘하게, 산포는 좁게
  const armCount = Math.floor(count * 0.8);
  for (let i = 0; i < armCount; i++) {
    const arm = i % arms;
    const armOffset = (arm / arms) * Math.PI * 2;

    // t: 팔을 따라가는 위치 (0=중심, 1=끝) — 중심부에 좀 더 밀집
    const t = Math.pow(Math.random(), 0.8);

    const theta = globalTilt + armOffset + t * turns * Math.PI * 2;
    const radius = 0.05 + t * (maxR - 0.05);

    // 팔에 수직 방향으로만 좁게 산포 (나선 라인이 뚜렷하게 유지됨)
    const spread = 0.008 + t * 0.02;
    const perp = gauss() * spread;
    // 팔 진행 방향(접선)에 수직인 방향 벡터
    const perpAngle = theta + Math.PI / 2;

    const x = cx + Math.cos(theta) * radius + Math.cos(perpAngle) * perp;
    const y = cy + Math.sin(theta) * radius + Math.sin(perpAngle) * perp;

    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    pts.push({ x, y, zone: 'arm', arm });
  }

  // ── 3) 배경 별 (~5%) : 은하 주변 흩뿌려진 작은 별
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
