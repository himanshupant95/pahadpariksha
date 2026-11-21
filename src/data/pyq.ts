// Previous-year question bank (Uttarakhand-related questions only), answers from UKPSC's official keys.
export interface PyqQ { n: number; t: string; q: string; o: string[]; a: number | null; e: string; link?: string; st?: string[][]; tail?: string; m?: { h: string[]; a: string[]; b: string[] } }
export interface PyqPaper {
  slug: string; title: string; short: string; paper: string; examDate: string; code: string; series: string;
  keyType: string; keyDate: string; keyUrl: string; order?: number; questions: PyqQ[];
}
const files = import.meta.glob('./pyq/*.json', { eager: true }) as Record<string, { default: PyqPaper }>;
export const PAPERS: PyqPaper[] = Object.values(files).map((m) => m.default).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const TOTAL = PAPERS.reduce((s, p) => s + p.questions.length, 0);
export const LETTER = ['A', 'B', 'C', 'D'];
