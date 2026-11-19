// Funciones de utilidad y cálculos - Red Ebenezer

function calcularTotalAsistencia(reporte) {
    return (
        Number(reporte.hombres || 0) +
        Number(reporte.mujeres || 0) +
        Number(reporte.jovenes || 0) +
        Number(reporte.jovencitas || 0) +
        Number(reporte.ninos || 0)
    );
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
}

// Obtener el lunes de la semana de una fecha dada (para agrupar o filtrar por semana)
function obtenerInicioSemana(fecha) {
    const d = new Date(fecha + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    return lunes.toISOString().split('T')[0];
}

function obtenerFinSemana(fecha) {
    const inicio = new Date(obtenerInicioSemana(fecha) + 'T00:00:00');
    inicio.setDate(inicio.getDate() + 6);
    return inicio.toISOString().split('T')[0];
}