// This route is deprecated — game is now handled inline in /[slug]
// Redirect to the event page if anyone lands here directly
import { redirect } from 'next/navigation'

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/${slug}`)
}
