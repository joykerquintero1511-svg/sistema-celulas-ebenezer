// Lógica del Panel Administrativo y Líder de Red - Red Ebenezer

let todosLosReportes = [];
let mapaLideres = {};

document.addEventListener('DOMContentLoaded', async () => {
    const perfil = await verificarSesion(['admin', 'lider_red']);
    if (!perfil) return;

    document.getElementById('nav-user-name').textContent = perfil.nombre_completo;

    await cargarLideres();
    await cargarTodosLosReportes();
    aplicarFiltros();
});

async function cargarLideres() {
    const { data, error } = await supabaseClient
        .from('perfiles')
        .select('id, nombre_completo, nombre_celula')
        .order('nombre_completo', { ascending: true });

    if (error || !data) return;

    const selectLider = document.getElementById('filtro-lider');
    data.forEach(lider => {
        mapaLideres[lider.id] = lider;
        const option = document.createElement('option');
        option.value = lider.id;
        option.textContent = lider.nombre_celula
            ? `${lider.nombre_completo} (${lider.nombre_celula})`
            : lider.nombre_completo;
        selectLider.appendChild(option);
    });
}

async function cargarTodosLosReportes() {
    const { data, error } = await supabaseClient
        .from('reportes_celulas')
        .select('*')
        .order('fecha_reunion', { ascending: false });

    if (error) {
        console.error(error);
        document.getElementById('tabla-admin-reportes').innerHTML =
            `<tr><td colspan="11" style="text-align:center;color:red;">Error al cargar reportes.</td></tr>`;
        return;
    }

    todosLosReportes = data || [];
}

function manejarCambioPeriodo() {
    const periodo = document.getElementById('filtro-periodo').value;
    const mostrarRango = periodo === 'personalizado';
    document.getElementById('grupo-fecha-inicio').style.display = mostrarRango ? 'block' : 'none';
    document.getElementById('grupo-fecha-fin').style.display = mostrarRango ? 'block' : 'none';
    aplicarFiltros();
}

function aplicarFiltros() {
    const periodo = document.getElementById('filtro-periodo').value;
    const liderId = document.getElementById('filtro-lider').value;
    const categoria = document.getElementById('filtro-categoria').value;
    const tipo = document.getElementById('filtro-tipo').value;

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const inicioSemana = obtenerInicioSemana(hoyStr);
    const finSemana = obtenerFinSemana(hoyStr);
    const mesActual = hoyStr.slice(0, 7); // YYYY-MM
    const anioActual = hoyStr.slice(0, 4); // YYYY

    let textoPeriodoPrint = 'Período: Historial Completo';

    const filtrados = todosLosReportes.filter(r => {
        // Filtro por fecha
        if (periodo === 'semana') {
            textoPeriodoPrint = `Período Semanal (${formatearFecha(inicioSemana)} al ${formatearFecha(finSemana)})`;
            if (r.fecha_reunion < inicioSemana || r.fecha_reunion > finSemana) return false;
        } else if (periodo === 'mes') {
            textoPeriodoPrint = `Período Mensual (${mesActual})`;
            if (!r.fecha_reunion.startsWith(mesActual)) return false;
        } else if (periodo === 'anio') {
            textoPeriodoPrint = `Período Anual (${anioActual})`;
            if (!r.fecha_reunion.startsWith(anioActual)) return false;
        } else if (periodo === 'personalizado') {
            const fInicio = document.getElementById('fecha-inicio').value;
            const fFin = document.getElementById('fecha-fin').value;
            textoPeriodoPrint = `Período: ${fInicio ? formatearFecha(fInicio) : 'Inicio'} hasta ${fFin ? formatearFecha(fFin) : 'Hoy'}`;
            if (fInicio && r.fecha_reunion < fInicio) return false;
            if (fFin && r.fecha_reunion > fFin) return false;
        }

        // Filtro por líder
        if (liderId !== 'todos' && r.lider_id !== liderId) return false;

        // Filtro por categoría (Adultos, Jóvenes, Niños)
        if (categoria !== 'todas' && r.categoria_celula !== categoria) return false;

        // Filtro por tipo (Oración, Crecimiento, Discipulado)
        if (tipo !== 'todos' && r.tipo_celula !== tipo) return false;

        return true;
    });

    document.getElementById('print-periodo-texto').textContent = textoPeriodoPrint;
    actualizarEstadisticas(filtrados);
    renderizarTabla(filtrados);
}

function actualizarEstadisticas(reportes) {
    let totalHombres = 0;
    let totalMujeres = 0;
    let totalJovenes = 0;
    let totalJovencitas = 0;
    let totalNinos = 0;

    let countOracion = 0;
    let countCrecimiento = 0;
    let countDiscipulado = 0;

    reportes.forEach(r => {
        totalHombres += Number(r.hombres || 0);
        totalMujeres += Number(r.mujeres || 0);
        totalJovenes += Number(r.jovenes || 0);
        totalJovencitas += Number(r.jovencitas || 0);
        totalNinos += Number(r.ninos || 0);

        if (r.tipo_celula === 'Oración') countOracion++;
        if (r.tipo_celula === 'Crecimiento') countCrecimiento++;
        if (r.tipo_celula === 'Discipulado') countDiscipulado++;
    });

    const totalPersonas = totalHombres + totalMujeres + totalJovenes + totalJovencitas + totalNinos;

    document.getElementById('stat-total-celulas').textContent = reportes.length;
    document.getElementById('stat-total-personas').textContent = totalPersonas;
    document.getElementById('stat-por-tipo').textContent = `${countOracion} Ora | ${countCrecimiento} Crec | ${countDiscipulado} Disc`;
    document.getElementById('stat-hombres').textContent = totalHombres;
    document.getElementById('stat-mujeres').textContent = totalMujeres;
    document.getElementById('stat-jovenes').textContent = totalJovenes;
    document.getElementById('stat-jovencitas').textContent = totalJovencitas;
    document.getElementById('stat-ninos').textContent = totalNinos;
}

function renderizarTabla(reportes) {
    const tbody = document.getElementById('tabla-admin-reportes');
    document.getElementById('contador-registros').textContent = `${reportes.length} registro(s)`;

    if (reportes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No hay reportes para los filtros seleccionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = reportes.map(r => {
        const liderInfo = mapaLideres[r.lider_id];
        const nombreLider = liderInfo ? liderInfo.nombre_completo : 'Líder';
        const nombreCelula = liderInfo && liderInfo.nombre_celula ? `<br><small style="color:#666;">${liderInfo.nombre_celula}</small>` : '';

        return `
            <tr>
                <td>${formatearFecha(r.fecha_reunion)}</td>
                <td><strong>${nombreLider}</strong>${nombreCelula}</td>
                <td><span class="badge-cat">${r.categoria_celula}</span></td>
                <td>${r.tipo_celula}</td>
                <td>${r.hombres}</td>
                <td>${r.mujeres}</td>
                <td>${r.jovenes}</td>
                <td>${r.jovencitas}</td>
                <td>${r.ninos}</td>
                <td><strong>${calcularTotalAsistencia(r)}</strong></td>
                <td>${r.observaciones || '-'}</td>
            </tr>
        `;
    }).join('');
}

function imprimirPDF() {
    window.print();
}