/**
 * 나선 은하 모양의 도트 좌표를 절차적으로 생성한다.
 * 로그 나선(logarithmic spiral) 기반, 중심 코어 + 나선팔 구조.
 *
 * @param {object} opts
 * @param {number} opts.count - 총 도트 수 (기본 900)
 * @param {number} opts.arms  - 나선팔 개수 (기본 3)
 * @returns {{x:number, y:number}[]} 정규화 좌표 (0~1)
 */
export function generateGalaxyPositions(opts = {}) {
  const { count = 900, arms = 3 } = opts;
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
  const maxR = 0.46;          // 최대 반경
  const turns = 1.9;           // 나선팔 감김 정도 (바퀴 수)
  const globalTilt = Math.random() * Math.PI * 2; // 전체 회전 랜덤

  // ── 1) 중심 코어 (전체의 ~18%) : 밀집된 빛나는 중심부 (따뜻한 색)
  const coreCount = Math.floor(count * 0.18);
  for (let i = 0; i < coreCount; i++) {
    const r = Math.abs(gauss()) * 0.05;
    const a = Math.random() * Math.PI * 2;
    pts.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      zone: 'core',
    });
  }

  // ── 2) 나선팔 (전체의 ~74%)
  const armCount = Math.floor(count * 0.74);
  for (let i = 0; i < armCount; i++) {
    const arm = i % arms;
    const armOffset = (arm / arms) * Math.PI * 2;

    // t: 팔을 따라가는 위치 (0=중심, 1=끝)
    // 제곱근 분포로 중심부에 좀 더 밀집
    const t = Math.pow(Math.random(), 0.7);

    const theta = globalTilt + armOffset + t * turns * Math.PI * 2;
    const radius = 0.04 + t * (maxR - 0.04);

    // 팔 주변 산포: 바깥으로 갈수록 넓게 퍼짐
    const spread = 0.012 + t * 0.045;
    const offR = gauss() * spread;
    const offA = Math.random() * Math.PI * 2;

    const x = cx + Math.cos(theta) * radius + Math.cos(offA) * Math.abs(offR);
    const y = cy + Math.sin(theta) * radius + Math.sin(offA) * Math.abs(offR);

    if (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98) continue;
    pts.push({ x, y });
  }

  // ── 3) 배경 별 (전체의 ~8%) : 은하 주변 흩뿌려진 별
  const bgCount = count - pts.length;
  for (let i = 0; i < bgCount; i++) {
    pts.push({
      x: 0.03 + Math.random() * 0.94,
      y: 0.03 + Math.random() * 0.94,
    });
  }

  return pts;
}
