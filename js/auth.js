// Autenticación por Teléfono, Registro con Aprobación y Control de Roles - Red Ebenezer

const SESSION_KEY = 'ebenezer_user_id';

function normalizarTelefono(tel) {
    // Elimina espacios, guiones y paréntesis para evitar errores al escribirlo
    return tel.replace(/[\s\-\(\)]/g, '').trim();
}

function mostrarMensajeAuth(texto, tipo = 'error') {
    const authMsg = document.getElementById('auth-msg');
    if (!authMsg) return;
    authMsg.textContent = texto;
    authMsg.className = `alert alert-${tipo}`;
    authMsg.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const registroForm = document.getElementById('registro-form');

    // Si estamos en index.html (Login por teléfono)
    if (loginForm) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('registrado') === '1') {
            mostrarMensajeAuth('¡Solicitud enviada! Tu cuenta quedó pendiente de aprobación por el administrador.', 'success');
        }

        // Si ya hay una sesión guardada, validar y redirigir
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
            await verificarYRedirigir(savedUserId, null, true);
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
                .select('id, rol, aprobado')
                .eq('telefono', telefono)
                .maybeSingle();

            if (error || !perfil) {
                mostrarMensajeAuth('Este número de teléfono no está registrado. Regístrate primero.', 'error');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            if (!perfil.aprobado) {
                mostrarMensajeAuth('Tu solicitud aún está pendiente de aprobación por el administrador o líder de red.', 'error');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            localStorage.setItem(SESSION_KEY, perfil.id);
            redireccionarPorRol(perfil.rol);
        });
    }

    // Si estamos en registro.html
    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value.trim();
            const telefono = normalizarTelefono(document.getElementById('reg-telefono').value);
            const celula = document.getElementById('reg-celula').value.trim();
            const categoria = document.getElementById('reg-categoria').value;
            const btnRegistro = document.getElementById('btn-registro');

            if (telefono.length < 7) {
                mostrarMensajeAuth('Por favor ingresa un número de teléfono válido.', 'error');
                return;
            }

            document.getElementById('auth-msg').style.display = 'none';
            btnRegistro.disabled = true;
            btnRegistro.textContent = 'Enviando solicitud...';

            // Verificar si el teléfono ya existe
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
                    nombre_celula: celula,
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

function redireccionarPorRol(rol) {
    if (rol === 'admin' || rol === 'lider_red') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'lider.html';
    }
}

async function verificarYRedirigir(userId, btnLogin = null, silencioso = false) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('rol, aprobado')
        .eq('id', userId)
        .maybeSingle();

    if (error || !perfil || !perfil.aprobado) {
        localStorage.removeItem(SESSION_KEY);
        if (!silencioso) {
            mostrarMensajeAuth('Tu sesión expiró o tu cuenta está pendiente de aprobación.', 'error');
        }
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar al Sistema';
        }
        return;
    }

    redireccionarPorRol(perfil.rol);
}

async function verificarSesion(rolesPermitidos = []) {
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

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(perfil.rol)) {
        redireccionarPorRol(perfil.rol);
        return null;
    }

    return perfil;
}

async function cerrarSesion() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}