# CDRS Analyzer (azul oscuro · futurista)

Proyecto web listo (HTML, CSS, JS + Tailwind) para analizar archivos grandes de CDRs por operadora (Claro, Movistar, Tigo, WOM), con:

- Menú lateral por operadora (pestañas)
- Carga de Excel (.xlsx/.xls) y CSV (.csv)
- Streaming para CSV con PapaParse (ideal hasta ~1M filas)
- Vista previa (500 filas), progresos y conteos en vivo
- Filtros (contiene número, rango de fechas, deduplicación)
- Exportación a Excel/CSV de resultados filtrados
- Estilo azul oscuro, moderno y responsivo
- Loader inicial: “Cargando recursos...”

## Uso

1. Abra `index.html` en su navegador (Chrome recomendado).
2. Elija pestaña de operadora, cargue su archivo y mapee columnas (Número, Fecha, Tipo).
3. Aplique filtros y espere el procesamiento (barra de progreso).
4. Exporte resultados a XLSX o CSV.

> **Sugerencia de rendimiento**  
> Para archivos muy grandes (≈1M filas), **conviene CSV**. XLSX en navegador requiere más memoria y puede ser más lento/instable. Si su Excel es muy grande, conviértalo a CSV y cárguelo: el sistema usa **streaming** para procesar por chunks sin congelar la interfaz.

## Estructura

```
/cdrs-analyzer-blue
  ├─ index.html
  ├─ styles.css
  ├─ app.js
  └─ assets/
       └─ logo.svg
```

## Librerías

- TailwindCSS (Play CDN)
- SheetJS (xlsx) para exportar y leer Excel
- PapaParse para streaming CSV

## Notas

- La vista previa muestra hasta 500 filas para no saturar el DOM.
- La exportación XLSX usa los resultados filtrados en memoria (hasta 250.000 filas como salvaguarda). Si requiere exportar más, utilice la exportación **CSV**.
- Mapeo automático intenta detectar columnas por nombre (numero/msisdn, fecha/date, tipo). Puede ajustarlo manualmente.
