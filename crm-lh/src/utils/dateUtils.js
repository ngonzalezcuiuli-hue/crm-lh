export function hoursSince(timestamp) {
  const now = Date.now();
  return (now - new Date(timestamp).getTime()) / 36e5;
}
