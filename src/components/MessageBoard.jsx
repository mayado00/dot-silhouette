import { useState, useEffect, useMemo, useCallback } from 'react';
import DotCanvas from './DotCanvas';
import StoryPopup from './StoryPopup';
import { generateGalaxyPositions } from '../utils/galaxyPositions';
import { mulberry32, seededShuffle } from '../utils/seededRandom';
import { fetchMessages, addMessage, isSupabaseConfigured } from '../lib/messagesStore';

// 고정 시드 → 모든 방문자가 동일한 은하 배치를 봄
const GALAXY_SEED = 20260427;

export default function MessageBoard({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 은하 배치 (시드 고정, 최초 1회 생성)
  const positions = useMemo(
    () => generateGalaxyPositions({ count: 2400, arms: 3, random: mulberry32(GALAXY_SEED) }),
    [],
  );

  // 점등 순서: 나선팔 도트를 시드 셔플 → k번째 메시지는 항상 같은 별에
  const litOrder = useMemo(() => {
    const armIdx = positions
      .map((p, i) => (p.zone === 'arm' ? i : -1))
      .filter((i) => i >= 0);
    return seededShuffle(armIdx, mulberry32(GALAXY_SEED + 1));
  }, [positions]);

  // 메시지 → 도트 매핑
  const assignments = useMemo(() => {
    const arr = new Array(positions.length).fill(null);
    messages.forEach((m, k) => {
      if (k < litOrder.length) arr[litOrder[k]] = m;
    });
    return arr;
  }, [positions, litOrder, messages]);

  const load = useCallback(async () => {
    try {
      setMessages(await fetchMessages());
    } catch (e) {
      console.error('메시지 로드 실패:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setError('이름과 메시지를 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addMessage(name.trim(), text.trim());
      setName('');
      setText('');
      setFormOpen(false);
      await load(); // 새 별 점등
    } catch (err) {
      console.error(err);
      setError('등록에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* 헤더 */}
      <header style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px',
        background: 'linear-gradient(to bottom, rgba(17,17,17,0.9), transparent)',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ffc878' }}>
          별에 남긴 이야기
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            {messages.length}개의 별이 빛나고 있어요
          </span>
          <button onClick={onBack} style={{
            padding: '6px 16px', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer',
          }}>
            돌아가기
          </button>
        </div>
      </header>

      {/* 캔버스 */}
      <DotCanvas
        positions={positions}
        contributors={messages}
        assignments={assignments}
        onDotClick={setSelected}
      />

      {/* 하단: 별 남기기 버튼 */}
      <footer style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '24px 0 28px',
        background: 'linear-gradient(to top, rgba(17,17,17,0.92), transparent)',
      }}>
        {!isSupabaseConfigured && (
          <p style={{ margin: 0, color: 'rgba(255,180,120,0.7)', fontSize: 12 }}>
            ⚠ Supabase 미설정 — 지금은 이 브라우저에만 저장됩니다
          </p>
        )}
        <button
          onClick={() => setFormOpen(true)}
          style={{
            padding: '12px 32px', borderRadius: 24,
            border: '2px solid #ffc878', background: 'transparent',
            color: '#ffc878', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.background = '#ffc878'; e.target.style.color = '#111'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ffc878'; }}
        >
          ✦ 나의 별 남기기
        </button>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          빛나는 별에 마우스를 올리면 이름이, 클릭하면 이야기가 보여요
        </p>
      </footer>

      {/* 메시지 입력 모달 */}
      {formOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#1e1e1e',
              border: '1px solid rgba(255,200,120,0.3)',
              borderRadius: 16, padding: '32px 36px',
              maxWidth: 420, width: '90%',
              display: 'flex', flexDirection: 'column', gap: 14,
              animation: 'slideUp 0.3s ease',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 20, color: '#ffc878', fontWeight: 700 }}>
              별에 이야기 남기기
            </h3>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              메시지를 남기면 어두운 별 하나가 당신의 색으로 빛나기 시작해요.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (또는 닉네임)"
              maxLength={20}
              style={inputStyle}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="남기고 싶은 이야기"
              maxLength={300}
              rows={4}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
            />
            {error && (
              <p style={{ margin: 0, color: '#ff7a7a', fontSize: 13 }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: '#ffc878', color: '#111',
                  fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? '별을 켜는 중...' : '별 켜기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 메시지 확인 팝업 */}
      <StoryPopup contributor={selected} onClose={() => setSelected(null)} label="남긴 이야기" />
    </div>
  );
}
