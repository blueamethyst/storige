<?php
/**
 * PHP 에디터 연동 테스트 - 설정 파일
 */

// API 설정 (Docker 컨테이너 내부에서 API 서버 접근)
define('API_BASE_URL', 'http://host.docker.internal:4000/api');

// 테스트 사용자 정보
define('TEST_USER_EMAIL', 'testuser@storige.com');
define('TEST_USER_PASSWORD', 'testpass123');

// 세션 설정
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);

/**
 * API 호출 헬퍼 함수
 */
function callApi($method, $endpoint, $data = null, $token = null) {
    $url = API_BASE_URL . $endpoint;

    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['success' => false, 'error' => $error, 'httpCode' => 0];
    }

    $decoded = json_decode($response, true);
    return [
        'success' => $httpCode >= 200 && $httpCode < 300,
        'data' => $decoded,
        'httpCode' => $httpCode
    ];
}

/**
 * 테스트 사용자 등록 (이미 있으면 무시)
 */
function ensureTestUserExists() {
    $result = callApi('POST', '/auth/register', [
        'email' => TEST_USER_EMAIL,
        'password' => TEST_USER_PASSWORD
    ]);

    // 409 (이미 존재) 또는 201 (생성 성공) 모두 OK
    return $result['httpCode'] === 201 || $result['httpCode'] === 409;
}

/**
 * 로그인 API를 호출하여 토큰 획득
 */
function getEditorToken($userId = null) {
    // 세션에 캐싱된 토큰 확인
    if (isset($_SESSION['api_token']) && isset($_SESSION['token_expires'])) {
        if ($_SESSION['token_expires'] > time()) {
            return $_SESSION['api_token'];
        }
    }

    // 테스트 사용자 존재 확인
    ensureTestUserExists();

    // 로그인 API 호출
    $result = callApi('POST', '/auth/login', [
        'email' => TEST_USER_EMAIL,
        'password' => TEST_USER_PASSWORD
    ]);

    if (!$result['success'] || !isset($result['data']['accessToken'])) {
        error_log('Login failed: ' . json_encode($result));
        return null;
    }

    // 토큰 캐싱 (1시간)
    $_SESSION['api_token'] = $result['data']['accessToken'];
    $_SESSION['token_expires'] = time() + 3600;

    return $result['data']['accessToken'];
}

/**
 * 테스트용 상품 데이터
 */
function getTestProducts() {
    return [
        [
            'id' => 'PROD-001',
            'name' => 'A4 무선제본 책자',
            'templateSetId' => 'ts-test-001',  // 포토북 A4 (DB)
            'description' => 'A4 사이즈 무선제본 책자 (210x297mm)',
            'price' => 15000,
            'thumbnail' => '/assets/images/product-1.jpg'
        ],
        [
            'id' => 'PROD-002',
            'name' => 'A5 사철제본 책자',
            'templateSetId' => 'ts-test-002',  // 리플릿 3단접지 (DB)
            'description' => 'A5 사이즈 사철제본 책자 (148x210mm)',
            'price' => 12000,
            'thumbnail' => '/assets/images/product-2.jpg'
        ],
        [
            'id' => 'PROD-003',
            'name' => '명함 디자인',
            'templateSetId' => 'ts-test-003',  // 명함 가로형 (DB)
            'description' => '표준 명함 (90x50mm)',
            'price' => 5000,
            'thumbnail' => '/assets/images/product-3.jpg'
        ]
    ];
}

/**
 * 특정 상품 조회
 */
function getProductById($productId) {
    $products = getTestProducts();
    foreach ($products as $product) {
        if ($product['id'] === $productId) {
            return $product;
        }
    }
    return null;
}
