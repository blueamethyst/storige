/**
 * 테스트용 PDF 파일 생성 스크립트
 *
 * 실행: node generate-test-pdfs.js
 *
 * 생성되는 파일:
 * - cmyk/cmyk-print-file.pdf: DeviceCMYK 컬러스페이스 사용
 * - cmyk/fail-cmyk-for-postprocess.pdf: 후가공 파일에서 거부되어야 하는 CMYK PDF
 * - cmyk/success-rgb-only.pdf: RGB만 사용하는 PDF
 * - spot-color/spot-only.pdf: Separation 별색만 사용
 * - spot-color/spot-with-cmyk.pdf: 별색 + CMYK 혼합
 * - transparency/with-transparency.pdf: 투명도 포함
 * - transparency/with-overprint.pdf: 오버프린트 포함
 */

const fs = require('fs');
const path = require('path');

// PDF 기본 구조 생성 헬퍼
function createPdfHeader() {
  return '%PDF-1.4\n%âãÏÓ\n';
}

function createPdfTrailer(xrefOffset, rootRef, infoRef) {
  return `xref
0 1
0000000000 65535 f
trailer
<<
/Size 1
/Root ${rootRef} 0 R
${infoRef ? `/Info ${infoRef} 0 R` : ''}
>>
startxref
${xrefOffset}
%%EOF
`;
}

// A4 크기 (points): 595.28 x 841.89
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * CMYK 컬러스페이스를 사용하는 PDF 생성
 */
function createCmykPdf() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  const catalogObj = objNum++;
  objects.push(`${catalogObj} 0 obj
<<
/Type /Catalog
/Pages ${catalogObj + 1} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesObj = objNum++;
  objects.push(`${pagesObj} 0 obj
<<
/Type /Pages
/Kids [${pagesObj + 1} 0 R]
/Count 1
>>
endobj
`);

  // 3. Page with explicit DeviceCMYK colorspace
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesObj} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ColorSpace << /CS1 /DeviceCMYK >>
  /ProcSet [/PDF /Text /ImageC]
>>
>>
endobj
`);

  // 4. Contents - CMYK 색상으로 사각형 그리기
  const contentStream = `
q
1 0 0 1 50 50 cm
/CS1 cs
0.8 0.2 0.1 0.05 scn
0 0 200 200 re
f
0.1 0.9 0.3 0.0 scn
250 0 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * RGB만 사용하는 PDF 생성
 */
function createRgbPdf() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  const catalogObj = objNum++;
  objects.push(`${catalogObj} 0 obj
<<
/Type /Catalog
/Pages ${catalogObj + 1} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesObj = objNum++;
  objects.push(`${pagesObj} 0 obj
<<
/Type /Pages
/Kids [${pagesObj + 1} 0 R]
/Count 1
>>
endobj
`);

  // 3. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesObj} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ProcSet [/PDF /Text]
>>
>>
endobj
`);

  // 4. Contents - RGB 색상으로 사각형 그리기
  const contentStream = `
q
1 0 0 1 50 50 cm
1 0 0 rg
0 0 200 200 re
f
0 1 0 rg
250 0 200 200 re
f
0 0 1 rg
0 250 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * Separation 별색만 사용하는 PDF 생성
 */
function createSpotColorPdf(spotColorName = 'PANTONE 485 C') {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  const catalogObj = objNum++;
  objects.push(`${catalogObj} 0 obj
<<
/Type /Catalog
/Pages ${catalogObj + 1} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesObj = objNum++;
  objects.push(`${pagesObj} 0 obj
<<
/Type /Pages
/Kids [${pagesObj + 1} 0 R]
/Count 1
>>
endobj
`);

  // 3. Tint transform function
  const tintFuncObj = objNum++;
  objects.push(`${tintFuncObj} 0 obj
<<
/FunctionType 2
/Domain [0 1]
/C0 [0 0 0 0]
/C1 [0 0.91 0.76 0]
/N 1
>>
endobj
`);

  // 4. Separation color space
  const csObj = objNum++;
  const encodedName = spotColorName.replace(/ /g, '#20');
  objects.push(`${csObj} 0 obj
[/Separation /${encodedName} /DeviceCMYK ${tintFuncObj} 0 R]
endobj
`);

  // 5. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesObj} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ColorSpace << /CS1 ${csObj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

  // 6. Contents - 별색으로 사각형 그리기
  const contentStream = `
q
/CS1 cs
1 scn
50 50 200 200 re
f
0.5 scn
300 50 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * 별색 + CMYK 혼합 PDF 생성
 */
function createSpotWithCmykPdf() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  objects.push(`${objNum++} 0 obj
<<
/Type /Catalog
/Pages ${objNum} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesRef = objNum++;
  objects.push(`${pagesRef} 0 obj
<<
/Type /Pages
/Kids [${objNum + 2} 0 R]
/Count 1
>>
endobj
`);

  // 3. Tint transform function
  const tintFuncObj = objNum++;
  objects.push(`${tintFuncObj} 0 obj
<<
/FunctionType 2
/Domain [0 1]
/C0 [0 0 0 0]
/C1 [0.05 1 0.91 0]
/N 1
>>
endobj
`);

  // 4. Separation color space
  const csObj = objNum++;
  objects.push(`${csObj} 0 obj
[/Separation /PANTONE#20Red#20032#20C /DeviceCMYK ${tintFuncObj} 0 R]
endobj
`);

  // 5. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesRef} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ColorSpace << /CS1 ${csObj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

  // 6. Contents - 별색 + CMYK 혼합
  const contentStream = `
q
% 별색 사각형
/CS1 cs
1 scn
50 50 200 200 re
f
% CMYK 사각형
0.5 0.3 0.1 0.0 k
300 50 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * 투명도 포함 PDF 생성
 */
function createTransparencyPdf() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  objects.push(`${objNum++} 0 obj
<<
/Type /Catalog
/Pages ${objNum} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesRef = objNum++;
  objects.push(`${pagesRef} 0 obj
<<
/Type /Pages
/Kids [${objNum + 1} 0 R]
/Count 1
>>
endobj
`);

  // 3. ExtGState with transparency
  const gsObj = objNum++;
  objects.push(`${gsObj} 0 obj
<<
/Type /ExtGState
/ca 0.5
/CA 0.5
/BM /Normal
>>
endobj
`);

  // 4. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesRef} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ExtGState << /GS1 ${gsObj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

  // 5. Contents - 투명도 적용 사각형
  const contentStream = `
q
1 0 0 rg
50 50 200 200 re
f
/GS1 gs
0 0 1 rg
150 150 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * 오버프린트 포함 PDF 생성
 */
function createOverprintPdf() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  objects.push(`${objNum++} 0 obj
<<
/Type /Catalog
/Pages ${objNum} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesRef = objNum++;
  objects.push(`${pagesRef} 0 obj
<<
/Type /Pages
/Kids [${objNum + 1} 0 R]
/Count 1
>>
endobj
`);

  // 3. ExtGState with overprint
  const gsObj = objNum++;
  objects.push(`${gsObj} 0 obj
<<
/Type /ExtGState
/OP true
/op true
/OPM 1
>>
endobj
`);

  // 4. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesRef} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ExtGState << /GS1 ${gsObj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

  // 5. Contents - 오버프린트 적용 사각형
  const contentStream = `
q
0.8 0.2 0.1 0 k
50 50 200 200 re
f
/GS1 gs
0 0.9 0.8 0 k
150 150 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

/**
 * DeviceN (CutContour 등) 포함 별색 PDF 생성
 */
function createSpotColorWithDeviceN() {
  const objects = [];
  let objNum = 1;

  // 1. Catalog
  objects.push(`${objNum++} 0 obj
<<
/Type /Catalog
/Pages ${objNum} 0 R
>>
endobj
`);

  // 2. Pages
  const pagesRef = objNum++;
  objects.push(`${pagesRef} 0 obj
<<
/Type /Pages
/Kids [${objNum + 3} 0 R]
/Count 1
>>
endobj
`);

  // 3. Separation tint function
  const tintFunc1 = objNum++;
  objects.push(`${tintFunc1} 0 obj
<<
/FunctionType 2
/Domain [0 1]
/C0 [0 0 0 0]
/C1 [0.05 1 0.91 0]
/N 1
>>
endobj
`);

  // 4. Separation color space (PANTONE)
  const cs1Obj = objNum++;
  objects.push(`${cs1Obj} 0 obj
[/Separation /PANTONE#20Red#20032#20C /DeviceCMYK ${tintFunc1} 0 R]
endobj
`);

  // 5. DeviceN tint function
  const tintFunc2 = objNum++;
  objects.push(`${tintFunc2} 0 obj
<<
/FunctionType 4
/Domain [0 1 0 1 0 1]
/Range [0 1 0 1 0 1 0 1]
/Length 48
>>
stream
{1 exch sub 0 0 0}
endstream
endobj
`);

  // 6. DeviceN color space (CutContour, Crease)
  const cs2Obj = objNum++;
  objects.push(`${cs2Obj} 0 obj
[/DeviceN [/Cyan /Magenta /CutContour] /DeviceCMYK ${tintFunc2} 0 R]
endobj
`);

  // 7. Page
  const pageObj = objNum++;
  const contentsObj = objNum + 1;
  objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesRef} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ColorSpace << /CS1 ${cs1Obj} 0 R /CS2 ${cs2Obj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

  // 8. Contents
  const contentStream = `
q
% PANTONE 별색
/CS1 cs
1 scn
50 50 200 200 re
f
% DeviceN (CutContour)
/CS2 cs
0 0 1 scn
300 50 200 200 re
f
Q
`;
  const contentsObjNum = objNum++;
  objects.push(`${contentsObjNum} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

  // PDF 조합
  let pdf = createPdfHeader();
  let offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

  return pdf;
}

// 메인 실행
const baseDir = __dirname;

const files = [
  // CMYK
  { path: 'cmyk/cmyk-print-file.pdf', generator: createCmykPdf },
  { path: 'cmyk/fail-cmyk-for-postprocess.pdf', generator: createCmykPdf },
  { path: 'cmyk/success-rgb-only.pdf', generator: createRgbPdf },

  // Spot Color
  { path: 'spot-color/spot-only.pdf', generator: createSpotColorWithDeviceN },
  { path: 'spot-color/success-spot-only.pdf', generator: () => createSpotColorPdf('CutContour') },
  { path: 'spot-color/spot-with-cmyk.pdf', generator: createSpotWithCmykPdf },
  { path: 'spot-color/warn-cmyk-spot-mixed.pdf', generator: createSpotWithCmykPdf },

  // Transparency
  { path: 'transparency/with-transparency.pdf', generator: createTransparencyPdf },
  { path: 'transparency/warn-with-transparency.pdf', generator: createTransparencyPdf },
  { path: 'transparency/with-overprint.pdf', generator: createOverprintPdf },
  { path: 'transparency/warn-with-overprint.pdf', generator: createOverprintPdf },
  { path: 'transparency/success-no-transparency.pdf', generator: createRgbPdf },
  { path: 'transparency/warn-both-trans-overprint.pdf', generator: () => {
    // 투명도 + 오버프린트 모두 포함
    const objects = [];
    let objNum = 1;

    objects.push(`${objNum++} 0 obj
<<
/Type /Catalog
/Pages ${objNum} 0 R
>>
endobj
`);

    const pagesRef = objNum++;
    objects.push(`${pagesRef} 0 obj
<<
/Type /Pages
/Kids [${objNum + 1} 0 R]
/Count 1
>>
endobj
`);

    const gsObj = objNum++;
    objects.push(`${gsObj} 0 obj
<<
/Type /ExtGState
/ca 0.5
/CA 0.5
/OP true
/op true
/OPM 1
>>
endobj
`);

    const pageObj = objNum++;
    const contentsObj = objNum + 1;
    objects.push(`${pageObj} 0 obj
<<
/Type /Page
/Parent ${pagesRef} 0 R
/MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}]
/Contents ${contentsObj} 0 R
/Resources <<
  /ExtGState << /GS1 ${gsObj} 0 R >>
  /ProcSet [/PDF]
>>
>>
endobj
`);

    const contentStream = `
q
0.8 0.2 0.1 0 k
50 50 200 200 re
f
/GS1 gs
0 0.9 0.8 0 k
150 150 200 200 re
f
Q
`;
    objects.push(`${objNum++} 0 obj
<<
/Length ${contentStream.length}
>>
stream
${contentStream}
endstream
endobj
`);

    let pdf = createPdfHeader();
    let offsets = [];

    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }

    const xrefOffset = pdf.length;
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
`;

    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer
<<
/Size ${objects.length + 1}
/Root 1 0 R
>>
startxref
${xrefOffset}
%%EOF
`;

    return pdf;
  }},
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
