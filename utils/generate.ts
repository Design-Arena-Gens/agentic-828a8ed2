import type { ParsedItem } from '../lib/googleNews';

export function selectTopStories(items: ParsedItem[], max = 3): ParsedItem[] {
  // Prefer diversity between tech and space by picking alternately if possible
  const tags = (t: string) => ({
    isSpace: /space|nasa|spacex|rocket|orbit|moon|mars|asteroid|cosmos/i.test(t),
    isAI: /ai|artificial intelligence|gpt|llm|openai|anthropic|google|deepmind|model/i.test(t)
  });

  const picked: ParsedItem[] = [];
  for (const it of items) {
    if (picked.length >= max) break;
    const t = tags(it.title);
    if (picked.length === 0) {
      picked.push(it);
      continue;
    }
    const hasSpace = picked.some(p => tags(p.title).isSpace);
    const hasAI = picked.some(p => tags(p.title).isAI);
    if ((!hasSpace && t.isSpace) || (!hasAI && t.isAI) || picked.length < 2) {
      picked.push(it);
    }
  }
  // fill if less than max
  for (const it of items) {
    if (picked.length >= max) break;
    if (!picked.find(p => p.title === it.title)) picked.push(it);
  }
  return picked.slice(0, max);
}

export function craftHashtags(items: ParsedItem[]): string[] {
  const base = ['#TechNews', '#Space', '#AI', '#Science', '#YouTubeShorts'];
  const extra: string[] = [];
  const add = (t: string) => { if (!extra.includes(t)) extra.push(t); };
  for (const it of items) {
    if (/spacex/i.test(it.title)) add('#SpaceX');
    if (/nasa/i.test(it.title)) add('#NASA');
    if (/ai|gpt|llm|model/i.test(it.title)) add('#ArtificialIntelligence');
    if (/rocket|launch/i.test(it.title)) add('#RocketLaunch');
    if (/moon|mars/i.test(it.title)) add('#Mars');
    if (/quantum/i.test(it.title)) add('#Quantum');
  }
  return [...base, ...extra].slice(0, 8);
}

export function craftTitle(items: ParsedItem[]): string {
  if (items.length === 1) return punchy(items[0].title);
  const parts = items.slice(0, 3).map(i => punchy(i.title));
  return `Today in Tech & Space: ${parts.join(' ? ')}`.slice(0, 90);
}

export function craftThumbnailText(items: ParsedItem[]): string {
  const t = punchy(items[0]?.title || 'Big Tech & Space Update');
  return t.toUpperCase().slice(0, 26);
}

export function craftVisualPrompts(items: ParsedItem[]): string[] {
  return items.map((i, idx) => `Scene ${idx+1}: ${visualPrompt(i.title)}`);
}

export function craftScript(items: ParsedItem[]): string {
  // Keep ~100-120 words
  const hook = hookLine(items);
  const lines = items.map((it, idx) => {
    const s = summarizeTitleAndSnippet(it.title, it.snippet || '');
    return `${idx+1}. ${s}`;
  });
  const outro = 'Follow for daily tech and space in under a minute!';
  const script = [hook, ...lines, outro].join('\n');
  return clipToWords(script, 120);
}

export function citations(items: ParsedItem[]): { title: string; url: string }[] {
  return items.map(i => ({ title: i.title, url: i.link }));
}

function summarizeTitleAndSnippet(title: string, snippet: string): string {
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  const short = cleaned.length > 140 ? cleaned.slice(0, 137) + '?' : cleaned;
  // Prefer informative title; merge
  const merged = `${punchy(title)} ? ${short || 'details via source'}`;
  return merged;
}

function hookLine(items: ParsedItem[]): string {
  if (items.some(i => /spacex|launch|nasa/i.test(i.title))) return 'Did you know? Space is having a big day!';
  if (items.some(i => /ai|gpt|model|deepmind|openai/i.test(i.title))) return 'Quick tech check: massive AI moves today!';
  return 'Here are the biggest tech and space stories right now:';
}

function visualPrompt(title: string): string {
  if (/spacex|launch|rocket/i.test(title)) return 'Cinematic rocket launch at dawn, billowing smoke, vertical 9:16, ultra-detailed, high contrast, dramatic lighting';
  if (/nasa|moon|mars|rover/i.test(title)) return 'Mars landscape with rover, dust storm, cinematic lighting, vertical 9:16, high-detail';
  if (/ai|robot|chip|semiconductor/i.test(title)) return 'Futuristic AI data streams over cityscape, neon, depth, vertical 9:16';
  return 'Dynamic tech-and-space mashup, stars, circuitry, motion blur, vertical 9:16';
}

function punchy(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[:\-??]+/g, ': ').trim();
}

function clipToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '?';
}
