import { useRef, useEffect, useState, useCallback } from 'react';

// ── 네온 팔레트 (포스터 스타일) ──────────────────────────
const PALETTE = [
  { r: 182, g: 255, b: 46 },   // 라임 그린
  { r: 165, g: 123, b: 240 },  // 퍼플
  { r: 46, g: 143, b: 219 },   // 블루
  { r: 255, g: 94, b: 200 },   // 네온 핑크
  { r: 245, g: 169, b: 124 },  // 피치 오렌지
  { r: 244, g: 244, b: 240 },  // 화이트
  { r: 178, g: 166, b: 60 },   // 올리브 골드
];

// 은하 코어용 따뜻한 팔레트 (화이트~골드)
const CORE_PALETTE = [
  { r: 255, g: 250, b: 235 },  // 웜 화이트
  { r: 255, g: 226, b: 150 },  // 소프트 골드
  { r: 255, g: 200, b: 120 },  // 골드
  { r: 250, g: 240, b: 220 },  // 아이보리
];

// 모양 종류: 확률 가중치 (원과 작은 별이 다수, 큰 장식은 소수)
const SHAPES = ['circle', 'sparkle', 'star4', 'cross', 'flower', 'square', 'diamond'];

function pickShape() {
  const r = Math.random();
  if (r < 0.35) return 'circle';
  if (r < 0.6) return 'sparkle';
  if (r < 0.72) return 'star4';
  if (r < 0.82) return 'cross';
  if (r < 0.9) return 'flower';
  if (r < 0.96) return 'diamond';
  return 'square';
}

// ── 모양 그리기 함수들 ──────────────────────────
function drawSparkle(ctx, x, y, r, rot) {
  // 4갈래 반짝이 별 (오목한 커브)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  const inner = r * 0.25;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    const mid = a + Math.PI / 4;
    ctx.quadraticCurveTo(
      Math.cos(mid) * inner * 0.5, Math.sin(mid) * inner * 0.5,
      Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r,
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStar4(ctx, x, y, r, rot) {
  // 4각 별 (직선형 다이아 별)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const inner = r * 0.35;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : inner;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCross(ctx, x, y, r, rot) {
  // 가는 십자 (X)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const w = r * 0.28;
  ctx.fillRect(-r, -w / 2, r * 2, w);
  ctx.fillRect(-w / 2, -r, w, r * 2);
  ctx.restore();
}

function drawFlower(ctx, x, y, r, rot) {
  // 4잎 클로버/꽃
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const pr = r * 0.5;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSquare(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

function drawDiamond(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot + Math.PI / 4);
  ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
  ctx.restore();
}

function drawShape(ctx, shape, x, y, r, rot) {
  switch (shape) {
    case 'sparkle': drawSparkle(ctx, x, y, r, rot); break;
    case 'star4': drawStar4(ctx, x, y, r, rot); break;
    case 'cross': drawCross(ctx, x, y, r, rot); break;
    case 'flower': drawFlower(ctx, x, y, r, rot); break;
    case 'square': drawSquare(ctx, x, y, r, rot); break;
    case 'diamond': drawDiamond(ctx, x, y, r, rot); break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
  }
}

/**
 * 도트 실루엣 캔버스 컴포넌트
 *
 * @param {Object} props
 * @param {{x:number, y:number}[]} props.positions  - 정규화 좌표 (0~1)
 * @param {{name:string, message:string}[]} props.contributors - 기부자 데이터
 * @param {function} props.onDotClick - 도트 클릭 시 콜백 (contributor)
 */
export default function DotCanvas({ positions, contributors, onDotClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dotsRef = useRef([]); // 렌더 좌표 캐시
  const animRef = useRef(null);

  // 도트에 기부자 매핑 (순환)
  const getDonor = useCallback(
    (i) => {
      if (!contributors.length) return null;
      return contributors[i % contributors.length];
    },
    [contributors],
  );

  // 리사이즈 핸들링
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: width, h: height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // 도트 좌표 → 실제 픽셀 좌표 계산
  useEffect(() => {
    if (!dims.w || !dims.h || !positions.length) return;
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;

    const padding = 60;
    const availW = dims.w - padding * 2;
    const availH = dims.h - padding * 2;

    // 정방형 비율 유지: 가로/세로 중 짧은 쪽에 맞춤
    const size = Math.min(availW, availH);
    const offsetX = padding + (availW - size) / 2;
    const offsetY = padding + (availH - size) / 2;

    dotsRef.current = positions.map((p, i) => {
      const isCore = p.zone === 'core';
      // 코어는 대부분 원(밀집된 빛), 나머지는 다양한 모양
      const shape = isCore && Math.random() < 0.8 ? 'circle' : pickShape();
      // 큰 장식 모양은 크게, 원은 작게
      const isAccent = shape !== 'circle' && Math.random() < 0.15;
      const baseSize = shape === 'circle'
        ? 1.5 + Math.random() * 2
        : isAccent
          ? 6 + Math.random() * 7
          : 2.5 + Math.random() * 3.5;

      const palette = isCore ? CORE_PALETTE : PALETTE;

      return {
        px: offsetX + p.x * size,
        py: offsetY + p.y * size,
        baseRadius: baseSize,
        shape,
        color: palette[Math.floor(Math.random() * palette.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,      // 천천히 회전
        donor: getDonor(i),
        // 개별 반짝임을 위한 파라미터
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.025,       // 각자 다른 반짝임 속도
        glowPhase: Math.random() * Math.PI * 2,      // 글로우 위상
        glowSpeed: 0.003 + Math.random() * 0.012,    // 글로우 속도 (느리게)
        flickerTimer: Math.random() * 300,            // 랜덤 깜빡임 타이머
        flickerInterval: 150 + Math.random() * 400,   // 깜빡임 주기
        flickerDuration: 15 + Math.random() * 30,     // 깜빡임 지속 시간
      };
    });
  }, [dims, positions, getDonor]);

  // 애니메이션 루프
  useEffect(() => {
    if (!dims.w || !dims.h) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');


    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dims.w, dims.h);

      for (const dot of dotsRef.current) {
        // 기본 반짝임 (사인파, 각자 다른 속도)
        dot.phase += dot.speed;
        dot.glowPhase += dot.glowSpeed;
        dot.rotation += dot.rotSpeed;
        dot.flickerTimer++;

        const basePulse = Math.sin(dot.phase) * 0.5 + 0.5;
        const glowPulse = Math.sin(dot.glowPhase) * 0.5 + 0.5;

        // 랜덤 깜빡임: 가끔 확 밝아졌다 사라지는 효과
        let flicker = 0;
        if (dot.flickerTimer > dot.flickerInterval) {
          const t = dot.flickerTimer - dot.flickerInterval;
          if (t < dot.flickerDuration) {
            // 밝아졌다 서서히 꺼지는 커브
            const progress = t / dot.flickerDuration;
            flicker = Math.sin(progress * Math.PI) * 0.8;
          } else {
            // 리셋
            dot.flickerTimer = 0;
            dot.flickerInterval = 150 + Math.random() * 400;
            dot.flickerDuration = 15 + Math.random() * 30;
          }
        }

        // 종합 밝기
        const brightness = 0.25 + basePulse * 0.35 + glowPulse * 0.2 + flicker;
        const alpha = Math.min(brightness, 1);

        // 크기: 밝을 때 살짝 커짐
        const r = dot.baseRadius + basePulse * 0.8 + flicker * 2;
        const { r: cr, g: cg, b: cb } = dot.color;

        // 글로우 (밝은 도트 주변에 부드러운 빛)
        if (alpha > 0.5) {
          const glowR = r * 3;
          const grad = ctx.createRadialGradient(
            dot.px, dot.py, r * 0.5,
            dot.px, dot.py, glowR,
          );
          const glowAlpha = (alpha - 0.5) * 0.45;
          grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${glowAlpha})`);
          grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.beginPath();
          ctx.arc(dot.px, dot.py, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // 코어 모양
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        drawShape(ctx, dot.shape, dot.px, dot.py, r, dot.rotation);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [dims]);

  // 마우스 이동: 가까운 도트 탐색
  const handleMouseMove = useCallback(
    (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hitRadius = 12;
      let closest = null;
      let closestDist = Infinity;

      for (const dot of dotsRef.current) {
        const dx = dot.px - mx;
        const dy = dot.py - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitRadius && dist < closestDist) {
          closest = dot;
          closestDist = dist;
        }
      }

      if (closest && closest.donor) {
        setTooltip({
          x: closest.px,
          y: closest.py,
          name: closest.donor.name,
          donor: closest.donor,
        });
        canvasRef.current.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        canvasRef.current.style.cursor = 'default';
      }
    },
    [],
  );

  const handleClick = useCallback(() => {
    if (tooltip && tooltip.donor && onDotClick) {
      onDotClick(tooltip.donor);
    }
  }, [tooltip, onDotClick]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* 툴팁 */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y - 32,
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)',
            color: '#1a1a1a',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            transition: 'opacity 0.15s',
          }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
