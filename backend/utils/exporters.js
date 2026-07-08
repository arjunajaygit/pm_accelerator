
const { Parser } = require('json2csv');
const js2xmlparser = require('js2xmlparser');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function formatLocalDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
    startDate: r.startDate ? new Date(r.startDate).toISOString().split('T')[0] : 'N/A',
    endDate: r.endDate ? new Date(r.endDate).toISOString().split('T')[0] : 'N/A',
    createdAt: formatLocalDate(r.createdAt),
    forecastDays: r.forecast ? r.forecast.length : 0
  }));
}

function exportJSON(records) {
  const cleanData = records.map(r => {
    const obj = { ...r._doc || r };
    delete obj.__v;
    delete obj._id;
    delete obj.aiInsight;
    return obj;
  });

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: 'ATMOSPHERE',
      author: 'PM Accelerator',
      totalRecords: records.length
    },
    data: cleanData
  };

  return {
    contentType: 'application/json',
    filename: 'atmosphere_weather_data.json',
    data: JSON.stringify(output, null, 2)
  };
}

function exportCSV(records) {
  const flat = flattenRecords(records);
  const fields = [
    { label: 'Location', value: 'resolvedLocation' },
    { label: 'Temperature (°C)', value: 'temperature' },
    { label: 'Feels Like (°C)', value: 'feelsLike' },
    { label: 'Condition', value: 'condition' },
    { label: 'Humidity (%)', value: 'humidity' },
    { label: 'Wind Speed (km/h)', value: 'windSpeed' },
    { label: 'Date Range Start', value: 'startDate' },
    { label: 'Date Range End', value: 'endDate' },
    { label: 'Recorded At', value: 'createdAt' }
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(flat);

  return {
    contentType: 'text/csv',
    filename: 'atmosphere_weather_data.csv',
    data: csv
  };
}

function exportXML(records) {
  const cleanRecords = records.map(r => {
    const obj = { ...r._doc || r };
    delete obj.__v;
    delete obj.aiInsight;
    if (obj._id) {
      obj.id = obj._id.toString();
      delete obj._id;
    }
    return obj;
  });

  const xml = js2xmlparser.parse('WeatherReport', { 
    Metadata: {
      GeneratedAt: new Date().toISOString(),
      TotalRecords: records.length
    },
    Records: { Record: cleanRecords } 
  });

  return {
    contentType: 'application/xml',
    filename: 'atmosphere_weather_data.xml',
    data: xml
  };
}

async function exportPDF(records) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 612; 
  const pageHeight = 792;
  const margin = 50;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;

  
  const headerColor = rgb(0.1, 0.1, 0.2);
  const textDark = rgb(0.2, 0.2, 0.2);
  const textMuted = rgb(0.4, 0.4, 0.4);
  const primaryColor = rgb(0.1, 0.3, 0.6);
  const bgLight = rgb(0.95, 0.95, 0.97);

  
  page.drawRectangle({
    x: 0,
    y: pageHeight - 120,
    width: pageWidth,
    height: 120,
    color: bgLight
  });

  
  page.drawText('ATMOSPHERE', { x: margin, y: pageHeight - 60, size: 24, font: boldFont, color: headerColor });
  page.drawText('Weather Data Report', { x: margin, y: pageHeight - 85, size: 14, font: font, color: textMuted });

  
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: pageWidth - margin - 150, y: pageHeight - 60, size: 10, font: font, color: textMuted });
  page.drawText(`Total Records: ${records.length}`, { x: pageWidth - margin - 150, y: pageHeight - 75, size: 10, font: font, color: textMuted });

  yPos = pageHeight - 150;

  
  const cols = [
    { name: 'Location', x: margin, w: 150 },
    { name: 'Temp', x: margin + 150, w: 60 },
    { name: 'Condition', x: margin + 210, w: 120 },
    { name: 'Humidity', x: margin + 330, w: 70 },
    { name: 'Recorded', x: margin + 400, w: 100 }
  ];

  
  const drawTableHeader = (p, y) => {
    p.drawRectangle({
      x: margin - 5,
      y: y - 5,
      width: pageWidth - (margin * 2) + 10,
      height: 20,
      color: primaryColor
    });
    cols.forEach(col => {
      p.drawText(col.name, { x: col.x, y: y, size: 10, font: boldFont, color: rgb(1,1,1) });
    });
  };

  drawTableHeader(page, yPos);
  yPos -= 25;

  records.forEach((r, i) => {
    if (yPos < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - margin;
      drawTableHeader(page, yPos);
      yPos -= 25;
    }

    
    if (i % 2 === 0) {
      page.drawRectangle({ 
        x: margin - 5, 
        y: yPos - 5, 
        width: pageWidth - (margin * 2) + 10, 
        height: 20, 
        color: rgb(0.98, 0.98, 0.98) 
      });
    }

    const locText = String(r.resolvedLocation || r.location).substring(0, 25);
    const tempText = `${r.temperature}°C`;
    const condText = String(r.condition).substring(0, 20);
    const humText = `${r.humidity}%`;
    const recText = formatLocalDate(r.createdAt);

    page.drawText(locText, { x: cols[0].x, y: yPos, size: 9, font: font, color: textDark });
    page.drawText(tempText, { x: cols[1].x, y: yPos, size: 9, font: font, color: textDark });
    page.drawText(condText, { x: cols[2].x, y: yPos, size: 9, font: font, color: textDark });
    page.drawText(humText, { x: cols[3].x, y: yPos, size: 9, font: font, color: textDark });
    page.drawText(recText, { x: cols[4].x, y: yPos, size: 9, font: font, color: textDark });

    yPos -= 20;
  });

  
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`Page ${idx + 1} of ${pages.length} — ATMOSPHERE Weather Report`, {
      x: margin,
      y: margin - 20,
      size: 8,
      font: font,
      color: textMuted
    });
  });

  const pdfBytes = await pdfDoc.save();

  return {
    contentType: 'application/pdf',
    filename: 'atmosphere_weather_data.pdf',
    data: Buffer.from(pdfBytes)
  };
}

function exportMarkdown(records) {
  let md = `# ATMOSPHERE — Weather Data Export\n\n`;
  md += `> Generated on ${new Date().toISOString().split('T')[0]} | Total Records: ${records.length}\n`;
  md += `> Built by **PM Accelerator**\n\n`;
  md += `---\n\n`;

  md += `| Location | Temp (°C) | Condition | Humidity | Wind (km/h) | Recorded |\n`;
  md += `|----------|-----------|-----------|----------|-------------|----------|\n`;

  records.forEach(r => {
    const loc = r.resolvedLocation || r.location;
    const created = formatLocalDate(r.createdAt);
    md += `| ${loc} | ${r.temperature} | ${r.condition} | ${r.humidity}% | ${r.windSpeed} | ${created} |\n`;
  });

  md += `\n---\n\n`;

  return {
    contentType: 'text/markdown',
    filename: 'atmosphere_weather_data.md',
    data: md
  };
}

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
