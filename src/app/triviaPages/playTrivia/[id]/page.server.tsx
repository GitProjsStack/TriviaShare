import { getAllTriviaIds } from '@/app/supabasefuncs/helperSupabaseFuncs';

export async function generateStaticParams() {
  const triviaIds = await getAllTriviaIds();
  return triviaIds.map((id) => ({ id }));
}