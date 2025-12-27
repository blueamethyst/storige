/**
 * 테스트용 PDF 파일 생성 스크립트
 *
 * 실행: node generate-test-pdfs.js
 */

const fs = require('fs');
const path = require('path');

/**
 * 올바른 xref 테이블을 포함한 PDF 생성
 */
function buildPdf(objects) {
  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const offsets = [];

  // 객체들 추가
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  // xref 테이블
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  // 트레일러
  pdf += `trailer\n<<\n/Size ${objects.length + 1}\n/Root 1 0 R\n>>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * CMYK PDF - DeviceCMYK 사용
 */
function createCmykPdf() {
  const contentStream = `q
/CS1 cs
0.8 0.3 0.2 0.1 scn
100 100 200 200 re
f
Q
`;

  const objects = [
    // 1: Catalog
    `<< /Type /Catalog /Pages 2 0 R >>`,
    // 2: Pages
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // 3: Page
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ColorSpace << /CS1 /DeviceCMYK >> >> >>`,
    // 4: Content stream
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  return buildPdf(objects);
}

/**
 * RGB PDF
 */
function createRgbPdf() {
  const contentStream = `q
1 0 0 rg
100 100 100 100 re f
0 1 0 rg
250 100 100 100 re f
0 0 1 rg
400 100 100 100 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  return buildPdf(objects);
}

/**
 * Separation (별색) PDF
 */
function createSpotColorPdf(spotColorName = 'PANTONE#20485#20C') {
  const contentStream = `q
/CS1 cs
1 scn
100 100 200 200 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ColorSpace << /CS1 [/Separation /${spotColorName} /DeviceCMYK 5 0 R] >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    // 5: Tint transform function
    `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0.91 0.76 0] /N 1 >>`,
  ];

  return buildPdf(objects);
}

/**
 * DeviceN (CutContour 등) PDF - CMYK 잉크 사용
 */
function createDeviceNPdf() {
  const contentStream = `q
/CS1 cs
1 scn
100 100 150 150 re f
/CS2 cs
0 0 1 scn
300 100 150 150 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ColorSpace << /CS1 [/Separation /PANTONE#20Red#20032#20C /DeviceCMYK 5 0 R] /CS2 [/DeviceN [/Cyan /Magenta /CutContour] /DeviceCMYK 6 0 R] >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    // 5: Tint function for Separation
    `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0.05 1 0.91 0] /N 1 >>`,
    // 6: Tint function for DeviceN
    `<< /FunctionType 4 /Domain [0 1 0 1 0 1] /Range [0 1 0 1 0 1 0 1] /Length 24 >>\nstream\n{pop pop pop 0 0 0 0}\nendstream`,
  ];

  return buildPdf(objects);
}

/**
 * 순수 별색만 있는 PDF (CMYK 잉크 0%)
 * 후가공 파일 테스트용 - CutContour, Crease 등 인쇄되지 않는 별색만 사용
 */
function createPureSpotColorPdf() {
  const contentStream = `q
/CS1 cs
1 scn
100 100 200 200 re f
/CS2 cs
1 scn
350 100 150 150 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // CutContour와 Crease - 모두 CMYK 출력 없음 (Tint function이 0 0 0 0 반환)
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ColorSpace << /CS1 [/Separation /CutContour /DeviceCMYK 5 0 R] /CS2 [/Separation /Crease /DeviceCMYK 6 0 R] >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    // 5: CutContour tint function - CMYK 출력 없음
    `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 0 0] /N 1 >>`,
    // 6: Crease tint function - CMYK 출력 없음
    `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 0 0] /N 1 >>`,
  ];

  return buildPdf(objects);
}

/**
 * Transparency PDF (/ca /CA)
 */
function createTransparencyPdf() {
  const contentStream = `q
/GS1 gs
1 0 0 rg
100 100 200 200 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ExtGState << /GS1 << /Type /ExtGState /ca 0.5 /CA 0.5 >> >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  return buildPdf(objects);
}

/**
 * Overprint PDF (/OP /op)
 */
function createOverprintPdf() {
  const contentStream = `q
/GS1 gs
0.8 0.2 0.1 0.0 k
100 100 200 200 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ExtGState << /GS1 << /Type /ExtGState /OP true /op true /OPM 1 >> >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  return buildPdf(objects);
}

/**
 * Transparency + Overprint PDF
 */
function createBothTransOverprintPdf() {
  const contentStream = `q
/GS1 gs
0.8 0.2 0.1 0.0 k
100 100 200 200 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ExtGState << /GS1 << /Type /ExtGState /ca 0.5 /CA 0.5 /OP true /op true /OPM 1 >> >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];

  return buildPdf(objects);
}

/**
 * Spot + CMYK 혼합 PDF
 */
function createSpotWithCmykPdf() {
  const contentStream = `q
/CS1 cs
1 scn
100 100 150 150 re f
/CS2 cs
0.5 0.3 0.1 0.0 scn
300 100 150 150 re f
Q
`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Contents 4 0 R /Resources << /ColorSpace << /CS1 [/Separation /PANTONE#20485#20C /DeviceCMYK 5 0 R] /CS2 /DeviceCMYK >> >> >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
    `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0.91 0.76 0] /N 1 >>`,
  ];

  return buildPdf(objects);
}

// 메인 실행
const baseDir = __dirname;

const files = [
  // CMYK
  { path: 'cmyk/cmyk-print-file.pdf', generator: createCmykPdf },
  { path: 'cmyk/fail-cmyk-for-postprocess.pdf', generator: createCmykPdf },
  { path: 'cmyk/success-rgb-only.pdf', generator: createRgbPdf },

  // Spot Color
  { path: 'spot-color/spot-only.pdf', generator: createDeviceNPdf },  // PANTONE + CutContour (CMYK 잉크 사용)
  { path: 'spot-color/success-spot-only.pdf', generator: createPureSpotColorPdf },  // 순수 별색만 (CMYK 잉크 0%)
  { path: 'spot-color/spot-with-cmyk.pdf', generator: createSpotWithCmykPdf },
  { path: 'spot-color/warn-cmyk-spot-mixed.pdf', generator: createSpotWithCmykPdf },

  // Transparency
  { path: 'transparency/with-transparency.pdf', generator: createTransparencyPdf },
  { path: 'transparency/warn-with-transparency.pdf', generator: createTransparencyPdf },
  { path: 'transparency/with-overprint.pdf', generator: createOverprintPdf },
  { path: 'transparency/warn-with-overprint.pdf', generator: createOverprintPdf },
  { path: 'transparency/success-no-transparency.pdf', generator: createRgbPdf },
  { path: 'transparency/warn-both-trans-overprint.pdf', generator: createBothTransOverprintPdf },
];

console.log('테스트 PDF 파일 생성 중...\n');

for (const file of files) {
  const filePath = path.join(baseDir, file.path);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const pdfContent = file.generator();
  fs.writeFileSync(filePath, pdfContent, 'binary');
  console.log(`✓ ${file.path} (${pdfContent.length} bytes)`);
}

console.log('\n완료!');
