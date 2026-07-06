// Segment-level loading boundary: shows INSTANTLY when navigating between
// tabs/pages while the server renders the destination. Without this, a tap on
// the bottom tab bar gives zero feedback until the full RSC round-trip
// (auth + queries) finishes — the app feels frozen for 100–500ms.
export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading">
      <div className="w-7 h-7 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
