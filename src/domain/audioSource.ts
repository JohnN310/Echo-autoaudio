// Playlist.add forwards directly to native code, unlike useAudioPlayer.
// Native queue entries must contain a URI, not just a Metro asset ID.
export function queueSource(
  source: number | string,
  name: string,
  resolveAsset: (id: number) => { localUri: string | null; uri: string },
) {
  const asset = typeof source === "number" ? resolveAsset(source) : null;
  const uri = asset ? asset.localUri || asset.uri : source as string;
  if (!uri) throw new Error(`Missing audio file for ${name}`);
  return { uri, name };
}
