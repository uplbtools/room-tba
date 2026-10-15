import { sequence } from '@sveltejs/kit/hooks';
import { legacyEntityRedirects } from '#lib/utils/legacy-entity-redirects.js';
import { supabaseHandle } from '#lib/supabase/session.js';

export const handle = sequence(legacyEntityRedirects, supabaseHandle);
