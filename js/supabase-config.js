// Configuración y conexión a Supabase - Red Ebenezer
const SUPABASE_URL = 'https://hbrgshprbmkunxowvrjz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EWxWQKjaKfSAzapZud6FXA_bHm3PrhN';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);