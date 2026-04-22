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

    const padding = 40;
    const drawW = dims.w - padding * 2;
    const drawH = dims.h - padding * 2;

    dotsRef.current = positions.map((p, i) => ({
      px: padding + p.x * drawW,
      py: padding + p.y * drawH,
      baseRadius: 2 + Math.random() * 1.5,
      donor: getDonor(i),
      phase: Math.random() * Math.PI * 2,
    }));
  }, [dims, positions, getDonor]);

  // 애니메이션 루프
  useEffect(() => {
    if (!dims.w || !dims.h) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      phaseRef.current += 0.015;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dims.w, dims.h);

      for (const dot of dotsRef.current) {
        const pulse = Math.sin(phaseRef.current + dot.phase) * 0.5 + 0.5;
        const r = dot.baseRadius + pulse * 1;
        const alpha = 0.4 + pulse * 0.4;
        ctx.beginPath();
        ctx.arc(dot.px, dot.py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 120, ${alpha})`;
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
