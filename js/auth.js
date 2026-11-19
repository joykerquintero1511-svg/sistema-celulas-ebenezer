// Autenticación y control de roles - Red Ebenezer

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            await redirigirSegunRol(session.user.id);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const btnLogin = document.getElementById('btn-login');
            const errorMsg = document.getElementById('error-msg');

            errorMsg.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'Verificando...';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                errorMsg.textContent = 'Correo o contraseña incorrectos.';
                errorMsg.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.textContent = 'Ingresar al Sistema';
                return;
            }

            await redirigirSegunRol(data.user.id);
        });
    }
});

async function redirigirSegunRol(userId) {
    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .single();

    if (error || !perfil) {
        const errorMsg = document.getElementById('error-msg');
        if (errorMsg) {
            errorMsg.textContent = 'Usuario sin perfil asignado. Contacta al administrador.';
            errorMsg.style.display = 'block';
        }
        await supabaseClient.auth.signOut();
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

    if (error || !perfil) {
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