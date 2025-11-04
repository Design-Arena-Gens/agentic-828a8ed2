import { NextResponse } from 'next/server';
import { fetchLatestItems } from '../../../lib/googleNews';
import { citations, craftHashtags, craftScript, craftThumbnailText, craftTitle, craftVisualPrompts, selectTopStories } from '../../../utils/generate';

export const revalidate = 60; // ISR for 1 minute

export async function GET() {
  try {
    const items = await fetchLatestItems();
    if (!items.length) {
      return NextResponse.json({ error: 'No items' }, { status: 503 });
    }
    const selected = selectTopStories(items, 3);

    const title = craftTitle(selected);
    const hashtags = craftHashtags(selected);
    const thumbnailText = craftThumbnailText(selected);
    const script = craftScript(selected);
    const visuals = craftVisualPrompts(selected);
    const cites = citations(selected);

    return NextResponse.json({ selected, title, hashtags, thumbnailText, script, visuals, citations: cites });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
