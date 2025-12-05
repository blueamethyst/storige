# 템플릿 S3 저장 경로 분리 상세 설계

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상태**: 제안 (Proposal)
> **상위 문서**: [EDITOR-IMPROVEMENT.md](../EDITOR-IMPROVEMENT.md)

---

## 1. 현재 상태 분석

### 1.1 현재 S3 저장 경로

모든 에디터 파일(사용자 작업, 관리자 템플릿)이 **동일한 경로 구조**를 사용합니다.

```
s3://ownweb/private/users/{userId}/documents/{uuid}-{filename}
```

| 파일 유형 | 경로 예시 |
|----------|----------|
| 사용자 작업 (EditorDesign) | `users/user_123/documents/abc-design.json` |
| 관리자 템플릿 (EditorTemplate) | `users/admin_456/documents/xyz-template.json` |

### 1.2 관련 코드

**Backend - FilePathGenerator.kt**
```kotlin
// 현재 구현
when (purpose) {
    FileUploadPurpose.PERSONAL_DOCUMENT -> "users/${userId}/documents"
    // EDITOR_TEMPLATE purpose가 없음
}
```

**Frontend - media.ts**
```typescript
// 모든 저장에서 동일한 purpose 사용
const purpose = 'PERSONAL_DOCUMENT'
```

### 1.3 문제점 상세

#### 문제 1: 관리자 계정 의존성

```
[관리자 A가 템플릿 생성]
    ↓
s3://ownweb/private/users/admin_A/documents/template.json
    ↓
[관리자 A 퇴사/계정 비활성화]
    ↓
템플릿 파일 접근 권한 문제 발생 가능
```

#### 문제 2: 권한 관리 복잡성

| 파일 유형 | 접근 권한 | 현재 상태 |
|----------|----------|----------|
| 사용자 개인 작업 | 본인만 | ✓ 적절 |
| 글로벌 템플릿 | 모든 사용자 | ✗ 개인 폴더에 저장됨 |
| 스토어 템플릿 | 스토어 멤버 | ✗ 개인 폴더에 저장됨 |

#### 문제 3: 운영 어려움

- 템플릿만 별도 백업 불가
- 템플릿 마이그레이션 시 개인 파일과 분리 어려움
- 스토리지 사용량 분석 시 템플릿/개인작업 구분 불가

---

## 2. 개선 아키텍처 설계

### 2.1 새로운 S3 경로 구조

```
s3://ownweb/
│
├── private/
│   └── users/
│       └── {userId}/
│           └── documents/           # 사용자 개인 작업 (기존 유지)
│               └── {uuid}-{filename}.json
│
├── protected/
│   ├── global/
│   │   └── templates/               # 글로벌 템플릿 (신규)
│   │       └── {uuid}-{filename}.json
│   │
│   └── stores/
│       └── {storeId}/
│           └── templates/           # 스토어별 템플릿 (신규)
│               └── {uuid}-{filename}.json
```

### 2.2 경로별 접근 권한

| 경로 | 접근 권한 | 용도 |
|------|----------|------|
| `private/users/{userId}/documents/` | 해당 사용자만 | 개인 작업 |
| `protected/global/templates/` | 모든 인증된 사용자 | 글로벌 템플릿 |
| `protected/stores/{storeId}/templates/` | 해당 스토어 멤버 | 스토어 템플릿 |

### 2.3 저장 분기 로직

```
┌─────────────────────────────────────────────────────────────────┐
│                    저장 경로 분기                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [저장 요청]                                                    │
│       │                                                         │
│       ▼                                                         │
│   ┌───────────────────┐                                         │
│   │ 저장 타입 확인     │                                         │
│   └─────────┬─────────┘                                         │
│             │                                                   │
│   ┌─────────┼─────────────────┐                                │
│   ▼         ▼                 ▼                                │
│ [개인작업] [글로벌템플릿]  [스토어템플릿]                         │
│   │         │                 │                                │
│   ▼         ▼                 ▼                                │
│ PERSONAL  GLOBAL_TEMPLATE  STORE_TEMPLATE                      │
│ _DOCUMENT                                                       │
│   │         │                 │                                │
│   ▼         ▼                 ▼                                │
│ private/  protected/       protected/                          │
│ users/    global/          stores/                             │
│ {userId}/ templates/       {storeId}/                          │
│ documents/                 templates/                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 구현 상세

### 3.1 Backend 수정

#### FileUploadPurpose 열거형 확장

**파일**: `FileUploadPurpose.kt`

```kotlin
enum class FileUploadPurpose {
    PERSONAL_DOCUMENT,      // 기존
    GLOBAL_TEMPLATE,        // 신규: 글로벌 템플릿
    STORE_TEMPLATE,         // 신규: 스토어 템플릿
    // ... 기타
}
```

#### FilePathGenerator 수정

**파일**: `FilePathGenerator.kt`

```kotlin
fun generatePath(
    purpose: FileUploadPurpose,
    userId: String?,
    storeId: String?,
    filename: String
): String {
    val uuid = UUID.randomUUID().toString()

    return when (purpose) {
        FileUploadPurpose.PERSONAL_DOCUMENT ->
            "private/users/${userId}/documents/${uuid}-${filename}"

        FileUploadPurpose.GLOBAL_TEMPLATE ->
            "protected/global/templates/${uuid}-${filename}"

        FileUploadPurpose.STORE_TEMPLATE ->
            "protected/stores/${storeId}/templates/${uuid}-${filename}"

        // ... 기타
    }
}
```

#### S3 버킷 정책 업데이트

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PrivateUserAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject", "s3:PutObject"],
            "Resource": "arn:aws:s3:::ownweb/private/users/${aws:userid}/*",
            "Condition": {
                "StringEquals": {
                    "aws:userid": "${aws:userid}"
                }
            }
        },
        {
            "Sid": "ProtectedGlobalRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::ownweb/protected/global/templates/*",
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "true"
                }
            }
        },
        {
            "Sid": "ProtectedStoreAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject", "s3:PutObject"],
            "Resource": "arn:aws:s3:::ownweb/protected/stores/${storeId}/templates/*"
        }
    ]
}
```

### 3.2 GraphQL API 수정

#### CreateUploadUrl Mutation 확장

```graphql
input CreateUploadUrlInput {
    filename: String!
    contentType: String!
    purpose: FileUploadPurpose!
    storeId: ID  # STORE_TEMPLATE인 경우 필수
}

enum FileUploadPurpose {
    PERSONAL_DOCUMENT
    GLOBAL_TEMPLATE
    STORE_TEMPLATE
}

type CreateUploadUrlPayload {
    uploadUrl: String!
    finalPath: String!
    expiresAt: DateTime!
}
```

### 3.3 Frontend 수정

#### media.ts 수정

**파일**: `apps/web/src/composables/media.ts`

```typescript
// 저장 타입에 따른 purpose 결정
function getUploadPurpose(saveContext: SaveContext): FileUploadPurpose {
    if (saveContext.isAdminTemplate) {
        if (saveContext.storeId) {
            return 'STORE_TEMPLATE'
        }
        return 'GLOBAL_TEMPLATE'
    }
    return 'PERSONAL_DOCUMENT'
}

// 업로드 URL 생성 시 purpose 전달
async function uploadFile(file: Blob, filename: string, saveContext: SaveContext) {
    const purpose = getUploadPurpose(saveContext)

    const { data } = await createUploadUrl({
        variables: {
            input: {
                filename,
                contentType: file.type,
                purpose,
                storeId: saveContext.storeId  // 스토어 템플릿인 경우
            }
        }
    })

    // ... 업로드 로직
}
```

#### AppNav.vue 수정

**파일**: `apps/web/src/components/AppNav.vue`

```typescript
// 관리자 저장 시 컨텍스트 전달
async function saveForAdmin(finishEdit: boolean) {
    const saveContext: SaveContext = {
        isAdminTemplate: true,
        storeId: currentStore.value?.id,  // 스토어 템플릿인 경우
        // ...
    }

    await saveWorkForAdmin(saveContext, finishEdit)
}
```

---

## 4. 마이그레이션 계획

### 4.1 마이그레이션 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    마이그레이션 흐름                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Step 1: 기존 템플릿 식별]                                     │
│   - DB에서 EditorTemplate 목록 조회                              │
│   - 각 템플릿의 S3 경로 확인                                     │
│       │                                                         │
│       ▼                                                         │
│   [Step 2: 새 경로로 복사]                                       │
│   - private/users/.../template.json                             │
│     → protected/global/templates/template.json                  │
│       │                                                         │
│       ▼                                                         │
│   [Step 3: DB 경로 업데이트]                                     │
│   - EditorTemplate.media.url 업데이트                           │
│   - EditorTemplate.image.url 업데이트                           │
│       │                                                         │
│       ▼                                                         │
│   [Step 4: 검증]                                                 │
│   - 모든 템플릿 로드 테스트                                      │
│   - 썸네일 표시 확인                                             │
│       │                                                         │
│       ▼                                                         │
│   [Step 5: 기존 파일 정리 (선택)]                                │
│   - 검증 완료 후 기존 경로 파일 삭제                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 마이그레이션 스크립트

```kotlin
// MigrateTemplatePathsJob.kt
@Component
class MigrateTemplatePathsJob(
    private val templateRepository: EditorTemplateRepository,
    private val s3Client: S3Client
) {
    fun migrate() {
        val templates = templateRepository.findAll()

        templates.forEach { template ->
            val oldPath = template.media.url

            // 이미 마이그레이션된 경우 스킵
            if (oldPath.contains("protected/global/templates")) {
                return@forEach
            }

            // 새 경로 생성
            val filename = oldPath.substringAfterLast("/")
            val newPath = "protected/global/templates/$filename"

            // S3 복사
            s3Client.copyObject(
                CopyObjectRequest.builder()
                    .sourceBucket("ownweb")
                    .sourceKey(oldPath)
                    .destinationBucket("ownweb")
                    .destinationKey(newPath)
                    .build()
            )

            // DB 업데이트
            template.media.url = newPath
            templateRepository.save(template)

            log.info("Migrated template: ${template.id} from $oldPath to $newPath")
        }
    }
}
```

### 4.3 롤백 계획

```kotlin
// 롤백 시나리오
fun rollback(templateId: String) {
    val template = templateRepository.findById(templateId)

    // 백업된 원본 경로로 복원
    val backupPath = backupRepository.findByTemplateId(templateId)

    // S3 복사 (역방향)
    s3Client.copyObject(
        sourceKey = template.media.url,
        destinationKey = backupPath.originalPath
    )

    // DB 복원
    template.media.url = backupPath.originalPath
    templateRepository.save(template)
}
```

---

## 5. 구현 계획

### Phase 1: Backend 준비

| 작업 | 설명 | 담당 |
|------|------|------|
| FileUploadPurpose 확장 | 새 enum 값 추가 | Backend |
| FilePathGenerator 수정 | 경로 생성 로직 분기 | Backend |
| S3 버킷 정책 업데이트 | 새 경로 접근 권한 설정 | DevOps |

### Phase 2: API 수정

| 작업 | 설명 | 담당 |
|------|------|------|
| CreateUploadUrl 수정 | storeId 파라미터 추가 | Backend |
| GraphQL 스키마 업데이트 | 새 purpose 값 추가 | Backend |

### Phase 3: Frontend 수정

| 작업 | 설명 | 담당 |
|------|------|------|
| media.ts 수정 | purpose 분기 로직 | Frontend |
| AppNav.vue 수정 | saveContext 전달 | Frontend |
| 관리자 UI 수정 | 템플릿 타입 선택 UI (선택) | Frontend |

### Phase 4: 마이그레이션

| 작업 | 설명 | 담당 |
|------|------|------|
| 마이그레이션 스크립트 작성 | 기존 템플릿 이동 | Backend |
| 테스트 환경 마이그레이션 | 검증 | QA |
| 프로덕션 마이그레이션 | 실행 | DevOps |

---

## 6. 기대 효과

### 정량적 개선

| 지표 | 현재 | 개선 후 |
|------|------|---------|
| 템플릿 백업 시간 | 전체 users 폴더 스캔 필요 | templates 폴더만 백업 |
| 접근 권한 설정 | 개별 파일 권한 관리 | 폴더 단위 일괄 관리 |
| 스토리지 분석 | 구분 불가 | 타입별 사용량 확인 가능 |

### 정성적 개선

- **계정 독립성**: 관리자 계정 변경/삭제 시에도 템플릿 유지
- **명확한 권한 체계**: 경로 기반의 직관적인 접근 제어
- **운영 효율성**: 템플릿 관리 작업 단순화
- **확장성**: 스토어별 템플릿 분리로 멀티테넌시 지원 강화

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| 마이그레이션 중 템플릿 접근 불가 | 사용자 영향 | 점심시간/심야 작업, 읽기 전용 모드 |
| S3 권한 설정 오류 | 접근 차단 | 테스트 환경에서 충분히 검증 |
| 기존 URL 캐시 | 이전 경로 참조 | CDN 캐시 무효화, 리다이렉트 설정 |

---

## 참고 자료

- AWS S3 버킷 정책: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- AWS S3 객체 복사: https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html
