// Lógica del Panel Administrativo Estadístico - Red Ebenezer

let todosLosReportes = [];
let mapaLideres = {};
let chartAsistencia = null;
let chartTipos = null;

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
        .select('*')
        .order('aprobado', { ascending: true })
        .order('nombre_completo', { ascending: true });

    if (error || !data) return;

    const selectLider = document.getElementById('filtro-lider');
    const tbodyLideres = document.getElementById('tabla-gestion-lideres');
    let pendientes = 0;
    mapaLideres = {};

    selectLider.innerHTML = '<option value="todos">Todos los Líderes</option>';

    tbodyLideres.innerHTML = data.map(lider => {
        mapaLideres[lider.id] = lider;

        if (!lider.aprobado) pendientes++;

        if (lider.aprobado) {
            const option = document.createElement('option');
            option.value = lider.id;
            option.textContent = lider.nombre_celula
                ? `${lider.nombre_completo} (${lider.nombre_celula})`
                : lider.nombre_completo;
            selectLider.appendChild(option);
        }

        const telefonoHtml = lider.telefono
            ? `<br><small style="color:var(--text-muted);">${lider.telefono}</small>`
            : '';

        const rolTexto = lider.rol === 'admin' ? 'Admin' : 'Líder Célula';

        const estadoHtml = lider.aprobado
            ? `<span style="color:var(--success); font-weight:700;">Activo</span>`
            : `<span style="color:var(--danger); font-weight:700;">Pendiente</span>`;

        const accionHtml = lider.rol === 'admin'
            ? `<small style="color:var(--text-muted);">Admin Principal</small>`
            : lider.aprobado
                ? `<button type="button" class="btn btn-outline" style="color:#dc2626; border-color:#dc2626;" onclick="cambiarEstadoLider('${lider.id}', false)">Suspender</button>`
                : `<button type="button" class="btn btn-primary" style="padding:0.35rem 0.75rem; font-size:0.85rem;" onclick="cambiarEstadoLider('${lider.id}', true)">Aprobar Acceso</button>`;

        return `
            <tr>
                <td data-label="Nombre"><span><strong>${lider.nombre_completo}</strong>${telefonoHtml}</span></td>
                <td data-label="Célula">${lider.nombre_celula || '-'}</td>
                <td data-label="Categoría"><span class="badge-cat">${lider.categoria_predeterminada || 'Adultos'}</span></td>
                <td data-label="Rol">${rolTexto}</td>
                <td data-label="Estado">${estadoHtml}</td>
                <td data-label="Acción">${accionHtml}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('badge-pendientes').textContent = `${pendientes} pendiente(s)`;
}

async function cambiarEstadoLider(liderId, nuevoEstado) {
    const { error } = await supabaseClient
        .from('perfiles')
        .update({ aprobado: nuevoEstado })
        .eq('id', liderId);

    if (error) {
        alert('Error al actualizar estado: ' + error.message);
        return;
    }

    await cargarLideres();
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

function obtenerFechaHoyLocalStr() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function manejarCambioPeriodo() {
    const periodo = document.getElementById('filtro-periodo').value;
    const mostrarRango = periodo === 'personalizado';
    document.getElementById('grupo-fecha-inicio').style.display = mostrarRango ? 'block' : 'none';
    document.getElementById('grupo-fecha-fin').style.display = mostrarRango ? 'block' : 'none';
    aplicarFiltros();
}

function limpiarFiltros() {
    document.getElementById('filtro-periodo').value = 'mes';
    document.getElementById('fecha-inicio').value = '';
    document.getElementById('fecha-fin').value = '';
    document.getElementById('filtro-lider').value = 'todos';
    document.getElementById('filtro-categoria').value = 'todas';
    document.getElementById('filtro-tipo').value = 'todos';
    manejarCambioPeriodo();
}

function aplicarFiltros() {
    const periodo = document.getElementById('filtro-periodo').value;
    const liderId = document.getElementById('filtro-lider').value;
    const categoria = document.getElementById('filtro-categoria').value;
    const tipo = document.getElementById('filtro-tipo').value;

    const hoyStr = obtenerFechaHoyLocalStr();
    const inicioSemana = obtenerInicioSemana(hoyStr);
    const finSemana = obtenerFinSemana(hoyStr);
    const mesActual = hoyStr.slice(0, 7);
    const anioActual = hoyStr.slice(0, 4);

    let textoPeriodoPrint = 'Período: Historial Completo';

    // Base filtrada por líder, categoría y tipo para calcular comparativo Semanal/Mensual/Anual
    const baseSegmentada = todosLosReportes.filter(r => {
        if (!r.fecha_reunion) return false;
        if (liderId !== 'todos' && r.lider_id !== liderId) return false;
        if (categoria !== 'todas' && r.categoria_celula !== categoria) return false;
        if (tipo !== 'todos' && r.tipo_celula !== tipo) return false;
        return true;
    });

    const filtrados = baseSegmentada.filter(r => {
        if (periodo === 'semana') {
            textoPeriodoPrint = `Reporte Semanal (${formatearFecha(inicioSemana)} al ${formatearFecha(finSemana)})`;
            if (r.fecha_reunion < inicioSemana || r.fecha_reunion > finSemana) return false;
        } else if (periodo === 'mes') {
            textoPeriodoPrint = `Reporte Mensual (${mesActual})`;
            if (!r.fecha_reunion.startsWith(mesActual)) return false;
        } else if (periodo === 'anio') {
            textoPeriodoPrint = `Reporte Anual (${anioActual})`;
            if (!r.fecha_reunion.startsWith(anioActual)) return false;
        } else if (periodo === 'personalizado') {
            const fInicio = document.getElementById('fecha-inicio').value;
            const fFin = document.getElementById('fecha-fin').value;
            textoPeriodoPrint = `Reporte Personalizado (${fInicio ? formatearFecha(fInicio) : 'Inicio'} al ${fFin ? formatearFecha(fFin) : 'Hoy'})`;
            if (fInicio && r.fecha_reunion < fInicio) return false;
            if (fFin && r.fecha_reunion > fFin) return false;
        }
        return true;
    });

    document.getElementById('print-periodo-texto').textContent = textoPeriodoPrint;
    actualizarEstadisticas(filtrados);
    actualizarGraficos(filtrados);
    actualizarResumenEstadisticoPDF(filtrados, baseSegmentada, { inicioSemana, finSemana, mesActual, anioActual });
    renderizarTabla(filtrados);
}

function marcarTarjetaCeroPrint(elementId, valor) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const card = el.closest('.stat-card');
    if (!card) return;
    if (Number(valor) === 0) {
        card.classList.add('cero-en-print');
    } else {
        card.classList.remove('cero-en-print');
    }
}

function resumirGrupoReportes(lista) {
    let asistentes = 0;
    let oracion = 0;
    let crecimiento = 0;
    let discipulado = 0;

    lista.forEach(r => {
        asistentes += calcularTotalAsistencia(r);
        if (r.tipo_celula === 'Oración') oracion++;
        if (r.tipo_celula === 'Crecimiento') crecimiento++;
        if (r.tipo_celula === 'Discipulado') discipulado++;
    });

    const celulas = lista.length;
    const promedio = celulas > 0 ? (asistentes / celulas).toFixed(1) : '0.0';

    return { celulas, asistentes, promedio, oracion, crecimiento, discipulado };
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
    const promedio = reportes.length > 0 ? (totalPersonas / reportes.length).toFixed(1) : '0';

    document.getElementById('stat-total-celulas').textContent = reportes.length;
    document.getElementById('stat-total-personas').textContent = totalPersonas;
    document.getElementById('stat-promedio-celula').textContent = promedio;
    document.getElementById('stat-por-tipo').textContent = `${countOracion} Ora | ${countCrecimiento} Crec | ${countDiscipulado} Disc`;
    document.getElementById('stat-hombres').textContent = totalHombres;
    document.getElementById('stat-mujeres').textContent = totalMujeres;
    document.getElementById('stat-jovenes').textContent = totalJovenes;
    document.getElementById('stat-jovencitas').textContent = totalJovencitas;
    document.getElementById('stat-ninos').textContent = totalNinos;

    marcarTarjetaCeroPrint('stat-hombres', totalHombres);
    marcarTarjetaCeroPrint('stat-mujeres', totalMujeres);
    marcarTarjetaCeroPrint('stat-jovenes', totalJovenes);
    marcarTarjetaCeroPrint('stat-jovencitas', totalJovencitas);
    marcarTarjetaCeroPrint('stat-ninos', totalNinos);
}

function actualizarGraficos(reportes) {
    if (typeof Chart === 'undefined') return;

    let hombres = 0, mujeres = 0, jovenes = 0, jovencitas = 0, ninos = 0;
    let oracion = 0, crecimiento = 0, discipulado = 0;

    reportes.forEach(r => {
        hombres += Number(r.hombres || 0);
        mujeres += Number(r.mujeres || 0);
        jovenes += Number(r.jovenes || 0);
        jovencitas += Number(r.jovencitas || 0);
        ninos += Number(r.ninos || 0);

        if (r.tipo_celula === 'Oración') oracion++;
        if (r.tipo_celula === 'Crecimiento') crecimiento++;
        if (r.tipo_celula === 'Discipulado') discipulado++;
    });

    const ctxAsistencia = document.getElementById('graficoAsistencia').getContext('2d');
    const datosAsistencia = [hombres, mujeres, jovenes, jovencitas, ninos];

    if (chartAsistencia) {
        chartAsistencia.data.datasets[0].data = datosAsistencia;
        chartAsistencia.update();
    } else {
        chartAsistencia = new Chart(ctxAsistencia, {
            type: 'bar',
            data: {
                labels: ['Hombres', 'Mujeres', 'Jóvenes', 'Jovencitas', 'Niños'],
                datasets: [{
                    label: 'Asistentes',
                    data: datosAsistencia,
                    backgroundColor: ['#30240f', '#ae6312', '#544532', '#f39f47', '#f66565'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    const ctxTipos = document.getElementById('graficoTipos').getContext('2d');
    const datosTipos = [oracion, crecimiento, discipulado];

    if (chartTipos) {
        chartTipos.data.datasets[0].data = datosTipos;
        chartTipos.update();
    } else {
        chartTipos = new Chart(ctxTipos, {
            type: 'doughnut',
            data: {
                labels: ['Oración', 'Crecimiento', 'Discipulado'],
                datasets: [{
                    data: datosTipos,
                    backgroundColor: ['#ff8400', '#a35200', '#853802'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

function actualizarResumenEstadisticoPDF(filtrados, baseSegmentada, rangos) {
    const tbodyPeriodos = document.getElementById('print-tabla-periodos');
    const tbodyLideres = document.getElementById('print-tabla-lideres');
    if (!tbodyPeriodos || !tbodyLideres) return;

    const repSemana = baseSegmentada.filter(r => r.fecha_reunion >= rangos.inicioSemana && r.fecha_reunion <= rangos.finSemana);
    const repMes = baseSegmentada.filter(r => r.fecha_reunion.startsWith(rangos.mesActual));
    const repAnio = baseSegmentada.filter(r => r.fecha_reunion.startsWith(rangos.anioActual));

    const periodosData = [
        { nombre: 'Semanal', stats: resumirGrupoReportes(repSemana) },
        { nombre: 'Mensual', stats: resumirGrupoReportes(repMes) },
        { nombre: 'Anual', stats: resumirGrupoReportes(repAnio) }
    ].filter(item => item.stats.celulas > 0);

    if (periodosData.length === 0) {
        tbodyPeriodos.innerHTML = `<tr><td colspan="7" style="text-align:center;">Sin actividad registrada en los períodos consultados.</td></tr>`;
    } else {
        tbodyPeriodos.innerHTML = periodosData.map(({ nombre, stats }) => `
            <tr>
                <td><strong>${nombre}</strong></td>
                <td>${stats.celulas}</td>
                <td><strong>${stats.asistentes}</strong></td>
                <td>${stats.promedio}</td>
                <td>${stats.oracion}</td>
                <td>${stats.crecimiento}</td>
                <td>${stats.discipulado}</td>
            </tr>
        `).join('');
    }

    const acumuladoPorLider = {};
    let totalGeneralFiltrado = 0;

    filtrados.forEach(r => {
        const total = calcularTotalAsistencia(r);
        totalGeneralFiltrado += total;
        if (!acumuladoPorLider[r.lider_id]) {
            acumuladoPorLider[r.lider_id] = { celulas: 0, asistentes: 0 };
        }
        acumuladoPorLider[r.lider_id].celulas += 1;
        acumuladoPorLider[r.lider_id].asistentes += total;
    });

    const filasLider = Object.entries(acumuladoPorLider)
        .filter(([, info]) => info.celulas > 0 && info.asistentes > 0)
        .sort((a, b) => b[1].asistentes - a[1].asistentes);

    if (filasLider.length === 0) {
        tbodyLideres.innerHTML = `<tr><td colspan="5" style="text-align:center;">Sin reportes con asistencia en este período.</td></tr>`;
    } else {
        tbodyLideres.innerHTML = filasLider.map(([liderId, info]) => {
            const liderInfo = mapaLideres[liderId];
            const nombre = liderInfo ? liderInfo.nombre_completo : 'Líder';
            const promedio = (info.asistentes / info.celulas).toFixed(1);
            const pct = totalGeneralFiltrado > 0 ? ((info.asistentes / totalGeneralFiltrado) * 100).toFixed(1) : '0.0';
            return `
                <tr>
                    <td><strong>${nombre}</strong></td>
                    <td>${info.celulas}</td>
                    <td><strong>${info.asistentes}</strong></td>
                    <td>${promedio}</td>
                    <td>${pct}%</td>
                </tr>
            `;
        }).join('');
    }
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
        const detalleLugar = r.ubicacion || (liderInfo && liderInfo.nombre_celula) || '';
        const lugarHtml = detalleLugar ? `<br><small style="color:#666;">${detalleLugar}</small>` : '';

        const h = Number(r.hombres || 0);
        const m = Number(r.mujeres || 0);
        const jov = Number(r.jovenes || 0);
        const jovtas = Number(r.jovencitas || 0);
        const ninos = Number(r.ninos || 0);

        return `
            <tr>
                <td data-label="Fecha">${formatearFecha(r.fecha_reunion)}</td>
                <td data-label="Líder / Ubicación"><span><strong>${nombreLider}</strong>${lugarHtml}</span></td>
                <td data-label="Categoría"><span class="badge-cat">${r.categoria_celula}</span></td>
                <td data-label="Tipo">${r.tipo_celula}</td>
                <td data-label="Hombres" class="${h === 0 ? 'cero-en-print' : ''}">${h}</td>
                <td data-label="Mujeres" class="${m === 0 ? 'cero-en-print' : ''}">${m}</td>
                <td data-label="Jóvenes" class="${jov === 0 ? 'cero-en-print' : ''}">${jov}</td>
                <td data-label="Jovencitas" class="${jovtas === 0 ? 'cero-en-print' : ''}">${jovtas}</td>
                <td data-label="Niños" class="${ninos === 0 ? 'cero-en-print' : ''}">${ninos}</td>
                <td data-label="Total"><strong>${calcularTotalAsistencia(r)}</strong></td>
                <td data-label="Observaciones">${r.observaciones || '-'}</td>
            </tr>
        `;
    }).join('');
}

function imprimirPDF() {
    if (chartAsistencia) {
        const imgAsis = document.getElementById('print-img-asistencia');
        if (imgAsis) imgAsis.src = chartAsistencia.toBase64Image();
    }
    if (chartTipos) {
        const imgTipos = document.getElementById('print-img-tipos');
        if (imgTipos) imgTipos.src = chartTipos.toBase64Image();
    }
    window.print();
}