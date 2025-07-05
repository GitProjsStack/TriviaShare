import { supabase } from '../supabase/supabaseClient';
import { ShareRecipient, TriviaContent } from '../interfaces/triviaTypes';

// Constants for table and column names
export const CLIENTS_TABLE = 'clients';
export const COL_MY_TRIVIA = 'my_trivia_games';
export const COL_SHARED_TRIVIA = 'trivia_games_shared_w_me';
export const COL_CREATOR_ID = 'creator_id';
export const COL_USERNAME = 'username';
export const COL_PROFILE_PIC = 'profile_pic_url';

export const TRIVIA_TABLE = 'triviagames';
export const COL_TRIVIA_ID = 'id';
export const COL_TRIVIA_TITLE = 'title';
export const COL_TRIVIA_STATUS = 'status';
export const COL_TRIVIA_CONTENT = 'content';
export const COL_TRIVIA_CREATED_AT = 'created_at';

const SELECT_CLIENT_FIELDS = [COL_CREATOR_ID, COL_USERNAME, COL_PROFILE_PIC].join(', ');
const AVATAR_BUCKET = 'avatars';

// Helper to format a Supabase user row into our ShareRecipient type
function toShareRecipient(user: {
  [COL_CREATOR_ID]: string;
  [COL_USERNAME]: string;
  [COL_PROFILE_PIC]: string | null;
}): ShareRecipient {
  return {
    id: user[COL_CREATOR_ID],
    username: user[COL_USERNAME],
    profile_pic_url: user[COL_PROFILE_PIC],
  };
}

// Get all trivia ids from the table
export async function getAllTriviaIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TRIVIA_TABLE)
    .select('id');

  if (error || !data) return [];

  return data.map((row) => row.id);
}

// Returns the currently logged-in user or null if not authenticated
export async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Used to search for users to share trivia with
export async function fetchMatchingUsersBySimilarName(name: string): Promise<ShareRecipient[]> {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .select(SELECT_CLIENT_FIELDS)
    .ilike(COL_USERNAME, `%${name}%`);

  if (error) {
    console.error(`❌ Error fetching users by name ${name}`, error.message);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    console.error(`❌ Error fetching users by name ${name}. No data returned`);
    return [];
  }

  return ((data as unknown) as {
    [COL_CREATOR_ID]: string;
    [COL_USERNAME]: string;
    [COL_PROFILE_PIC]: string | null;
  }[]).map(toShareRecipient);
}

// Signs the user out and optionally performs a callback afterward
export async function handleSignOut(afterSignOut?: () => void): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert('Error signing out: ' + error.message);
    return;
  }
  if (afterSignOut) afterSignOut();
}

// Retrieves full client profile by ID
export async function getUSERProfile(userId: string) {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .select('*')
    .eq(COL_CREATOR_ID, userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

// Uploads new profile picture to Supabase Storage + updates DB
export async function uploadToUSERProfilePics(
  userID: string,
  filePath: string,
  file: File,
  oldFilePath?: string
): Promise<boolean> {
  // Delete the old profile picture if it exists
  if (oldFilePath) {
    const { error: deleteError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([oldFilePath]);

    if (deleteError) {
      console.error('Error deleting old user profile pic:', deleteError);
    }
  }

  // Upload new profile pic
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return false;
  }

  // Update database with new image path
  const { error: updateError } = await supabase
    .from(CLIENTS_TABLE)
    .update({ profile_pic_url: filePath })
    .eq(COL_CREATOR_ID, userID);

  if (updateError) {
    console.error('DB update failed:', updateError);
    return false;
  }

  return true;
}

// Returns a list of trivia IDs that were shared with the given user
export async function getAllTriviaSharedWithUser(user: ShareRecipient): Promise<string[] | null> {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .select(COL_SHARED_TRIVIA)
    .eq(COL_CREATOR_ID, user.id)
    .single();

  if (error || !data) return null;

  return data[COL_SHARED_TRIVIA] || [];
}

// Overwrites shared trivia list for a given user
export async function updateTriviaSharedWithUser(userId: string, updated: string[]): Promise<boolean> {
  const { error } = await supabase
    .from(CLIENTS_TABLE)
    .update({ [COL_SHARED_TRIVIA]: updated })
    .eq(COL_CREATOR_ID, userId);

  return !error;
}

// Gets a signed URL for temporary access to profile pic
export async function generateUSERProfilePicSignedUrl(filePath: string, expiresInSeconds = 60): Promise<string | null> {
  const { data, error } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

// Gets the full trivia objects for games created by the user
export async function getMyTriviaGames(userId: string) {
  const { data: clientData, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select(COL_MY_TRIVIA)
    .eq(COL_CREATOR_ID, userId)
    .single();

  if (clientError || !clientData || !clientData[COL_MY_TRIVIA]) return [];

  const triviaIds: string[] = clientData[COL_MY_TRIVIA];
  if (triviaIds.length === 0) return [];

  const { data: triviaData, error: triviaError } = await supabase
    .from(TRIVIA_TABLE)
    .select('*')
    .in(COL_TRIVIA_ID, triviaIds)
    .order(COL_TRIVIA_CREATED_AT, { ascending: true });

  if (triviaError || !triviaData) return [];

  return triviaData;
}

// Creates a new trivia game row
export async function createTriviaGame(trivia: {
  creator_id: string;
  title: string;
  status: string;
  content: TriviaContent;
}): Promise<{ success: boolean; triviaId?: string; createdAt?: string; error?: string }> {
  const { data, error } = await supabase
    .from(TRIVIA_TABLE)
    .insert([trivia])
    .select('id, created_at')
    .single();

  if (error || !data) return { success: false, error: error?.message || 'Unknown error' };
  return { success: true, triviaId: data.id, createdAt: data.created_at };
}

// Adds a trivia ID to the user's personal trivia list
export async function addTriviaIdToClient(
  userId: string,
  triviaId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: clientData, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select(COL_MY_TRIVIA)
    .eq(COL_CREATOR_ID, userId)
    .single();

  if (clientError || !clientData) return { success: false, error: clientError?.message || 'Client not found' };

  const currentList: string[] = clientData[COL_MY_TRIVIA] || [];
  if (currentList.includes(triviaId)) return { success: true };

  const updatedList = [...currentList, triviaId];

  const { error: updateError } = await supabase
    .from(CLIENTS_TABLE)
    .update({ [COL_MY_TRIVIA]: updatedList })
    .eq(COL_CREATOR_ID, userId);

  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}

// Gets full trivia row by ID
export async function getTriviaById(id: string) {
  const { data, error } = await supabase
    .from(TRIVIA_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return { error: error?.message || 'Trivia not found', trivia: null };
  return { trivia: data, error: null };
}

// Replaces the content field of a trivia
export async function updateTriviaContent(triviaId: string, content: TriviaContent) {
  const { data, error } = await supabase
    .from(TRIVIA_TABLE)
    .update({ content })
    .eq('id', triviaId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Updates the status (e.g., 'completed') for a trivia game
export async function updateTriviaStatus(triviaId: string, status: string) {
  const { data, error } = await supabase
    .from(TRIVIA_TABLE)
    .update({ status })
    .eq('id', triviaId);

  if (error) throw new Error(error.message);
  return data;
}

// Deletes a trivia game and removes all references from users
export async function deleteTriviaById(triviaId: string): Promise<{ success: boolean; error?: string }> {
  // Delete from triviagames table
  const { error: deleteError } = await supabase
    .from(TRIVIA_TABLE)
    .delete()
    .eq(COL_TRIVIA_ID, triviaId);

  if (deleteError) return { success: false, error: deleteError.message };

  // Now clean up all client references to that trivia
  const { data: clients, error: clientsError } = await supabase
    .from(CLIENTS_TABLE)
    .select(`${COL_CREATOR_ID}, ${COL_MY_TRIVIA}, ${COL_SHARED_TRIVIA}`);

  if (clientsError || !clients) return { success: true };

  for (const client of clients) {
    const updates: Record<string, string[] | undefined> = {};

    if (Array.isArray(client[COL_MY_TRIVIA])) {
      const updatedMyTrivia = client[COL_MY_TRIVIA].filter((id: string) => id !== triviaId);
      if (updatedMyTrivia.length !== client[COL_MY_TRIVIA].length) {
        updates[COL_MY_TRIVIA] = updatedMyTrivia;
      }
    }

    if (Array.isArray(client[COL_SHARED_TRIVIA])) {
      const updatedShared = client[COL_SHARED_TRIVIA].filter((id: string) => id !== triviaId);
      if (updatedShared.length !== client[COL_SHARED_TRIVIA].length) {
        updates[COL_SHARED_TRIVIA] = updatedShared;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from(CLIENTS_TABLE)
        .update(updates)
        .eq(COL_CREATOR_ID, client[COL_CREATOR_ID]);

      if (updateError) {
        console.warn(`Failed to update client ${client[COL_CREATOR_ID]}`, updateError.message);
      }
    }
  }

  return { success: true };
}

// Gets all trivia shared with the user, including the sharer's name and profile
export async function getSharedTriviasWithSharerInfo(userId: string): Promise<
  Array<{
    triviaId: string;
    title: string;
    creatorId: string;
    sharerUsername: string;
    sharerProfilePicUrl: string | null;
  }>
> {
  const { data: clientData, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select(COL_SHARED_TRIVIA)
    .eq(COL_CREATOR_ID, userId)
    .single();

  if (clientError || !clientData) return [];

  const sharedTriviaIds: string[] = clientData[COL_SHARED_TRIVIA];
  if (!sharedTriviaIds || sharedTriviaIds.length === 0) return [];

  const { data: triviaData, error: triviaError } = await supabase
    .from(TRIVIA_TABLE)
    .select(`${COL_TRIVIA_ID}, ${COL_TRIVIA_TITLE}, ${COL_CREATOR_ID}`)
    .in(COL_TRIVIA_ID, sharedTriviaIds);

  if (triviaError || !triviaData) return [];

  const uniqueCreatorIds = Array.from(new Set(triviaData.map(t => t.creator_id)));

  const { data: creatorsData, error: creatorsError } = await supabase
    .from(CLIENTS_TABLE)
    .select(`${COL_CREATOR_ID}, ${COL_USERNAME}, ${COL_PROFILE_PIC}`)
    .in(COL_CREATOR_ID, uniqueCreatorIds);

  if (creatorsError || !creatorsData) return [];

  const creatorMap = new Map(
    creatorsData.map(c => [c[COL_CREATOR_ID], { username: c[COL_USERNAME], profile_pic_url: c[COL_PROFILE_PIC] }])
  );

  return triviaData.map(t => ({
    triviaId: t[COL_TRIVIA_ID],
    title: t[COL_TRIVIA_TITLE],
    creatorId: t[COL_CREATOR_ID],
    sharerUsername: creatorMap.get(t[COL_CREATOR_ID])?.username || 'Unknown',
    sharerProfilePicUrl: creatorMap.get(t[COL_CREATOR_ID])?.profile_pic_url || null,
  }));
}

// Removes a trivia ID from the user's shared list
export async function removeTriviaFromSharedWithMe(userId: string, triviaIdToRemove: string): Promise<boolean> {
  const { data: clientData, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select(COL_SHARED_TRIVIA)
    .eq(COL_CREATOR_ID, userId)
    .single();

  if (clientError || !clientData) return false;

  const currentList: string[] = clientData[COL_SHARED_TRIVIA] || [];
  const updatedList = currentList.filter(id => id !== triviaIdToRemove);

  const { error: updateError } = await supabase
    .from(CLIENTS_TABLE)
    .update({ [COL_SHARED_TRIVIA]: updatedList })
    .eq(COL_CREATOR_ID, userId);

  return !updateError;
}