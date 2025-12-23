/**
 * PDF 테스트 픽스처 생성 스크립트
 * WBS 5.1: 테스트 PDF 파일 준비
 *
 * 실행: pnpm --filter @storige/worker exec ts-node test/fixtures/pdf/generate-fixtures.ts
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

const FIXTURES_DIR = __dirname;

// 포인트 변환 (1mm = 2.83465 points)
const mmToPt = (mm: number) => mm * 2.83465;

// A4 크기 (210 x 297 mm)
const A4_WIDTH = mmToPt(210);
const A4_HEIGHT = mmToPt(297);

// A4 + 3mm 블리드 (216 x 303 mm)
const A4_BLEED_WIDTH = mmToPt(216);
const A4_BLEED_HEIGHT = mmToPt(303);

// B5 크기 (182 x 257 mm)
const B5_WIDTH = mmToPt(182);
const B5_HEIGHT = mmToPt(257);

// B5 + 3mm 블리드 (188 x 263 mm)
const B5_BLEED_WIDTH = mmToPt(188);
const B5_BLEED_HEIGHT = mmToPt(263);

// 스프레드 크기 (A4 기준: 432 x 303 mm)
const SPREAD_A4_WIDTH = mmToPt(432);
const SPREAD_A4_HEIGHT = mmToPt(303);

// 스프레드 크기 (B5 기준: 376 x 263 mm)
const SPREAD_B5_WIDTH = mmToPt(376);
const SPREAD_B5_HEIGHT = mmToPt(263);

// ============================================================
// 유틸리티 함수
// ============================================================

async function createPdfWithPages(
  pageCount: number,
  width: number,
  height: number,
  title: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([width, height]);
    page.drawText(`${title} - Page ${i}/${pageCount}`, {
      x: 50,
      y: height - 50,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });

    // 페이지 번호를 크게 표시
    page.drawText(`${i}`, {
      x: width / 2 - 20,
      y: height / 2,
      size: 72,
      font,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  return pdfDoc.save();
}

async function createSpreadPdf(
  pageCount: number,
  width: number,
  height: number,
  title: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([width, height]);

    // 중앙 접지선 표시
    page.drawLine({
      start: { x: width / 2, y: 0 },
      end: { x: width / 2, y: height },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    page.drawText(`${title}`, {
      x: 50,
      y: height - 50,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    // 왼쪽 페이지 번호
    page.drawText(`${i * 2 - 1}`, {
      x: width / 4 - 20,
      y: height / 2,
      size: 48,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });

    // 오른쪽 페이지 번호
    page.drawText(`${i * 2}`, {
      x: (width * 3) / 4 - 20,
      y: height / 2,
      size: 48,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return pdfDoc.save();
}

// ============================================================
// RGB 기본 PDF 생성
// ============================================================

async function generateRgbPdfs(): Promise<void> {
  console.log('\n📁 RGB PDFs');

  // 성공: A4 단면 정상
  let pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'A4 Single');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf'), pdfBytes);
  console.log('  ✅ success-a4-single.pdf (1 page, 210x297)');

  // 성공: A4 다중 페이지 (4의 배수)
  pdfBytes = await createPdfWithPages(8, A4_WIDTH, A4_HEIGHT, 'A4 Multi');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'success-a4-8pages.pdf'), pdfBytes);
  console.log('  ✅ success-a4-8pages.pdf (8 pages, 210x297)');

  // 성공: A4 + 블리드
  pdfBytes = await createPdfWithPages(4, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'A4 with Bleed');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'success-a4-with-bleed.pdf'), pdfBytes);
  console.log('  ✅ success-a4-with-bleed.pdf (4 pages, 216x303)');

  // 성공: B5 단면
  pdfBytes = await createPdfWithPages(1, B5_WIDTH, B5_HEIGHT, 'B5 Single');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'success-b5-single.pdf'), pdfBytes);
  console.log('  ✅ success-b5-single.pdf (1 page, 182x257)');

  // 실패: 가로형 페이지 포함
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]).drawText('Portrait 1', { x: 50, y: A4_HEIGHT - 50, size: 18, font });
  pdfDoc.addPage([A4_HEIGHT, A4_WIDTH]).drawText('Landscape 2', { x: 50, y: A4_WIDTH - 50, size: 18, font }); // 가로형
  pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]).drawText('Portrait 3', { x: 50, y: A4_HEIGHT - 50, size: 18, font });
  pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'fail-mixed-orientation.pdf'), pdfBytes);
  console.log('  ❌ fail-mixed-orientation.pdf (contains landscape page)');

  // 실패: 사이즈 불일치 (A5 크기)
  pdfBytes = await createPdfWithPages(4, mmToPt(148), mmToPt(210), 'Wrong Size A5');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'fail-wrong-size-a5.pdf'), pdfBytes);
  console.log('  ❌ fail-wrong-size-a5.pdf (148x210, should be A4)');

  // 실패: 블리드 부족 (A4 정확, 블리드 없음)
  pdfBytes = await createPdfWithPages(4, A4_WIDTH, A4_HEIGHT, 'No Bleed');
  await fs.writeFile(path.join(FIXTURES_DIR, 'rgb', 'fail-no-bleed.pdf'), pdfBytes);
  console.log('  ❌ fail-no-bleed.pdf (210x297, no bleed when required)');
}

// ============================================================
// 사철 제본 PDF 생성 (다양한 케이스)
// ============================================================

async function generateSaddleStitchPdfs(): Promise<void> {
  console.log('\n📁 Saddle Stitch PDFs');

  // ========== 성공 케이스 (4의 배수, 64페이지 이하) ==========

  // 성공: 4페이지 (최소)
  let pdfBytes = await createPdfWithPages(4, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 4p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-4-pages.pdf'), pdfBytes);
  console.log('  ✅ success-4-pages.pdf (4 pages, minimum valid)');

  // 성공: 8페이지
  pdfBytes = await createPdfWithPages(8, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 8p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-8-pages.pdf'), pdfBytes);
  console.log('  ✅ success-8-pages.pdf (8 pages)');

  // 성공: 16페이지 (일반적)
  pdfBytes = await createPdfWithPages(16, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 16p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-16-pages.pdf'), pdfBytes);
  console.log('  ✅ success-16-pages.pdf (16 pages, common)');

  // 성공: 32페이지
  pdfBytes = await createPdfWithPages(32, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 32p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-32-pages.pdf'), pdfBytes);
  console.log('  ✅ success-32-pages.pdf (32 pages)');

  // 성공: 48페이지
  pdfBytes = await createPdfWithPages(48, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 48p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-48-pages.pdf'), pdfBytes);
  console.log('  ✅ success-48-pages.pdf (48 pages)');

  // 성공: 64페이지 (최대)
  pdfBytes = await createPdfWithPages(64, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 64p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'success-64-pages.pdf'), pdfBytes);
  console.log('  ✅ success-64-pages.pdf (64 pages, maximum valid)');

  // ========== 실패 케이스: 4의 배수 아님 ==========

  // 실패: 1페이지 (너무 적음)
  pdfBytes = await createPdfWithPages(1, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 1p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-1-page.pdf'), pdfBytes);
  console.log('  ❌ fail-1-page.pdf (1 page, not multiple of 4)');

  // 실패: 3페이지
  pdfBytes = await createPdfWithPages(3, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 3p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-3-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-3-pages.pdf (3 pages, not multiple of 4)');

  // 실패: 5페이지
  pdfBytes = await createPdfWithPages(5, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 5p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-5-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-5-pages.pdf (5 pages, not multiple of 4)');

  // 실패: 7페이지
  pdfBytes = await createPdfWithPages(7, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 7p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-7-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-7-pages.pdf (7 pages, not multiple of 4)');

  // 실패: 13페이지
  pdfBytes = await createPdfWithPages(13, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 13p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-13-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-13-pages.pdf (13 pages, not multiple of 4)');

  // 실패: 17페이지
  pdfBytes = await createPdfWithPages(17, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 17p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-17-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-17-pages.pdf (17 pages, not multiple of 4)');

  // 실패: 25페이지
  pdfBytes = await createPdfWithPages(25, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 25p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-25-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-25-pages.pdf (25 pages, not multiple of 4)');

  // ========== 실패 케이스: 64페이지 초과 ==========

  // 실패: 68페이지 (4의 배수지만 초과)
  pdfBytes = await createPdfWithPages(68, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 68p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-68-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-68-pages.pdf (68 pages, exceeds 64 limit)');

  // 실패: 72페이지
  pdfBytes = await createPdfWithPages(72, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 72p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-72-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-72-pages.pdf (72 pages, exceeds 64 limit)');

  // 실패: 100페이지 (4의 배수, 대폭 초과)
  pdfBytes = await createPdfWithPages(100, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 100p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-100-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-100-pages.pdf (100 pages, far exceeds 64 limit)');

  // ========== 실패 케이스: 복합 오류 ==========

  // 실패: 65페이지 (4의 배수 아님 + 64 초과)
  pdfBytes = await createPdfWithPages(65, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Saddle 65p');
  await fs.writeFile(path.join(FIXTURES_DIR, 'saddle-stitch', 'fail-65-pages.pdf'), pdfBytes);
  console.log('  ❌ fail-65-pages.pdf (65 pages, not multiple of 4 AND exceeds limit)');
}

// ============================================================
// 펼침면(스프레드) PDF 생성 (다양한 케이스)
// ============================================================

async function generateSpreadPdfs(): Promise<void> {
  console.log('\n📁 Spread PDFs');

  // ========== 성공 케이스: 올바른 스프레드 ==========

  // 성공: A4 스프레드 10페이지 (= 단면 20페이지)
  let pdfBytes = await createSpreadPdf(10, SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT, 'A4 Spread 10');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'success-a4-spread-10.pdf'), pdfBytes);
  console.log('  ✅ success-a4-spread-10.pdf (10 spreads = 20 single pages, 432x303)');

  // 성공: A4 스프레드 20페이지 (= 단면 40페이지)
  pdfBytes = await createSpreadPdf(20, SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT, 'A4 Spread 20');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'success-a4-spread-20.pdf'), pdfBytes);
  console.log('  ✅ success-a4-spread-20.pdf (20 spreads = 40 single pages, 432x303)');

  // 성공: A4 스프레드 5페이지 (최소)
  pdfBytes = await createSpreadPdf(5, SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT, 'A4 Spread 5');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'success-a4-spread-5.pdf'), pdfBytes);
  console.log('  ✅ success-a4-spread-5.pdf (5 spreads = 10 single pages, 432x303)');

  // 성공: B5 스프레드 10페이지
  pdfBytes = await createSpreadPdf(10, SPREAD_B5_WIDTH, SPREAD_B5_HEIGHT, 'B5 Spread 10');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'success-b5-spread-10.pdf'), pdfBytes);
  console.log('  ✅ success-b5-spread-10.pdf (10 spreads, 376x263)');

  // 성공: 사철제본 + 스프레드 (16페이지 = 스프레드 8)
  pdfBytes = await createSpreadPdf(8, SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT, 'Saddle Spread 8');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'success-saddle-spread-8.pdf'), pdfBytes);
  console.log('  ✅ success-saddle-spread-8.pdf (8 spreads = 16 pages for saddle stitch)');

  // ========== 경고 케이스: 혼합 PDF ==========

  // 경고: 표지(단면) + 내지(펼침면)
  const pdfDoc1 = await PDFDocument.create();
  const font1 = await pdfDoc1.embedFont(StandardFonts.Helvetica);
  // 표지 1장 (단면)
  const cover1 = pdfDoc1.addPage([A4_BLEED_WIDTH, A4_BLEED_HEIGHT]);
  cover1.drawText('Cover (Single)', { x: 50, y: A4_BLEED_HEIGHT - 50, size: 18, font: font1 });
  // 내지 5장 (펼침면)
  for (let i = 1; i <= 5; i++) {
    const page = pdfDoc1.addPage([SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT]);
    page.drawLine({ start: { x: SPREAD_A4_WIDTH / 2, y: 0 }, end: { x: SPREAD_A4_WIDTH / 2, y: SPREAD_A4_HEIGHT }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    page.drawText(`Content Spread ${i}`, { x: 50, y: SPREAD_A4_HEIGHT - 50, size: 14, font: font1 });
  }
  pdfBytes = await pdfDoc1.save();
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'warn-mixed-cover-content.pdf'), pdfBytes);
  console.log('  ⚠️  warn-mixed-cover-content.pdf (cover single + content spread)');

  // 경고: 첫 페이지 + 마지막 페이지가 단면, 중간이 펼침
  const pdfDoc2 = await PDFDocument.create();
  const font2 = await pdfDoc2.embedFont(StandardFonts.Helvetica);
  pdfDoc2.addPage([A4_BLEED_WIDTH, A4_BLEED_HEIGHT]).drawText('First Single', { x: 50, y: A4_BLEED_HEIGHT - 50, size: 18, font: font2 });
  for (let i = 1; i <= 3; i++) {
    const page = pdfDoc2.addPage([SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT]);
    page.drawLine({ start: { x: SPREAD_A4_WIDTH / 2, y: 0 }, end: { x: SPREAD_A4_WIDTH / 2, y: SPREAD_A4_HEIGHT }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    page.drawText(`Middle Spread ${i}`, { x: 50, y: SPREAD_A4_HEIGHT - 50, size: 14, font: font2 });
  }
  pdfDoc2.addPage([A4_BLEED_WIDTH, A4_BLEED_HEIGHT]).drawText('Last Single', { x: 50, y: A4_BLEED_HEIGHT - 50, size: 18, font: font2 });
  pdfBytes = await pdfDoc2.save();
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'warn-mixed-first-last-single.pdf'), pdfBytes);
  console.log('  ⚠️  warn-mixed-first-last-single.pdf (first/last single, middle spread)');

  // ========== 실패 케이스: 잘못된 스프레드 ==========

  // 실패: 단면으로 주문했는데 펼침면 제출 (사이즈 불일치)
  pdfBytes = await createSpreadPdf(10, SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT, 'Wrong: Spread for Single');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-spread-for-single-order.pdf'), pdfBytes);
  console.log('  ❌ fail-spread-for-single-order.pdf (spread submitted for single page order)');

  // 실패: 잘못된 스프레드 크기 (너비가 2배 미만)
  pdfBytes = await createSpreadPdf(10, mmToPt(400), SPREAD_A4_HEIGHT, 'Wrong Width Spread');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-wrong-width-spread.pdf'), pdfBytes);
  console.log('  ❌ fail-wrong-width-spread.pdf (400mm width, should be 432mm)');

  // 실패: 잘못된 스프레드 크기 (높이 불일치)
  pdfBytes = await createSpreadPdf(10, SPREAD_A4_WIDTH, mmToPt(280), 'Wrong Height Spread');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-wrong-height-spread.pdf'), pdfBytes);
  console.log('  ❌ fail-wrong-height-spread.pdf (280mm height, should be 303mm)');

  // 실패: 스프레드 크기가 너무 작음 (A5 스프레드)
  pdfBytes = await createSpreadPdf(10, mmToPt(296), mmToPt(210), 'Too Small Spread');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-too-small-spread.pdf'), pdfBytes);
  console.log('  ❌ fail-too-small-spread.pdf (A5 spread size, too small)');

  // 실패: 단면 페이지만 있음 (펼침면 주문인데)
  pdfBytes = await createPdfWithPages(20, A4_BLEED_WIDTH, A4_BLEED_HEIGHT, 'Single for Spread Order');
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-single-for-spread-order.pdf'), pdfBytes);
  console.log('  ❌ fail-single-for-spread-order.pdf (single pages submitted for spread order)');

  // 실패: 불규칙한 페이지 크기 (각 페이지마다 다른 크기)
  const pdfDoc3 = await PDFDocument.create();
  const font3 = await pdfDoc3.embedFont(StandardFonts.Helvetica);
  pdfDoc3.addPage([SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT]).drawText('Page 1 - Normal', { x: 50, y: SPREAD_A4_HEIGHT - 50, size: 14, font: font3 });
  pdfDoc3.addPage([SPREAD_A4_WIDTH + 50, SPREAD_A4_HEIGHT]).drawText('Page 2 - Wider', { x: 50, y: SPREAD_A4_HEIGHT - 50, size: 14, font: font3 });
  pdfDoc3.addPage([SPREAD_A4_WIDTH, SPREAD_A4_HEIGHT + 30]).drawText('Page 3 - Taller', { x: 50, y: SPREAD_A4_HEIGHT - 20, size: 14, font: font3 });
  pdfDoc3.addPage([SPREAD_A4_WIDTH - 20, SPREAD_A4_HEIGHT]).drawText('Page 4 - Narrower', { x: 50, y: SPREAD_A4_HEIGHT - 50, size: 14, font: font3 });
  pdfBytes = await pdfDoc3.save();
  await fs.writeFile(path.join(FIXTURES_DIR, 'spread', 'fail-irregular-sizes.pdf'), pdfBytes);
  console.log('  ❌ fail-irregular-sizes.pdf (each page has different size)');
}

// ============================================================
// CMYK / 별색 / 투명도 PDF 생성
// ============================================================

async function generateColorPdfs(): Promise<void> {
  console.log('\n📁 CMYK PDFs');

  // 성공: RGB만 사용 (CMYK 없음)
  let pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'RGB Only');
  await fs.writeFile(path.join(FIXTURES_DIR, 'cmyk', 'success-rgb-only.pdf'), pdfBytes);
  console.log('  ✅ success-rgb-only.pdf (RGB only, no CMYK)');

  // 실패: CMYK 시그니처 포함 (후가공 파일에서)
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'CMYK Print');
  const cmykMarker = Buffer.from('\n/ColorSpace /DeviceCMYK\n/DeviceCMYK\n');
  let originalBuffer = Buffer.from(pdfBytes);
  let pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), cmykMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'cmyk', 'fail-cmyk-for-postprocess.pdf'), pdfBytes);
  console.log('  ❌ fail-cmyk-for-postprocess.pdf (CMYK in post-process file)');

  console.log('\n📁 Spot Color PDFs');

  // 성공: 별색 전용 (후가공용)
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'Spot Color Only');
  const spotMarker = Buffer.from('\n/Separation /PANTONE#20Red#20032#20C\n/DeviceN [/CutContour /Crease]\n');
  originalBuffer = Buffer.from(pdfBytes);
  pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), spotMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'spot-color', 'success-spot-only.pdf'), pdfBytes);
  console.log('  ✅ success-spot-only.pdf (spot color only, for post-process)');

  // 경고: CMYK + 별색 혼합
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'CMYK + Spot Mixed');
  const mixedMarker = Buffer.from('\n/ColorSpace /DeviceCMYK\n/Separation /PANTONE#20485#20C\n');
  originalBuffer = Buffer.from(pdfBytes);
  pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), mixedMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'spot-color', 'warn-cmyk-spot-mixed.pdf'), pdfBytes);
  console.log('  ⚠️  warn-cmyk-spot-mixed.pdf (CMYK + spot color mixed)');

  console.log('\n📁 Transparency/Overprint PDFs');

  // 성공: 투명도 없음
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'No Transparency');
  await fs.writeFile(path.join(FIXTURES_DIR, 'transparency', 'success-no-transparency.pdf'), pdfBytes);
  console.log('  ✅ success-no-transparency.pdf (no transparency)');

  // 경고: 투명도 포함
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'With Transparency');
  const transMarker = Buffer.from('\n/ca 0.5\n/CA 0.5\n/BM /Multiply\n');
  originalBuffer = Buffer.from(pdfBytes);
  pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), transMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'transparency', 'warn-with-transparency.pdf'), pdfBytes);
  console.log('  ⚠️  warn-with-transparency.pdf (has transparency)');

  // 경고: 오버프린트 포함
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'With Overprint');
  const overMarker = Buffer.from('\n/OP true\n/op true\n/OPM 1\n');
  originalBuffer = Buffer.from(pdfBytes);
  pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), overMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'transparency', 'warn-with-overprint.pdf'), pdfBytes);
  console.log('  ⚠️  warn-with-overprint.pdf (has overprint)');

  // 경고: 투명도 + 오버프린트 둘 다
  pdfBytes = await createPdfWithPages(1, A4_WIDTH, A4_HEIGHT, 'Both Trans+Over');
  const bothMarker = Buffer.from('\n/ca 0.7\n/CA 0.7\n/BM /Screen\n/OP true\n/op true\n');
  originalBuffer = Buffer.from(pdfBytes);
  pos = originalBuffer.indexOf('endstream');
  if (pos > 0) {
    pdfBytes = new Uint8Array(Buffer.concat([originalBuffer.slice(0, pos), bothMarker, originalBuffer.slice(pos)]));
  }
  await fs.writeFile(path.join(FIXTURES_DIR, 'transparency', 'warn-both-trans-overprint.pdf'), pdfBytes);
  console.log('  ⚠️  warn-both-trans-overprint.pdf (has both transparency and overprint)');
}

// ============================================================
// 메인 실행
// ============================================================

async function main(): Promise<void> {
  console.log('🚀 Generating PDF test fixtures...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    await generateRgbPdfs();
    await generateSaddleStitchPdfs();
    await generateSpreadPdfs();
    await generateColorPdfs();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All fixtures generated successfully!');
    console.log('\n📊 Summary:');
    console.log('  ✅ Success cases: 성공해야 하는 케이스');
    console.log('  ⚠️  Warning cases: 경고가 발생해야 하는 케이스');
    console.log('  ❌ Fail cases: 오류가 발생해야 하는 케이스');
    console.log('\n⚠️  Note: CMYK, Spot Color, Transparency PDFs contain structural markers');
    console.log('   for testing detection. For production testing, use Adobe tools.');
  } catch (error) {
    console.error('❌ Error generating fixtures:', error);
    process.exit(1);
  }
}

main();
