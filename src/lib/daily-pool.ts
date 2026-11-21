import { QUIZ_URL } from '../data/quiz-index';

const files = import.meta.glob('../data/quizzes/*.json', { eager: true }) as Record<string, { default: any[] }>;

export const dayIndex = (y: number, m: number, d: number) => Math.floor((Date.UTC(y, m, d) - Date.UTC(2026, 0, 1)) / 864e5);

export function dailyPool() {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([path, m]) => {
      const slug = path.split('/').pop()!.replace('.json', '');
      return m.default.map((q) => ({ q: q.q, o: q.options, a: q.answer, e: q.explain, u: QUIZ_URL[slug] ?? '/quiz/' }));
    });
}
