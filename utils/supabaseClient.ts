
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amfnhqsrjrtcdtslpbas.supabase.co';
const supabaseKey = 'sb_publishable_9eC6NUgv7RMhKOqYgm674Q_97TjxRCf';

export const supabase = createClient(supabaseUrl, supabaseKey);
