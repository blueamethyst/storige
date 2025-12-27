/**
 * 테스트용 PDF 파일 생성 스크립트
 *
 * 실행: node generate-test-pdfs.js
 *
 * 생성되는 파일:
 * - cmyk/*.pdf: CMYK 관련 테스트
 * - spot-color/*.pdf: 별색 관련 테스트
 * - transparency/*.pdf: 투명도/오버프린트 테스트
 */

const { PDFDocument, rgb, PDFName, PDFArray, PDFDict, PDFNumber, PDFStream, PDFRef } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * 기본 PDF 생성 후 특정 패턴 삽입
 */
async function createPdfWithPattern(patterns) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  // RGB 사각형 그리기 (기본)
  page.drawRectangle({
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    color: rgb(1, 0, 0),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });

  // 패턴 삽입 (PDF 바이너리에 직접 추가)
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  for (const pattern of patterns) {
    // Resources 딕셔너리에 패턴 삽입
    const resourcesMatch = pdfString.match(/\/Resources\s*<<([^>]*)>>/);
    if (resourcesMatch) {
      const newResources = `/Resources <<${resourcesMatch[1]} ${pattern.resource || ''}>>`;
      pdfString = pdfString.replace(resourcesMatch[0], newResources);
    }

    // 추가 객체 삽입 (xref 전에)
    if (pattern.object) {
      const startxrefMatch = pdfString.match(/startxref/);
      if (startxrefMatch) {
        pdfString = pdfString.replace('startxref', `${pattern.object}\nstartxref`);
      }
    }
  }

  return Buffer.from(pdfString, 'latin1');
}

/**
 * DeviceCMYK를 사용하는 PDF 생성
 */
async function createCmykPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  // 기본 사각형
  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(0.5, 0.5, 0.5),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // DeviceCMYK 컬러스페이스 삽입
  // Resources에 ColorSpace 추가
  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    '/Resources <<$1 /ColorSpace << /CS1 /DeviceCMYK >> >>'
  );

  // Content stream에 CMYK 명령어 추가
  const streamMatch = pdfString.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (streamMatch) {
    const newContent = `q
/CS1 cs
0.8 0.3 0.2 0.1 scn
200 200 150 150 re f
Q
${streamMatch[1]}`;
    pdfString = pdfString.replace(
      /stream\r?\n[\s\S]*?\r?\nendstream/,
      `stream\n${newContent}\nendstream`
    );
    // Length 업데이트
    pdfString = pdfString.replace(
      /\/Length \d+/,
      `/Length ${newContent.length}`
    );
  }

  return Buffer.from(pdfString, 'latin1');
}

/**
 * RGB만 사용하는 PDF
 */
async function createRgbPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({ x: 50, y: 50, width: 100, height: 100, color: rgb(1, 0, 0) });
  page.drawRectangle({ x: 200, y: 50, width: 100, height: 100, color: rgb(0, 1, 0) });
  page.drawRectangle({ x: 350, y: 50, width: 100, height: 100, color: rgb(0, 0, 1) });

  return await pdfDoc.save({ useObjectStreams: false });
}

/**
 * Separation 별색 PDF 생성
 */
async function createSpotColorPdf(spotColors = ['PANTONE#20485#20C']) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(0.5, 0.5, 0.5),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // Separation 컬러스페이스 삽입
  const separationDefs = spotColors.map((name, i) =>
    `/CS${i + 1} [/Separation /${name} /DeviceCMYK << /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0.9 0] /N 1 >>]`
  ).join(' ');

  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    `/Resources <<$1 /ColorSpace << ${separationDefs} >> >>`
  );

  return Buffer.from(pdfString, 'latin1');
}

/**
 * DeviceN (CutContour 등) 포함 PDF
 */
async function createDeviceNPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(0.5, 0.5, 0.5),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // Separation + DeviceN 컬러스페이스 삽입
  const colorSpaces = `
    /CS1 [/Separation /PANTONE#20Red#20032#20C /DeviceCMYK << /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0.05 1 0.91 0] /N 1 >>]
    /CS2 [/DeviceN [/Cyan /Magenta /CutContour] /DeviceCMYK << /FunctionType 4 /Domain [0 1 0 1 0 1] /Range [0 1 0 1 0 1 0 1] /Length 20 >> stream
{pop pop pop 0}
endstream]
  `.trim();

  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    `/Resources <<$1 /ColorSpace << ${colorSpaces} >> >>`
  );

  return Buffer.from(pdfString, 'latin1');
}

/**
 * 투명도 포함 PDF (ExtGState /ca /CA)
 */
async function createTransparencyPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(1, 0, 0),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // ExtGState with transparency 추가
  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    '/Resources <<$1 /ExtGState << /GS1 << /Type /ExtGState /ca 0.5 /CA 0.5 >> >> >>'
  );

  return Buffer.from(pdfString, 'latin1');
}

/**
 * 오버프린트 포함 PDF (ExtGState /OP /op)
 */
async function createOverprintPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(1, 0, 0),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // ExtGState with overprint 추가
  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    '/Resources <<$1 /ExtGState << /GS1 << /Type /ExtGState /OP true /op true /OPM 1 >> >> >>'
  );

  return Buffer.from(pdfString, 'latin1');
}

/**
 * 투명도 + 오버프린트 모두 포함
 */
async function createBothTransOverprintPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(1, 0, 0),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    '/Resources <<$1 /ExtGState << /GS1 << /Type /ExtGState /ca 0.5 /CA 0.5 /OP true /op true /OPM 1 >> >> >>'
  );

  return Buffer.from(pdfString, 'latin1');
}

/**
 * 별색 + CMYK 혼합
 */
async function createSpotWithCmykPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  page.drawRectangle({
    x: 50, y: 50, width: 100, height: 100,
    color: rgb(0.5, 0.5, 0.5),
  });

  let pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  let pdfString = Buffer.from(pdfBytes).toString('latin1');

  // Separation + DeviceCMYK 모두 추가
  pdfString = pdfString.replace(
    /\/Resources\s*<<([^>]*)>>/,
    `/Resources <<$1 /ColorSpace << /CS1 /DeviceCMYK /CS2 [/Separation /PANTONE#20485#20C /DeviceCMYK << /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0.91 0.76 0] /N 1 >>] >> >>`
  );

  return Buffer.from(pdfString, 'latin1');
}

// 메인 실행
async function main() {
  const baseDir = __dirname;

  const files = [
    // CMYK
    { path: 'cmyk/cmyk-print-file.pdf', generator: createCmykPdf },
    { path: 'cmyk/fail-cmyk-for-postprocess.pdf', generator: createCmykPdf },
    { path: 'cmyk/success-rgb-only.pdf', generator: createRgbPdf },

    // Spot Color
    { path: 'spot-color/spot-only.pdf', generator: createDeviceNPdf },
    { path: 'spot-color/success-spot-only.pdf', generator: () => createSpotColorPdf(['CutContour']) },
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

    const pdfContent = await file.generator();
    fs.writeFileSync(filePath, pdfContent);
    console.log(`✓ ${file.path} (${pdfContent.length} bytes)`);
  }

  console.log('\n완료!');
}

main().catch(console.error);
