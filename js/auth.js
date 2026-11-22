// Autenticación, Registro con Aprobación y Control de Roles - Red Ebenezer

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

    // Si estamos en index.html (Login)
    if (loginForm) {
        // Mostrar mensaje si viene redirigido desde el registro
        const params = new URLSearchParams(window.location.search);
        if (params.get('registrado') === '1') {
            mostrarMensajeAuth('¡Solicitud enviada! Tu cuenta quedó pendiente de aprobación por el administrador.', 'success');
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            await verificarYRedirigir(session.user.id);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const btnLogin = document.getElementById('btn-login');

            document.getElementById('auth-msg').style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'Verificando...';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                mostrarMensajeAuth('Correo o contraseña incorrectos.', 'error');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            await verificarYRedirigir(data.user.id, btnLogin);
        });
    }

    // Si estamos en registro.html
    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('reg-nombre').value.trim();
            const celula = document.getElementById('reg-celula').value.trim();
            const categoria = document.getElementById('reg-categoria').value;
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const btnRegistro = document.getElementById('btn-registro');

            document.getElementById('auth-msg').style.display = 'none';
            btnRegistro.disabled = true;
            btnRegistro.textContent = 'Enviando solicitud...';

            // Los metadatos se envían a auth.users y el trigger handle_new_user() crea el perfil en public.perfiles
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nombre_completo: nombre,
                        nombre_celula: celula,
                        categoria_predeterminada: categoria
                    }
                }
            });

            if (authError) {
                mostrarMensajeAuth('Error al registrar: ' + authError.message, 'error');
                btnRegistro.disabled = false;
                btnRegistro.textContent = 'Enviar Solicitud';
                return;
            }

            if (authData.user) {
                // Cerramos cualquier sesión temporal y redirigimos al login con aviso
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html?registrado=1';
            }
        });
    }
});

async function verificarYRedirigir(userId, btnLogin = null) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('rol, aprobado')
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        mostrarMensajeAuth('Usuario sin perfil asignado. Contacta al administrador.', 'error');
        await supabaseClient.auth.signOut();
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar al Sistema';
        }
        return;
    }

    // Bloquear acceso si aún no ha sido aprobado por el admin
    if (!perfil.aprobado) {
        mostrarMensajeAuth('Tu cuenta aún está pendiente de aprobación por el administrador o líder de red.', 'error');
        await supabaseClient.auth.signOut();
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Ingresar al Sistema';
        }
        return;
    }

    if (perfil.rol === 'admin' || perfil.rol === 'lider_red') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'lider.html';
    }
}

async function verificarSesion(rolesPermitidos = []) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }

    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !perfil || !perfil.aprobado) {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(perfil.rol)) {
        window.location.href = perfil.rol === 'lider_celula' ? 'lider.html' : 'admin.html';
        return null;
    }

    return perfil;
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}