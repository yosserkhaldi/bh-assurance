const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'docs', 'Cahier-des-charges.md');
const outputPath = path.join(__dirname, '..', 'docs', 'Cahier-des-charges.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 40 });
doc.pipe(fs.createWriteStream(outputPath));

doc.registerFont('Arial', 'C:/Windows/Fonts/arial.ttf');
doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf');

const colors = {
  primary: '#1e40af',
  secondary: '#0f766e',
  dark: '#1f2937',
  text: '#334155',
  muted: '#64748b',
  border: '#cbd5e1',
  light: '#f8fafc',
};

let y = 40;
const margin = 40;
const width = 515;
const pageHeight = 842;

function newPage() {
  doc.addPage();
  y = 40;
}

function checkSpace(lines = 1) {
  const lineHeight = 14;
  if (y + lines * lineHeight > pageHeight - 60) newPage();
}

function renderTable(rows) {
  if (!rows || rows.length < 2) return;
  const colCount = rows[0].length;
  const colWidth = width / colCount;
  const lineHeight = 16;
  rows.forEach((row, rIdx) => {
    checkSpace(2);
    const isHeader = rIdx === 0;
    doc.font(isHeader ? 'Arial-Bold' : 'Arial').fontSize(8).fillColor(isHeader ? '#ffffff' : colors.text);
    const bg = isHeader ? colors.primary : rIdx % 2 === 0 ? '#ffffff' : colors.light;
    doc.rect(margin, y, width, lineHeight).fill(bg);
    row.forEach((cell, cIdx) => {
      doc.text(cell.trim(), margin + cIdx * colWidth + 4, y + 4, { width: colWidth - 8, height: lineHeight - 4 });
    });
    y += lineHeight;
  });
  y += 6;
}

function cleanLine(line) {
  return line.replace(/\*\*/g, '').replace(/__/g, '').trim();
}

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split(/\r?\n/);

let tableBuffer = [];
let inCode = false;

lines.forEach((rawLine) => {
  const line = rawLine.trimEnd();

  if (line.startsWith('```')) {
    inCode = !inCode;
    return;
  }

  if (inCode) {
    checkSpace();
    doc.font('Arial').fontSize(8).fillColor(colors.muted).text(line, margin + 10, y, { width: width - 20 });
    y = doc.y + 4;
    return;
  }

  if (line.startsWith('|')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim()).filter((_, i, arr) => i !== 0 || arr.length > 1);
    if (cells.length && cells.every((c) => /^[-:]+$/.test(c))) return;
    if (cells.length) tableBuffer.push(cells);
    return;
  } else if (tableBuffer.length) {
    renderTable(tableBuffer);
    tableBuffer = [];
  }

  if (line.startsWith('# ')) {
    checkSpace(3);
    doc.fontSize(20).fillColor(colors.primary).font('Arial-Bold').text(cleanLine(line.slice(2)), margin, y, { width });
    y = doc.y + 12;
  } else if (line.startsWith('## ')) {
    checkSpace(3);
    doc.fontSize(14).fillColor(colors.secondary).font('Arial-Bold').text(cleanLine(line.slice(3)), margin, y, { width });
    y = doc.y + 10;
  } else if (line.startsWith('### ')) {
    checkSpace(2);
    doc.fontSize(12).fillColor(colors.dark).font('Arial-Bold').text(cleanLine(line.slice(4)), margin, y, { width });
    y = doc.y + 8;
  } else if (line.startsWith('---')) {
    checkSpace();
    doc.moveTo(margin, y).lineTo(margin + width, y).strokeColor(colors.border).lineWidth(0.5).stroke();
    y += 10;
  } else if (line.startsWith('- ') || line.startsWith('* ')) {
    checkSpace();
    doc.fontSize(10).fillColor(colors.text).font('Arial').text('• ' + cleanLine(line.slice(2)), margin + 10, y, { width: width - 10 });
    y = doc.y + 4;
  } else if (/^\d+\. /.test(line)) {
    checkSpace();
    doc.fontSize(10).fillColor(colors.text).font('Arial').text(line.replace(/\*\*/g, ''), margin, y, { width });
    y = doc.y + 4;
  } else if (line.trim() === '') {
    y += 4;
  } else {
    checkSpace();
    doc.fontSize(10).fillColor(colors.text).font('Arial').text(cleanLine(line), margin, y, { width, lineGap: 2 });
    y = doc.y + 4;
  }
});

if (tableBuffer.length) renderTable(tableBuffer);

doc.end();
console.log(`PDF généré : ${outputPath}`);
