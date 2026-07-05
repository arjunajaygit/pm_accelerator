/**
 * Multi-format data export utilities.
 * Supports: JSON, CSV, XML, PDF, Markdown
 */

const { Parser } = require('json2csv');
const js2xmlparser = require('js2xmlparser');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Flatten weather records for tabular exports (CSV, Markdown).
 */
function flattenRecords(records) {
  return records.map(r => ({
    id: r.id || r._id?.toString(),
    location: r.location,
    resolvedLocation: r.resolvedLocation || r.location,
    temperature: r.temperature,
    feelsLike: r.feelsLike,
    condition: r.condition,
    humidity: r.humidity,
    windSpeed: r.windSpeed,
    pressure: r.pressure,
    country: r.country || '',
    startDate: r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : '',
    endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : '',
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    forecastDays: r.forecast ? r.forecast.length : 0
  }));
}

/**
 * Export as JSON.
 */
function exportJSON(records) {
  return {
    contentType: 'application/json',
    filename: 'atmosphere_weather_data.json',
    data: JSON.stringify(records, null, 2)
  };
}

/**
 * Export as CSV.
 */
function exportCSV(records) {
  const flat = flattenRecords(records);
  const fields = [
    'id', 'location', 'resolvedLocation', 'temperature', 'feelsLike',
    'condition', 'humidity', 'windSpeed', 'pressure', 'country',
    'startDate', 'endDate', 'createdAt', 'forecastDays'
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(flat);

  return {
    contentType: 'text/csv',
    filename: 'atmosphere_weather_data.csv',
    data: csv
  };
}

/**
 * Export as XML.
 */
function exportXML(records) {
  const cleanRecords = records.map(r => {
    const obj = { ...r };
    // Remove MongoDB internal fields for cleaner XML
    delete obj.__v;
    if (obj._id) {
      obj.id = obj._id.toString();
      delete obj._id;
    }
    return obj;
  });

  const xml = js2xmlparser.parse('weatherRecords', { record: cleanRecords });

  return {
    contentType: 'application/xml',
    filename: 'atmosphere_weather_data.xml',
    data: xml
  };
}

/**
 * Export as PDF with styled layout.
 */
async function exportPDF(records) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const margin = 50;
  const lineHeight = 16;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;

  // Title
  page.drawText('AtmosphereAI — Weather Data Report', {
    x: margin,
    y: yPos,
    size: 18,
    font: boldFont,
    color: rgb(0.2, 0.3, 0.7)
  });
  yPos -= 25;

  // Subtitle
  page.drawText('Generated for PM Accelerator Technical Assessment', {
    x: margin,
    y: yPos,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  yPos -= 10;

  page.drawText(`Report Date: ${new Date().toISOString().split('T')[0]}  |  Total Records: ${records.length}`, {
    x: margin,
    y: yPos,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  yPos -= 25;

  // Separator line
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });
  yPos -= 20;

  // Records
  for (const record of records) {
    // Check if we need a new page
    if (yPos < margin + 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - margin;
    }

    // Location header
    const locText = record.resolvedLocation || record.location;
    page.drawText(locText, {
      x: margin,
      y: yPos,
      size: 13,
      font: boldFont,
      color: rgb(0.15, 0.15, 0.15)
    });
    yPos -= lineHeight + 2;

    // Temperature and condition
    page.drawText(`Temperature: ${record.temperature}°C  |  Feels Like: ${record.feelsLike || 'N/A'}°C  |  ${record.condition}`, {
      x: margin + 10,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    yPos -= lineHeight;

    // Details row
    page.drawText(`Humidity: ${record.humidity}%  |  Wind: ${record.windSpeed} km/h  |  Pressure: ${record.pressure || 'N/A'} hPa`, {
      x: margin + 10,
      y: yPos,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
    yPos -= lineHeight;

    // Date range
    const startStr = record.startDate ? new Date(record.startDate).toLocaleDateString() : 'N/A';
    const endStr = record.endDate ? new Date(record.endDate).toLocaleDateString() : 'N/A';
    page.drawText(`Date Range: ${startStr} — ${endStr}  |  Recorded: ${record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}`, {
      x: margin + 10,
      y: yPos,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPos -= lineHeight;

    // AI Insight if available
    if (record.aiInsight) {
      const insightLines = wrapText(record.aiInsight, 80);
      for (const line of insightLines) {
        if (yPos < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPos = pageHeight - margin;
        }
        page.drawText(`AI: ${line}`, {
          x: margin + 10,
          y: yPos,
          size: 9,
          font: font,
          color: rgb(0.3, 0.4, 0.7)
        });
        yPos -= lineHeight;
      }
    }

    // Separator
    yPos -= 5;
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageWidth - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9)
    });
    yPos -= 15;
  }

  // Footer on last page
  if (yPos > margin + 30) {
    page.drawText('AtmosphereAI by Arjun A — PM Accelerator Full-Stack AI Engineer Assessment', {
      x: margin,
      y: margin,
      size: 8,
      font: font,
      color: rgb(0.6, 0.6, 0.6)
    });
  }

  const pdfBytes = await pdfDoc.save();

  return {
    contentType: 'application/pdf',
    filename: 'atmosphere_weather_data.pdf',
    data: Buffer.from(pdfBytes)
  };
}

/**
 * Export as Markdown.
 */
function exportMarkdown(records) {
  let md = `# AtmosphereAI — Weather Data Export\n\n`;
  md += `> Generated on ${new Date().toISOString().split('T')[0]} | Total Records: ${records.length}\n`;
  md += `> Built by **Arjun A** for **PM Accelerator** Technical Assessment\n\n`;
  md += `---\n\n`;

  md += `| # | Location | Temp (°C) | Condition | Humidity | Wind (km/h) | Date Range | Recorded |\n`;
  md += `|---|----------|-----------|-----------|----------|-------------|------------|----------|\n`;

  records.forEach((r, i) => {
    const loc = r.resolvedLocation || r.location;
    const startStr = r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : 'N/A';
    const endStr = r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : 'N/A';
    const created = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A';
    md += `| ${i + 1} | ${loc} | ${r.temperature} | ${r.condition} | ${r.humidity}% | ${r.windSpeed} | ${startStr} → ${endStr} | ${created} |\n`;
  });

  md += `\n---\n\n`;

  // AI Insights section
  const withInsights = records.filter(r => r.aiInsight);
  if (withInsights.length > 0) {
    md += `## AI Travel Insights\n\n`;
    withInsights.forEach(r => {
      md += `### ${r.resolvedLocation || r.location}\n`;
      md += `> ${r.aiInsight}\n\n`;
    });
  }

  md += `---\n\n*Report generated by AtmosphereAI — PM Accelerator*\n`;

  return {
    contentType: 'text/markdown',
    filename: 'atmosphere_weather_data.md',
    data: md
  };
}

/**
 * Simple text wrapping utility for PDF.
 */
function wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

module.exports = {
  exportJSON,
  exportCSV,
  exportXML,
  exportPDF,
  exportMarkdown
};
