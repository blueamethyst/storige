# PDF Test Fixtures

PDF 검증 기능 테스트를 위한 픽스처 파일 디렉토리입니다.

## 디렉토리 구조

```
pdf/
├── rgb/                    # RGB 색상 모드 PDF
│   ├── a4-single-page.pdf  # A4 단면 정상 PDF
│   └── a4-multi-page.pdf   # A4 다중 페이지 PDF
│
├── cmyk/                   # CMYK 색상 모드 PDF
│   ├── cmyk-print-file.pdf # DeviceCMYK 포함 인쇄용 PDF
│   └── cmyk-mixed-rgb.pdf  # CMYK + RGB 혼합 PDF
│
├── spot-color/             # 별색(Spot Color) PDF
│   ├── spot-only.pdf       # 별색만 포함 (후가공용)
│   └── spot-with-cmyk.pdf  # 별색 + CMYK 혼합
│
├── spread/                 # 펼침면(스프레드) PDF
│   ├── spread-432x303.pdf  # 432×303mm 펼침면 형식
│   └── mixed-cover-content.pdf # 표지(단면) + 내지(펼침) 혼합
│
├── saddle-stitch/          # 사철 제본 테스트
│   ├── valid-16-pages.pdf  # 16페이지 (4의 배수, 정상)
│   └── invalid-13-pages.pdf # 13페이지 (규격 위반)
│
├── transparency/           # 투명도/오버프린트 PDF
│   ├── with-transparency.pdf # 투명도 포함
│   └── with-overprint.pdf    # 오버프린트 포함
│
└── large/                  # 대형 PDF
    └── large-100mb.pdf     # 100MB 이상 대형 파일
```

## 테스트 케이스 매핑

| 테스트 케이스 | 파일 | 예상 결과 |
|--------------|------|----------|
| RGB 단면 정상 | rgb/a4-single-page.pdf | ✅ 통과 |
| CMYK 인쇄 파일 | cmyk/cmyk-print-file.pdf | colorMode: CMYK |
| Spot Color 후가공 | spot-color/spot-only.pdf | ✅ 통과 (후가공용) |
| CMYK + Spot 혼합 | spot-color/spot-with-cmyk.pdf | ⚠️ 경고 |
| 단면 + 펼침 혼합 | spread/mixed-cover-content.pdf | detectedType: mixed |
| 사철 규격 위반 | saddle-stitch/invalid-13-pages.pdf | ❌ 오류 |
| 대형 PDF | large/large-100mb.pdf | 용량 오류 또는 GS 생략 |

## 파일 생성 가이드

### pdf-lib로 생성 가능한 파일
- RGB PDF: pdf-lib로 직접 생성
- 단순 다중 페이지 PDF: pdf-lib로 생성

### 외부 도구 필요한 파일
- CMYK PDF: Adobe Illustrator, InDesign, 또는 Ghostscript 변환
- Spot Color PDF: Adobe Illustrator (별색 설정)
- 투명도/오버프린트 PDF: Adobe Illustrator/InDesign

### 대형 파일 생성
```bash
# 고해상도 이미지를 포함하여 100MB 이상 PDF 생성
# 또는 기존 PDF를 복제하여 크기 증가
```

## 주의사항

- Git LFS 사용 권장 (대형 PDF 파일)
- .gitignore에 large/ 디렉토리 추가 고려
- 실제 테스트 전 파일 무결성 확인 필요
