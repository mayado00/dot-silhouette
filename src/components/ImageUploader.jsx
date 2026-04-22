import { useRef } from 'react';

/**
 * 이미지 업로드 / 기본 이미지 선택 컴포넌트
 */
export default function ImageUploader({ onImageLoad }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onImageLoad(ev.target.result);
    reader.readAsDataURL(file);
  };

  const useSample = (name) => {
    onImageLoad(`/samples/${name}.png`);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      height: '100%',
      padding: 40,
    }}>
      <h2 style={{
        color: '#ffc878',
        fontSize: 28,
        fontWeight: 700,
        margin: 0,
      }}>
        Dot Silhouette
      </h2>
      <p style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        margin: 0,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 1.6,
      }}>
        이미지를 업로드하면 도트로 변환됩니다.<br />
        각 도트에 마우스를 올리면 이름이, 클릭하면 사연이 표시됩니다.
      </p>

      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '14px 36px',
          borderRadius: 28,
          border: '2px solid #ffc878',
          background: 'transparent',
          color: '#ffc878',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#ffc878';
          e.target.style.color = '#1a1a1a';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.color = '#ffc878';
        }}
      >
        이미지 업로드
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 8,
      }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
          또는 샘플 사용:
        </p>
        {['person', 'heart', 'star'].map((name) => (
          <button
            key={name}
            onClick={() => useSample(name)}
            style={{
              padding: '6px 16px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#ffc878';
              e.target.style.color = '#ffc878';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
