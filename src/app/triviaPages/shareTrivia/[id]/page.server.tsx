// page.server.tsx
import ShareTriviaPageClient from './ShareTriviaPageClient';
import { getAllTriviaIds } from '@/app/supabasefuncs/helperSupabaseFuncs';

export async function generateStaticParams() {
  const triviaIds = await getAllTriviaIds();
  return triviaIds.map((id) => ({ id }));
}

// `params` comes from Next.js routing
export default function ShareTriviaPage({ params }: { params: { id: string } }) {
  // Pass id to client component
  return <ShareTriviaPageClient triviaid={params.id} />;
}