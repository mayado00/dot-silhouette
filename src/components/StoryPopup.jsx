import { useEffect, useRef } from 'react';

/**
 * 기부자 사연 팝업
 */
export default function StoryPopup({ contributor, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!contributor) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        style={{
          background: '#1e1e1e',
          border: '1px solid rgba(255,200,120,0.3)',
          borderRadius: 16,
          padding: '36px 40px',
          maxWidth: 420,
          width: '90%',
          position: 'relative',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 22,
            color: '#ffc878',
            fontWeight: 700,
          }}
        >
          {contributor.name}
        </h3>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          기부 사연
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {contributor.message}
        </p>

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 22,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
