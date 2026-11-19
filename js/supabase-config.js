// Configuración y conexión a Supabase - Red Ebenezer
const SUPABASE_URL = 'https://hbrgshprbmkunxowvrjz.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_EWxWQkjaKfSAzapZud6FXA_bHm3PrhN';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);