export const printCSS = `
@media print {
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 16mm 14mm;
  }

  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box !important;
  }

  html, body {
    background: #ffffff !important;
    color: #18181b !important;
    font-family: Georgia, "Times New Roman", Times, serif !important;
    font-size: 8.5pt !important;
    line-height: 1.45 !important;
    overflow: visible !important;
    overflow-x: visible !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body::after,
  body::before,
  .contract-toolbar,
  audio,
  header,
  footer,
  [data-music-player],
  .music-player-container,
  button,
  [class*="print:hidden"] {
    display: none !important;
  }

  .contract-paper {
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .contract-title {
    font-size: 13.5pt !important;
    color: #000000 !important;
    font-weight: 700 !important;
    line-height: 1.25 !important;
    margin-bottom: 4pt !important;
  }

  .contract-section {
    margin-bottom: 9pt !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    break-inside: auto !important;
  }

  .contract-clause-title {
    font-size: 9.5pt !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin-bottom: 3pt !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  .contract-body {
    color: #27272a !important;
    font-size: 8.5pt !important;
    line-height: 1.4 !important;
  }

  table {
    border-collapse: collapse !important;
    width: 100% !important;
    font-size: 7.5pt !important;
    margin: 5pt 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  th, td {
    border: 0.5pt solid #d4d4d8 !important;
    padding: 2.5pt 5pt !important;
    color: #18181b !important;
  }

  th {
    background-color: #f4f4f5 !important;
    font-weight: 700 !important;
  }

  .contract-nota {
    background-color: #fafafa !important;
    border-left: 2pt solid #71717a !important;
    border-top: none !important;
    border-right: none !important;
    border-bottom: none !important;
    border-radius: 0 !important;
    padding: 3.5pt 6pt !important;
    font-size: 7.5pt !important;
    margin: 5pt 0 !important;
  }
}
`;
