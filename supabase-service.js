const { createClient } = require('@supabase/supabase-js');

// Ensure environment variables are loaded
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and service role key are required. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches authentication credentials for a given user and platform.
 * @param {string} userId - The unique identifier for the user.
 * @param {string} platform - The platform to fetch credentials for (e.g., 'google', 'notion').
 * @returns {Promise<object|null>} - The auth_state object or null if not found.
 */
async function getCredentials(userId, platform) {
  console.log(`Fetching credentials for user: ${userId}, platform: ${platform}`);
  const { data, error } = await supabase
    .from('playwright_auth_credentials')
    .select('auth_state')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single(); // Use .single() to get one record or null

  if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
    console.error('Error fetching credentials from Supabase:', error);
    throw new Error('Failed to fetch credentials from Supabase.');
  }

  if (data) {
    console.log(`Successfully fetched credentials for user: ${userId}, platform: ${platform}`);
    return data.auth_state;
  }

  console.log(`No credentials found for user: ${userId}, platform: ${platform}`);
  return null;
}

/**
 * Saves or updates authentication credentials for a user and platform.
 * This uses 'upsert' to either insert a new row or update an existing one.
 * @param {string} userId - The unique identifier for the user.
 * @param {string} platform - The platform to save credentials for.
 * @param {object} authState - The Playwright storageState JSON object.
 * @returns {Promise<void>}
 */
async function saveCredentials(userId, platform, authState) {
  console.log(`Saving credentials for user: ${userId}, platform: ${platform}`);
  const { error } = await supabase
    .from('playwright_auth_credentials')
    .upsert(
      {
        user_id: userId,
        platform: platform,
        auth_state: authState,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id, platform' // Specify conflict target
      }
    );

  if (error) {
    console.error('Error saving credentials to Supabase:', error);
    throw new Error('Failed to save credentials to Supabase.');
  }

  console.log(`Successfully saved credentials for user: ${userId}, platform: ${platform}`);
}

module.exports = {
  getCredentials,
  saveCredentials,
}; 