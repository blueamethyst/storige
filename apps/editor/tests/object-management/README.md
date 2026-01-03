# 객체 선택 및 관리 테스트

storige 에디터의 객체 관리 기능에 대한 E2E 테스트 모음입니다.

## 테스트 목록

### 1. 단일 객체 선택 (`select-single-object.spec.ts`)
- 캔버스에서 특정 객체를 클릭하여 선택
- 선택된 객체의 핸들 표시 확인
- 우측 제어 패널 표시 확인

### 2. 여러 객체 선택 (`select-multiple-objects.spec.ts`)
- Shift + 클릭으로 여러 객체 선택
- 다중 선택 상태 확인
- "N개의 아이템" 텍스트 표시 확인

### 3. 드래그 영역 선택 (`drag-select-objects.spec.ts`)
- 마우스 드래그로 선택 영역 생성
- 선택 영역 내의 모든 객체 선택 확인
- 다중 선택 상태 확인

### 4. 객체 삭제 (`delete-object.spec.ts`)
- 객체 선택 후 삭제 버튼 클릭
- 객체가 캔버스에서 제거되는지 확인
- 제어 패널이 사라지는지 확인

### 5. 객체 잠금 (`lock-object.spec.ts`)
- 객체 선택 후 잠금 버튼 클릭
- 잠긴 객체는 이동되지 않음 확인
- 잠금 아이콘 변경 확인

### 6. 객체 가시성 토글 (`toggle-visibility.spec.ts`)
- 가시성 버튼으로 객체 숨기기/표시
- 숨겨진 객체는 클릭 선택 불가 확인
- 다시 표시 후 정상 동작 확인

### 7. 객체 그룹화 (`group-objects.spec.ts`)
- 여러 객체 선택 후 그룹화
- 그룹 객체 생성 확인
- 제어 패널에 "그룹" 텍스트 표시 확인

### 8. 객체 그룹 해제 (`ungroup-objects.spec.ts`)
- 그룹 객체 선택 후 그룹 해제
- 개별 객체로 분리되는지 확인

## 실행 방법

### 전체 테스트 실행
```bash
cd /Users/martin/Documents/work/papas/storige/apps/editor
pnpm test:e2e
```

### 특정 테스트 파일 실행
```bash
pnpm test:e2e tests/object-management/select-single-object.spec.ts
```

### UI 모드로 실행
```bash
pnpm test:e2e:ui
```

### 특정 테스트만 실행
```bash
# 단일 객체 선택 테스트만
pnpm test:e2e --grep "단일 객체 선택"

# 그룹 관련 테스트만
pnpm test:e2e --grep "그룹"
```

## 사전 요구사항

1. 에디터가 `http://localhost:3000`에서 실행 중이어야 합니다
   ```bash
   pnpm dev
   ```

2. Playwright 브라우저가 설치되어 있어야 합니다
   ```bash
   pnpm exec playwright install
   ```

## 테스트 구조

모든 테스트는 다음과 같은 구조를 따릅니다:

1. **페이지 로드**: 에디터 페이지로 이동
2. **캔버스 확인**: 캔버스가 로드되었는지 확인
3. **객체 추가**: 테스트에 필요한 객체 추가
4. **동작 수행**: 선택, 삭제, 잠금 등의 동작 실행
5. **결과 검증**: 기대한 결과가 나타나는지 확인

## 주요 셀렉터

- `canvas`: Fabric.js 캔버스 요소
- `#control-bar`: 우측 제어 패널
- `.type-text`: 선택된 객체 타입 텍스트
- `.actions-left`: 잠금/가시성 버튼 영역
- `.actions-right`: 삭제 버튼 영역

## 트러블슈팅

### 테스트가 실패하는 경우

1. **에디터가 실행되고 있는지 확인**
   - `http://localhost:3000`에 접속 가능한지 확인

2. **타임아웃 에러**
   - 네트워크가 느린 경우 timeout 값을 증가
   - `await expect(element).toBeVisible({ timeout: 10000 })`

3. **객체를 찾을 수 없는 경우**
   - 캔버스가 완전히 로드된 후 동작하는지 확인
   - `waitForTimeout` 값을 조정

4. **클릭이 동작하지 않는 경우**
   - 객체의 위치가 정확한지 확인
   - `boundingBox()` 값을 로그로 출력하여 디버깅
