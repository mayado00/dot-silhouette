/**
 * 이미지를 로드하고 불투명 픽셀 위치를 샘플링하여
 * 정규화된 (0~1) 좌표 배열을 반환한다.
 *
 * @param {string} src - 이미지 URL 또는 data URL
 * @param {object} opts
 * @param {number} opts.maxDots   - 최대 도트 수 (기본 800)
 * @param {number} opts.sampleRes - 샘플링 해상도 (기본 200, 내부 캔버스 크기)
 * @param {number} opts.threshold - 알파 채널 기준값 0~255 (기본 128)
 * @returns {Promise<{x:number, y:number}[]>}
 */
export async function imageToPositions(src, opts = {}) {
  const { maxDots = 800, sampleRes = 200, threshold = 128 } = opts;

  const img = await loadImage(src);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = sampleRes;
  canvas.height = sampleRes;

  // 이미지를 캔버스에 맞춰 그림
  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect > 1) {
    dw = sampleRes;
    dh = sampleRes / aspect;
    dx = 0;
    dy = (sampleRes - dh) / 2;
  } else {
    dh = sampleRes;
    dw = sampleRes * aspect;
    dx = (sampleRes - dw) / 2;
    dy = 0;
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  const imageData = ctx.getImageData(0, 0, sampleRes, sampleRes);
  const pixels = imageData.data; // RGBA

  // 불투명 픽셀 좌표 수집
  const candidates = [];
  for (let y = 0; y < sampleRes; y++) {
    for (let x = 0; x < sampleRes; x++) {
      const idx = (y * sampleRes + x) * 4;
      const alpha = pixels[idx + 3];
      // 알파가 threshold 이상이면 후보
      if (alpha >= threshold) {
        // 밝기(grayscale)가 낮을수록(어두울수록) 도트 배치 확률↑
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const brightness = (r + g + b) / 3;
        candidates.push({
          x: x / sampleRes,
          y: y / sampleRes,
          weight: 1 - brightness / 255, // 어두울수록 weight 높음
        });
      }
    }
  }

  if (candidates.length === 0) return [];

  // maxDots 만큼 가중치 기반 랜덤 샘플링
  const selected = weightedSample(candidates, Math.min(maxDots, candidates.length));
  return selected.map(({ x, y }) => ({ x, y }));
}

/** 이미지 로딩 Promise 래퍼 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 가중치 기반 랜덤 샘플링 (reservoir 방식) */
function weightedSample(items, count) {
  // 가중치에 따른 확률적 샘플링
  const pool = [...items];
  const result = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return result;
}
