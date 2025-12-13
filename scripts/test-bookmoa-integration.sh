#!/bin/bash
#
# bookmoa 연동 테스트 스크립트
#
# 사용법:
#   ./scripts/test-bookmoa-integration.sh
#
# 환경변수:
#   API_URL - API 서버 URL (기본값: http://localhost:4000/api)
#   API_KEY - API 인증 키 (필수)
#

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
API_URL="${API_URL:-http://localhost:4000/api}"
API_KEY="${API_KEY:-}"

# 테스트 데이터
TEST_MEMBER_SEQNO=12345
TEST_MEMBER_ID="test@example.com"
TEST_MEMBER_NAME="테스트 사용자"
TEST_ORDER_SEQNO=99999
TEST_TEMPLATE_SET_ID=""

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  bookmoa 연동 테스트${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "API URL: ${YELLOW}${API_URL}${NC}"

# API 키 확인
if [ -z "$API_KEY" ]; then
    echo -e "${RED}[ERROR] API_KEY 환경변수가 설정되지 않았습니다.${NC}"
    echo "사용법: API_KEY=your-api-key ./scripts/test-bookmoa-integration.sh"
    exit 1
fi

echo -e "API Key: ${YELLOW}${API_KEY:0:8}...${NC}"
echo ""

# 함수: API 호출 결과 확인
check_response() {
    local name=$1
    local response=$2
    local expected_field=$3

    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC} $name"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $name"
        echo -e "  응답: $(echo "$response" | head -c 200)"
        return 1
    fi
}

# 함수: HTTP 상태 코드 확인
check_http_status() {
    local name=$1
    local status=$2
    local expected=$3

    if [ "$status" -eq "$expected" ]; then
        echo -e "${GREEN}[PASS]${NC} $name (HTTP $status)"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $name (HTTP $status, expected $expected)"
        return 1
    fi
}

echo -e "${BLUE}[1/6] 헬스체크 테스트${NC}"
echo "----------------------------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>/dev/null || echo -e '{"error":"connection failed"}\n000')
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}[PASS]${NC} API 서버 연결 성공"
else
    echo -e "${RED}[FAIL]${NC} API 서버 연결 실패 (HTTP $HEALTH_STATUS)"
    echo "API 서버가 실행 중인지 확인하세요: $API_URL"
    exit 1
fi
echo ""

echo -e "${BLUE}[2/6] Shop Session API 테스트${NC}"
echo "----------------------------------------"

# Shop Session 생성
SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${API_URL}/auth/shop-session" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d '{
        "memberSeqno": '"$TEST_MEMBER_SEQNO"',
        "memberId": "'"$TEST_MEMBER_ID"'",
        "memberName": "'"$TEST_MEMBER_NAME"'"
    }' 2>/dev/null || echo -e '{"error":"request failed"}\n000')

SESSION_BODY=$(echo "$SESSION_RESPONSE" | head -n -1)
SESSION_STATUS=$(echo "$SESSION_RESPONSE" | tail -n 1)

if [ "$SESSION_STATUS" -eq 200 ] || [ "$SESSION_STATUS" -eq 201 ]; then
    ACCESS_TOKEN=$(echo "$SESSION_BODY" | jq -r '.accessToken // empty')
    if [ -n "$ACCESS_TOKEN" ]; then
        echo -e "${GREEN}[PASS]${NC} Shop Session 생성 성공"
        echo -e "  Access Token: ${ACCESS_TOKEN:0:20}..."
    else
        echo -e "${RED}[FAIL]${NC} Access Token 없음"
        echo "  응답: $SESSION_BODY"
        exit 1
    fi
else
    echo -e "${RED}[FAIL]${NC} Shop Session 생성 실패 (HTTP $SESSION_STATUS)"
    echo "  응답: $SESSION_BODY"
    exit 1
fi
echo ""

echo -e "${BLUE}[3/6] 템플릿셋 목록 조회 테스트${NC}"
echo "----------------------------------------"

# 템플릿셋 목록 조회
TEMPLATE_SETS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${API_URL}/template-sets" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    2>/dev/null || echo -e '{"error":"request failed"}\n000')

TEMPLATE_SETS_BODY=$(echo "$TEMPLATE_SETS_RESPONSE" | head -n -1)
TEMPLATE_SETS_STATUS=$(echo "$TEMPLATE_SETS_RESPONSE" | tail -n 1)

if [ "$TEMPLATE_SETS_STATUS" -eq 200 ]; then
    TEMPLATE_SET_COUNT=$(echo "$TEMPLATE_SETS_BODY" | jq 'if type == "array" then length else .data | length end' 2>/dev/null || echo "0")
    echo -e "${GREEN}[PASS]${NC} 템플릿셋 목록 조회 성공 (${TEMPLATE_SET_COUNT}개)"

    # 첫 번째 템플릿셋 ID 저장 (테스트용)
    TEST_TEMPLATE_SET_ID=$(echo "$TEMPLATE_SETS_BODY" | jq -r 'if type == "array" then .[0].id else .data[0].id end // empty' 2>/dev/null)
    if [ -n "$TEST_TEMPLATE_SET_ID" ]; then
        echo -e "  테스트용 템플릿셋 ID: ${TEST_TEMPLATE_SET_ID}"
    fi
else
    echo -e "${YELLOW}[WARN]${NC} 템플릿셋 목록 조회 실패 (HTTP $TEMPLATE_SETS_STATUS)"
    echo "  템플릿셋이 없거나 권한이 없습니다."
fi
echo ""

echo -e "${BLUE}[4/6] Edit Session 생성 테스트${NC}"
echo "----------------------------------------"

if [ -z "$TEST_TEMPLATE_SET_ID" ]; then
    echo -e "${YELLOW}[SKIP]${NC} 템플릿셋이 없어 Edit Session 테스트 건너뜀"
else
    # Edit Session 생성
    EDIT_SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}/edit-sessions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d '{
            "orderSeqno": '"$TEST_ORDER_SEQNO"',
            "mode": "both",
            "templateSetId": "'"$TEST_TEMPLATE_SET_ID"'"
        }' 2>/dev/null || echo -e '{"error":"request failed"}\n000')

    EDIT_SESSION_BODY=$(echo "$EDIT_SESSION_RESPONSE" | head -n -1)
    EDIT_SESSION_STATUS=$(echo "$EDIT_SESSION_RESPONSE" | tail -n 1)

    if [ "$EDIT_SESSION_STATUS" -eq 200 ] || [ "$EDIT_SESSION_STATUS" -eq 201 ]; then
        EDIT_SESSION_ID=$(echo "$EDIT_SESSION_BODY" | jq -r '.id // empty')
        if [ -n "$EDIT_SESSION_ID" ]; then
            echo -e "${GREEN}[PASS]${NC} Edit Session 생성 성공"
            echo -e "  Session ID: ${EDIT_SESSION_ID}"
        else
            echo -e "${RED}[FAIL]${NC} Session ID 없음"
        fi
    else
        echo -e "${RED}[FAIL]${NC} Edit Session 생성 실패 (HTTP $EDIT_SESSION_STATUS)"
        echo "  응답: $EDIT_SESSION_BODY"
    fi
fi
echo ""

echo -e "${BLUE}[5/6] Edit Session 조회 테스트${NC}"
echo "----------------------------------------"

if [ -z "$EDIT_SESSION_ID" ]; then
    echo -e "${YELLOW}[SKIP]${NC} Edit Session이 없어 조회 테스트 건너뜀"
else
    # Edit Session 조회
    GET_SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X GET "${API_URL}/edit-sessions/${EDIT_SESSION_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        2>/dev/null || echo -e '{"error":"request failed"}\n000')

    GET_SESSION_BODY=$(echo "$GET_SESSION_RESPONSE" | head -n -1)
    GET_SESSION_STATUS=$(echo "$GET_SESSION_RESPONSE" | tail -n 1)

    if [ "$GET_SESSION_STATUS" -eq 200 ]; then
        echo -e "${GREEN}[PASS]${NC} Edit Session 조회 성공"
        echo "  Status: $(echo "$GET_SESSION_BODY" | jq -r '.status')"
        echo "  Mode: $(echo "$GET_SESSION_BODY" | jq -r '.mode')"
    else
        echo -e "${RED}[FAIL]${NC} Edit Session 조회 실패 (HTTP $GET_SESSION_STATUS)"
    fi
fi
echo ""

echo -e "${BLUE}[6/6] Edit Session 완료 테스트${NC}"
echo "----------------------------------------"

if [ -z "$EDIT_SESSION_ID" ]; then
    echo -e "${YELLOW}[SKIP]${NC} Edit Session이 없어 완료 테스트 건너뜀"
else
    # Edit Session 완료
    COMPLETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X PATCH "${API_URL}/edit-sessions/${EDIT_SESSION_ID}/complete" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        2>/dev/null || echo -e '{"error":"request failed"}\n000')

    COMPLETE_BODY=$(echo "$COMPLETE_RESPONSE" | head -n -1)
    COMPLETE_STATUS=$(echo "$COMPLETE_RESPONSE" | tail -n 1)

    if [ "$COMPLETE_STATUS" -eq 200 ]; then
        COMPLETED_STATUS=$(echo "$COMPLETE_BODY" | jq -r '.status')
        echo -e "${GREEN}[PASS]${NC} Edit Session 완료 처리 성공"
        echo "  Status: $COMPLETED_STATUS"
    else
        echo -e "${RED}[FAIL]${NC} Edit Session 완료 실패 (HTTP $COMPLETE_STATUS)"
        echo "  응답: $COMPLETE_BODY"
    fi

    # 테스트 데이터 정리 (세션 삭제)
    echo ""
    echo -e "${BLUE}[정리] 테스트 세션 삭제${NC}"
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X DELETE "${API_URL}/edit-sessions/${EDIT_SESSION_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        2>/dev/null || echo -e '{"error":"request failed"}\n000')

    DELETE_STATUS=$(echo "$DELETE_RESPONSE" | tail -n 1)
    if [ "$DELETE_STATUS" -eq 200 ]; then
        echo -e "${GREEN}[DONE]${NC} 테스트 세션 삭제 완료"
    else
        echo -e "${YELLOW}[WARN]${NC} 테스트 세션 삭제 실패 (HTTP $DELETE_STATUS)"
    fi
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}  테스트 완료${NC}"
echo -e "${BLUE}======================================${NC}"
