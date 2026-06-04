/** Live Supabase topic IDs are UUIDs; mock demo cards use short ids like "t1". */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLiveTopicId(id: string): boolean {
  return UUID_RE.test(id);
}

export function topicDetailPath(topicId: string): string {
  return `/topics/${encodeURIComponent(topicId)}`;
}
