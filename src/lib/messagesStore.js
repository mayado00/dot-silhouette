import { createClient } from '@supabase/supabase-js';

// 기본값: conference-qa 프로젝트 (publishable key는 공개 안전 — RLS로 보호됨)
// 환경변수로 재정의 가능: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const url = import.meta.env.VITE_SUPABASE_URL
  || 'https://scwapmjgghyfbrlradhg.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_Egw9_q5rBwnMq1ezLtdzgw_7tdVqdiQ';

/** Supabase 미설정 시 null → localStorage 폴백으로 동작 */
export const supabase = url && key ? createClient(url, key) : null;

const LS_KEY = 'galaxy-board-messages';

/** 메시지 목록 조회 (오래된 순 = 먼저 남긴 별부터 점등) */
export async function fetchMessages() {
  if (supabase) {
    const { data, error } = await supabase
      .from('galaxy_messages')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  // 폴백: 브라우저 로컬 저장 (Supabase 설정 전 테스트용)
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** 메시지 등록 */
export async function addMessage(name, message) {
  if (supabase) {
    const { error } = await supabase.from('galaxy_messages').insert({ name, message });
    if (error) throw error;
    return;
  }
  const list = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  list.push({
    id: Date.now(),
    name,
    message,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export const isSupabaseConfigured = !!supabase;
