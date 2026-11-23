// Lógica del Panel del Líder Celular - Red Ebenezer

let perfilActual = null;

function obtenerFechaHoyLocal() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    perfilActual = await verificarSesion(['lider_celula', 'admin', 'lider_red']);
    if (!perfilActual) return;

    document.getElementById('nav-user-name').textContent = perfilActual.nombre_completo;
    const navCelula = document.getElementById('nav-celula-nombre');
    if (navCelula && perfilActual.nombre_celula) {
        navCelula.textContent = perfilActual.nombre_celula;
    }

    document.getElementById('fecha_reunion').value = obtenerFechaHoyLocal();

    if (perfilActual.categoria_predeterminada) {
        document.getElementById('categoria_celula').value = perfilActual.categoria_predeterminada;
    }

    await cargarMisReportes();
    document.getElementById('reporte-form').addEventListener('submit', guardarReporte);
});

function cambiarConteo(campoId, delta) {
    const input = document.getElementById(campoId);
    let valor = parseInt(input.value, 10) || 0;
    valor = Math.max(0, valor + delta);
    input.value = valor;
    actualizarTotal();
}

function actualizarTotal() {
    const total =
        (parseInt(document.getElementById('hombres').value, 10) || 0) +
        (parseInt(document.getElementById('mujeres').value, 10) || 0) +
        (parseInt(document.getElementById('jovenes').value, 10) || 0) +
        (parseInt(document.getElementById('jovencitas').value, 10) || 0) +
        (parseInt(document.getElementById('ninos').value, 10) || 0);

    document.getElementById('total-asistentes').textContent = total;
}

async function guardarReporte(e) {
    e.preventDefault();
    const alertBox = document.getElementById('alert-box');
    const btnGuardar = document.getElementById('btn-guardar');

    const hombres = parseInt(document.getElementById('hombres').value, 10) || 0;
    const mujeres = parseInt(document.getElementById('mujeres').value, 10) || 0;
    const jovenes = parseInt(document.getElementById('jovenes').value, 10) || 0;
    const jovencitas = parseInt(document.getElementById('jovencitas').value, 10) || 0;
    const ninos = parseInt(document.getElementById('ninos').value, 10) || 0;
    const ubicacionInput = document.getElementById('ubicacion');
    const ubicacion = ubicacionInput ? ubicacionInput.value.trim() : '';

    if (hombres + mujeres + jovenes + jovencitas + ninos === 0) {
        mostrarAlerta('Debes registrar al menos 1 asistente en la célula.', 'error');
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando reporte...';
    alertBox.style.display = 'none';

    const nuevoReporte = {
        lider_id: perfilActual.id,
        fecha_reunion: document.getElementById('fecha_reunion').value,
        ubicacion: ubicacion || null,
        categoria_celula: document.getElementById('categoria_celula').value,
        tipo_celula: document.getElementById('tipo_celula').value,
        hombres,
        mujeres,
        jovenes,
        jovencitas,
        ninos,
        observaciones: document.getElementById('observaciones').value.trim()
    };

    const { error } = await supabaseClient
        .from('reportes_celulas')
        .insert([nuevoReporte]);

    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Enviar Reporte';

    if (error) {
        console.error(error);
        mostrarAlerta('Error al guardar el reporte: ' + error.message, 'error');
        return;
    }

    mostrarAlerta('¡Reporte enviado con éxito! Dios te bendiga.', 'success');

    ['hombres', 'mujeres', 'jovenes', 'jovencitas', 'ninos'].forEach(id => {
        document.getElementById(id).value = 0;
    });
    if (ubicacionInput) ubicacionInput.value = '';
    document.getElementById('observaciones').value = '';
    actualizarTotal();

    await cargarMisReportes();
}

async function cargarMisReportes() {
    const tbody = document.getElementById('tabla-mis-reportes');

    const { data, error } = await supabaseClient
        .from('reportes_celulas')
        .select('*')
        .eq('lider_id', perfilActual.id)
        .order('fecha_reunion', { ascending: false })
        .limit(20);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Error al cargar historial.</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Aún no has enviado reportes.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${formatearFecha(r.fecha_reunion)}</td>
            <td><span class="badge-cat">${r.categoria_celula}</span></td>
            <td>${r.tipo_celula}</td>
            <td>${r.hombres}</td>
            <td>${r.mujeres}</td>
            <td>${r.jovenes}</td>
            <td>${r.jovencitas}</td>
            <td>${r.ninos}</td>
            <td><strong>${calcularTotalAsistencia(r)}</strong></td>
        </tr>
    `).join('');
}

function mostrarAlerta(mensaje, tipo) {
    const alertBox = document.getElementById('alert-box');
    alertBox.textContent = mensaje;
    alertBox.className = `alert alert-${tipo}`;
    alertBox.style.display = 'block';
}