import PlayTriviaPageClient from './PlayTriviaPageClient';
import { getAllTriviaIds } from '@/app/supabasefuncs/helperSupabaseFuncs';

export async function generateStaticParams() {
  const triviaIds = await getAllTriviaIds();
  return triviaIds.map((id) => ({ id }));
}

export default function PlayTriviaPage({ params }: { params: { id: string } }) {
  return <PlayTriviaPageClient id={params.id} />;
}