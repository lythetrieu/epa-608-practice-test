import { redirect } from 'next/navigation'

// The Weak Spots report has been merged into the main Progress page
// (radar + weak-spot list + drill CTA + recent tests). Old links from the
// sidebar/dashboard land here and get forwarded.
export default function WeakSpotsPage() {
  redirect('/progress')
}
