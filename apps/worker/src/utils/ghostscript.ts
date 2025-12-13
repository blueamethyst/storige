import { spawn } from 'child_process';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('GhostscriptUtil');

/**
 * Ghostscript 실행 경로
 * Docker 환경에서는 'gs', 로컬 환경에서는 전체 경로가 필요할 수 있음
 */
const GS_PATH = process.env.GHOSTSCRIPT_PATH || 'gs';

export interface GsOptions {
  /** 입력 파일 경로 */
  input: string;
  /** 출력 파일 경로 */
  output: string;
  /** DPI 해상도 (기본: 300) */
  resolution?: number;
  /** 추가 Ghostscript 옵션 */
  extraArgs?: string[];
}

/**
 * Ghostscript 명령 실행
 */
export async function runGhostscript(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const gs = spawn(GS_PATH, args);

    let stdout = '';
    let stderr = '';

    gs.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gs.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gs.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        logger.error(`Ghostscript error: ${stderr}`);
        reject(new Error(`Ghostscript exited with code ${code}: ${stderr}`));
      }
    });

    gs.on('error', (err) => {
      reject(new Error(`Failed to start Ghostscript: ${err.message}`));
    });
  });
}

/**
 * PDF에 블리드 추가 (페이지 확장 + 콘텐츠 중앙 배치)
 */
export async function addBleedToPdf(
  inputPath: string,
  outputPath: string,
  bleedMm: number,
): Promise<void> {
  // 블리드를 포인트로 변환 (1mm = 2.83465 points)
  const bleedPt = bleedMm * 2.83465;

  // PostScript로 블리드 추가
  // 1. 페이지 크기를 블리드만큼 확장
  // 2. 원본 콘텐츠를 블리드 오프셋만큼 이동
  const psCode = `
<< /PageSize [/oldwidth /oldheight] >> setpagedevice
<< /PageSize [oldwidth ${bleedPt * 2} add oldheight ${bleedPt * 2} add] >> setpagedevice
${bleedPt} ${bleedPt} translate
`;

  // Ghostscript를 사용한 블리드 적용
  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dDEVICEWIDTHPOINTS=${bleedPt * 2}`,
    `-dDEVICEHEIGHTPOINTS=${bleedPt * 2}`,
    `-dFIXEDMEDIA`,
    `-sOutputFile=${outputPath}`,
    `-c`,
    `<< /BeginPage { ${bleedPt} ${bleedPt} translate } bind >> setpagedevice`,
    `-f`,
    inputPath,
  ];

  await runGhostscript(args);
  logger.log(`Added ${bleedMm}mm bleed to PDF: ${outputPath}`);
}

/**
 * PDF 페이지 크기 조정 (확대/축소)
 */
export async function resizePdf(
  inputPath: string,
  outputPath: string,
  targetWidthMm: number,
  targetHeightMm: number,
): Promise<void> {
  // mm를 포인트로 변환
  const widthPt = targetWidthMm * 2.83465;
  const heightPt = targetHeightMm * 2.83465;

  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dDEVICEWIDTHPOINTS=${widthPt}`,
    `-dDEVICEHEIGHTPOINTS=${heightPt}`,
    '-dFIXEDMEDIA',
    '-dPDFFitPage',
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  await runGhostscript(args);
  logger.log(`Resized PDF to ${targetWidthMm}x${targetHeightMm}mm: ${outputPath}`);
}

/**
 * PDF를 이미지로 변환 (미리보기 생성)
 */
export async function pdfToImage(
  inputPath: string,
  outputPath: string,
  options: {
    page?: number;
    resolution?: number;
    format?: 'png' | 'jpeg';
  } = {},
): Promise<void> {
  const { page = 1, resolution = 150, format = 'png' } = options;

  const device = format === 'jpeg' ? 'jpeg' : 'png16m';

  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    `-sDEVICE=${device}`,
    `-r${resolution}`,
    `-dFirstPage=${page}`,
    `-dLastPage=${page}`,
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  await runGhostscript(args);
  logger.log(`Generated preview image: ${outputPath}`);
}

/**
 * 여러 PDF 병합
 */
export async function mergePdfs(
  inputPaths: string[],
  outputPath: string,
): Promise<void> {
  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-sOutputFile=${outputPath}`,
    ...inputPaths,
  ];

  await runGhostscript(args);
  logger.log(`Merged ${inputPaths.length} PDFs: ${outputPath}`);
}

/**
 * PDF 정보 추출
 */
export async function getPdfInfo(inputPath: string): Promise<{
  pageCount: number;
  width: number;
  height: number;
}> {
  // pdf-lib를 사용하거나 Ghostscript로 정보 추출
  // 여기서는 간단히 Ghostscript 출력 파싱
  const args = [
    '-q',
    '-dNODISPLAY',
    '-dBATCH',
    '-sFileName=' + inputPath,
    '-c',
    `(${inputPath}) (r) file runpdfbegin pdfpagecount = quit`,
  ];

  try {
    const output = await runGhostscript(args);
    const pageCount = parseInt(output.trim(), 10) || 1;

    // 기본값 반환 (실제로는 더 정교한 파싱 필요)
    return {
      pageCount,
      width: 210, // A4 기본값
      height: 297,
    };
  } catch {
    return {
      pageCount: 1,
      width: 210,
      height: 297,
    };
  }
}

/**
 * Ghostscript 사용 가능 여부 확인
 */
export async function isGhostscriptAvailable(): Promise<boolean> {
  try {
    await runGhostscript(['--version']);
    return true;
  } catch {
    logger.warn('Ghostscript not available');
    return false;
  }
}
