import EditTriviaPageClient from './page';
import { getAllTriviaIds } from '@/app/supabasefuncs/helperSupabaseFuncs';

export async function generateStaticParams() {
  const triviaIds = await getAllTriviaIds();
  return triviaIds.map((id) => ({ id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <EditTriviaPageClient id={params.id} />;
}