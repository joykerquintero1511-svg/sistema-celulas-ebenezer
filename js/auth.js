// Autenticación por Teléfono (Líderes) y Clave Administrativa (Panel Admin) - Red Ebenezer

const SESSION_KEY = 'ebenezer_user_id';
const ADMIN_SESSION_KEY = 'ebenezer_admin_auth';
const ADMIN_PASS = 'ebenezer2026';

function normalizarTelefono(tel) {
    return tel.replace(/[\s\-\(\)]/g, '').trim();
}

function mostrarMensajeAuth(texto, tipo = 'error') {
    const authMsg = document.getElementById('auth-msg');
    if (!authMsg) return;
    authMsg.textContent = texto;
    authMsg.className = `alert alert-${tipo}`;
    authMsg.style.display = 'block';
}

function toggleAdminLogin() {
    const box = document.getElementById('admin-login-box');
    if (!box) return;
    const estaOculto = box.style.display === 'none' || box.style.display === '';
    box.style.display = estaOculto ? 'block' : 'none';
    if (estaOculto) {
        document.getElementById('admin-password').focus();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const registroForm = document.getElementById('registro-form');

    if (loginForm) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('registrado') === '1') {
            mostrarMensajeAuth('¡Solicitud enviada! Tu cuenta quedó pendiente de aprobación por el administrador.', 'success');
        }

        if (localStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
            window.location.href = 'admin.html';
            return;
        }

        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
            await verificarYRedirigirLider(savedUserId);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const telefono = normalizarTelefono(document.getElementById('telefono').value);
            const btnLogin = document.getElementById('btn-login');

            document.getElementById('auth-msg').style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'Verificando...';

            const { data: perfil, error } = await supabaseClient
                .from('perfiles')
                .select('id, aprobado')
                .eq('telefono', telefono)
                .maybeSingle();

            if (error || !perfil) {
                mostrarMensajeAuth('Este número de teléfono no está registrado. Regístrate primero.', 'error');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            if (!perfil.aprobado) {
                mostrarMensajeAuth('Tu solicitud aún está pendiente de aprobación por el administrador.', 'error');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            localStorage.removeItem(ADMIN_SESSION_KEY);
            localStorage.setItem(SESSION_KEY, perfil.id);
            window.location.href = 'lider.html';
        });

        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pass = document.getElementById('admin-password').value.trim();

                if (pass !== ADMIN_PASS) {
                    mostrarMensajeAuth('Clave administrativa incorrecta.', 'error');
                    return;
                }

                const { data: adminPerfil } = await supabaseClient
                    .from('perfiles')
                    .select('id')
                    .eq('rol', 'admin')
                    .limit(1)
                    .maybeSingle();

                if (adminPerfil) {
                    localStorage.setItem(SESSION_KEY, adminPerfil.id);
                }
                localStorage.setItem(ADMIN_SESSION_KEY, 'true');
                window.location.href = 'admin.html';
            });
        }
    }

    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value.trim();
            const telefono = normalizarTelefono(document.getElementById('reg-telefono').value);
            const categoria = document.getElementById('reg-categoria').value;
            const btnRegistro = document.getElementById('btn-registro');

            if (telefono.length < 7) {
                mostrarMensajeAuth('Por favor ingresa un número de teléfono válido.', 'error');
                return;
            }

            document.getElementById('auth-msg').style.display = 'none';
            btnRegistro.disabled = true;
            btnRegistro.textContent = 'Enviando solicitud...';

            const { data: existente } = await supabaseClient
                .from('perfiles')
                .select('id')
                .eq('telefono', telefono)
                .maybeSingle();

            if (existente) {
                mostrarMensajeAuth('Este número de teléfono ya tiene una solicitud o cuenta registrada.', 'error');
                btnRegistro.disabled = false;
                btnRegistro.textContent = 'Enviar Solicitud';
                return;
            }

            const { error: insertError } = await supabaseClient
                .from('perfiles')
                .insert([{
                    nombre_completo: nombre,
                    telefono: telefono,
                    rol: 'lider_celula',
                    nombre_celula: null,
                    categoria_predeterminada: categoria,
                    aprobado: false
                }]);

            if (insertError) {
                mostrarMensajeAuth('Error al enviar solicitud: ' + insertError.message, 'error');
                btnRegistro.disabled = false;
                btnRegistro.textContent = 'Enviar Solicitud';
                return;
            }

            window.location.href = 'index.html?registrado=1';
        });
    }
});

async function verificarYRedirigirLider(userId) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('aprobado')
        .eq('id', userId)
        .maybeSingle();

    if (error || !perfil || !perfil.aprobado) {
        localStorage.removeItem(SESSION_KEY);
        return;
    }

    window.location.href = 'lider.html';
}

async function verificarSesion(rolesPermitidos = []) {
    const esAdminRuta = rolesPermitidos.includes('admin') || rolesPermitidos.includes('lider_red');
    const soloAdmin = esAdminRuta && !rolesPermitidos.includes('lider_celula');

    if (soloAdmin) {
        if (localStorage.getItem(ADMIN_SESSION_KEY) !== 'true') {
            window.location.href = 'index.html';
            return null;
        }

        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
            const { data: perfil } = await supabaseClient
                .from('perfiles')
                .select('*')
                .eq('id', savedUserId)
                .maybeSingle();

            if (perfil) return perfil;
        }

        return {
            id: null,
            nombre_completo: 'Administración Red Ebenezer',
            rol: 'admin',
            aprobado: true
        };
    }

    const savedUserId = localStorage.getItem(SESSION_KEY);
    if (!savedUserId) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('*')
        .eq('id', savedUserId)
        .maybeSingle();

    if (error || !perfil || !perfil.aprobado) {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
        return null;
    }

    return perfil;
}

async function cerrarSesion() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = 'index.html';
}