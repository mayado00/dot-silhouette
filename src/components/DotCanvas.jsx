import { useRef, useEffect, useState, useCallback } from 'react';

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
  const phaseRef = useRef(0);

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

    dotsRef.current = positions.map((p, i) => ({
      px: offsetX + p.x * size,
      py: offsetY + p.y * size,
      baseRadius: 1.5 + Math.random() * 1.5,
      donor: getDonor(i),
      // 개별 반짝임을 위한 파라미터
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.025,       // 각자 다른 반짝임 속도
      glowPhase: Math.random() * Math.PI * 2,      // 글로우 위상
      glowSpeed: 0.003 + Math.random() * 0.012,    // 글로우 속도 (느리게)
      flickerTimer: Math.random() * 300,            // 랜덤 깜빡임 타이머
      flickerInterval: 150 + Math.random() * 400,   // 깜빡임 주기
      flickerDuration: 15 + Math.random() * 30,     // 깜빡임 지속 시간
      hue: -10 + Math.random() * 30,               // 색상 미세 변화 (따뜻한 금~주황)
    }));
  }, [dims, positions, getDonor]);

  // 애니메이션 루프
  useEffect(() => {
    if (!dims.w || !dims.h) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dims.w, dims.h);

      for (const dot of dotsRef.current) {
        // 기본 반짝임 (사인파, 각자 다른 속도)
        dot.phase += dot.speed;
        dot.glowPhase += dot.glowSpeed;
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
        const brightness = 0.15 + basePulse * 0.35 + glowPulse * 0.2 + flicker;
        const alpha = Math.min(brightness, 1);

        // 반지름: 밝을 때 살짝 커짐
        const r = dot.baseRadius + basePulse * 0.8 + flicker * 2;

        // 글로우 (밝은 도트 주변에 부드러운 빛)
        if (alpha > 0.45) {
          const glowR = r * 3.5;
          const grad = ctx.createRadialGradient(
            dot.px, dot.py, r * 0.5,
            dot.px, dot.py, glowR,
          );
          const glowAlpha = (alpha - 0.45) * 0.5;
          grad.addColorStop(0, `rgba(255, ${190 + dot.hue}, ${100 + dot.hue}, ${glowAlpha})`);
          grad.addColorStop(1, `rgba(255, ${190 + dot.hue}, ${100 + dot.hue}, 0)`);
          ctx.beginPath();
          ctx.arc(dot.px, dot.py, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // 코어 도트
        ctx.beginPath();
        ctx.arc(dot.px, dot.py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${195 + dot.hue}, ${110 + dot.hue}, ${alpha})`;
        ctx.fill();
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
