import { useState, useCallback } from 'react';
import DotCanvas from './components/DotCanvas';
import StoryPopup from './components/StoryPopup';
import ImageUploader from './components/ImageUploader';
import contributors from './data/contributors';
import { imageToPositions } from './utils/imageToPositions';

export default function App() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = useCallback(async (src) => {
    setLoading(true);
    try {
      const pts = await imageToPositions(src, { maxDots: 800, sampleRes: 200 });
      setPositions(pts);
      setImageLoaded(true);
    } catch (err) {
      console.error('이미지 처리 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDotClick = useCallback((donor) => {
    setSelectedDonor(donor);
  }, []);

  const handleReset = useCallback(() => {
    setPositions([]);
    setImageLoaded(false);
    setSelectedDonor(null);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#111',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {!imageLoaded && !loading && (
        <ImageUploader onImageLoad={handleImageLoad} />
      )}

      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#ffc878',
          fontSize: 18,
        }}>
          <div className="loader" />
          <span style={{ marginLeft: 16 }}>도트 생성 중...</span>
        </div>
      )}

      {imageLoaded && (
        <>
          <header style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
            background: 'linear-gradient(to bottom, rgba(17,17,17,0.9), transparent)',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#ffc878',
            }}>
              Dot Silhouette
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
              }}>
                {positions.length}개의 도트 &middot; {contributors.length}명의 참여자
              </span>
              <button
                onClick={handleReset}
                style={{
                  padding: '6px 16px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                다른 이미지
              </button>
            </div>
          </header>

          <footer style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            textAlign: 'center',
            padding: '32px 0 24px',
            background: 'linear-gradient(to top, rgba(17,17,17,0.9), transparent)',
          }}>
            <p style={{
              margin: 0,
              color: 'rgba(255,255,255,0.35)',
              fontSize: 13,
            }}>
              도트에 마우스를 올려보세요 &middot; 클릭하면 사연을 볼 수 있습니다
            </p>
          </footer>

          <DotCanvas
            positions={positions}
            contributors={contributors}
            onDotClick={handleDotClick}
          />
        </>
      )}

      <StoryPopup
        contributor={selectedDonor}
        onClose={() => setSelectedDonor(null)}
      />
    </div>
  );
}
