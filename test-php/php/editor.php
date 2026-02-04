<?php
/**
 * PHP 에디터 연동 테스트 - 에디터 임베딩 페이지
 *
 * PRD 9.1 준수: JS 번들로 에디터 임베딩
 */
require_once 'config.php';

session_start();

// 세션 확인
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 'test-user-001';
    $_SESSION['user_name'] = '테스트 사용자';
}

// 파라미터 확인
$templateSetId = $_GET['templateSetId'] ?? null;
$productId = $_GET['productId'] ?? null;
$sessionId = $_GET['sessionId'] ?? null;
$pages = intval($_GET['pages'] ?? 20);
$wingFront = isset($_GET['wingFront']) ? intval($_GET['wingFront']) : null;
$wingBack = isset($_GET['wingBack']) ? intval($_GET['wingBack']) : null;
// 세션 생성용 파라미터 (bookmoa 연동)
$mode = $_GET['mode'] ?? 'both';  // 기본값: 표지+내지 모두 편집
$orderSeqno = isset($_GET['orderSeqno']) ? intval($_GET['orderSeqno']) : 1;  // 기본값: 1 (테스트용)

// 필수 파라미터 확인
if (!$templateSetId || !$productId) {
    header('Location: /products.php?error=missing_params');
    exit;
}

// 상품 정보 조회
$product = getProductById($productId);
if (!$product) {
    header('Location: /products.php?error=product_not_found');
    exit;
}

// 로그인 API를 통해 JWT 토큰 획득
$token = getEditorToken();

// 토큰 획득 실패 시 에러 페이지로 이동
if (!$token) {
    header('Location: /products.php?error=auth_failed');
    exit;
}

// API Base URL (브라우저에서 접근하는 URL - localhost 사용)
// Docker 컨테이너 내부가 아닌 클라이언트 브라우저에서 실행되므로 localhost 사용
$apiBaseUrl = 'http://localhost:4000/api';
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>디자인 편집 - <?= htmlspecialchars($product['name']) ?></title>
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/editor-bundle.css">
    <style>
        /* 에디터 페이지 전용 스타일 */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }

        .editor-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: #1a1a2e;
            color: white;
            flex-shrink: 0;
        }

        .editor-header h1 {
            font-size: 16px;
            margin: 0;
        }

        .editor-header .product-name {
            color: #888;
            font-size: 14px;
        }

        .editor-actions {
            display: flex;
            gap: 8px;
        }

        .editor-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }

        .editor-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #666;
        }

        .editor-loading .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e0e0e0;
            border-top-color: #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .editor-error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #dc3545;
            max-width: 400px;
        }

        .editor-error .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .btn-editor {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }

        .btn-cancel {
            background: #6c757d;
            color: white;
        }

        .btn-cancel:hover {
            background: #5a6268;
        }

        .btn-save {
            background: #007bff;
            color: white;
        }

        .btn-save:hover {
            background: #0056b3;
        }

        .btn-complete {
            background: #28a745;
            color: white;
        }

        .btn-complete:hover {
            background: #1e7e34;
        }

        /* 콘솔 로그 표시 영역 */
        .debug-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
            background: #1a1a1a;
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            overflow-y: auto;
            padding: 8px;
            display: none;
            z-index: 1000;
        }

        .debug-panel.show {
            display: block;
        }

        .debug-toggle {
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 1001;
            background: #333;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="editor-page">
        <!-- 상단 헤더 -->
        <header class="editor-header">
            <div>
                <h1>디자인 편집</h1>
                <span class="product-name"><?= htmlspecialchars($product['name']) ?></span>
            </div>
            <div class="editor-actions">
                <button id="btn-cancel" class="btn-editor btn-cancel">취소</button>
                <button id="btn-save" class="btn-editor btn-save">임시 저장</button>
                <button id="btn-complete" class="btn-editor btn-complete">편집 완료</button>
            </div>
        </header>

        <!-- 에디터 컨테이너 -->
        <div id="editor-root" class="editor-container">
            <div class="editor-loading">
                <div class="spinner"></div>
                <p>에디터를 불러오는 중...</p>
            </div>
        </div>
    </div>

    <!-- 디버그 패널 -->
    <button class="debug-toggle" onclick="toggleDebug()">Debug</button>
    <div id="debug-panel" class="debug-panel"></div>

    <!-- 에디터 번들 로드 (캐시 버스팅) -->
    <script src="/assets/js/editor-bundle.iife.js?v=<?= time() ?>"></script>

    <script>
        // 디버그 로그 함수
        function log(message, type = 'info') {
            const panel = document.getElementById('debug-panel');
            const time = new Date().toLocaleTimeString();
            const color = type === 'error' ? '#f00' : type === 'success' ? '#0f0' : '#0ff';
            panel.innerHTML += `<div style="color: ${color}">[${time}] ${message}</div>`;
            panel.scrollTop = panel.scrollHeight;
            console.log(`[${type}]`, message);
        }

        function toggleDebug() {
            document.getElementById('debug-panel').classList.toggle('show');
        }

        // 에디터 인스턴스
        let editor = null;

        // 에디터 초기화
        function initEditor() {
            log('에디터 초기화 시작...');

            // StorigeEditor가 로드되었는지 확인
            if (typeof window.StorigeEditor === 'undefined') {
                log('StorigeEditor 번들이 로드되지 않았습니다.', 'error');
                showError('에디터 번들을 로드할 수 없습니다. 번들 파일을 확인해주세요.');
                return;
            }

            log('StorigeEditor 버전: ' + window.StorigeEditor.version, 'success');

            // 에디터 설정
            const config = {
                templateSetId: '<?= htmlspecialchars($templateSetId) ?>',
                productId: '<?= htmlspecialchars($productId) ?>',
                token: '<?= htmlspecialchars($token) ?>',
                apiBaseUrl: '<?= htmlspecialchars($apiBaseUrl) ?>',
                mode: '<?= htmlspecialchars($mode) ?>',
                orderSeqno: <?= $orderSeqno ?>,
                <?php if ($sessionId): ?>
                sessionId: '<?= htmlspecialchars($sessionId) ?>',
                <?php endif; ?>
                options: {
                    pages: <?= $pages ?>,
                    <?php if ($wingFront !== null && $wingBack !== null): ?>
                    coverWing: {
                        front: <?= $wingFront ?>,
                        back: <?= $wingBack ?>
                    }
                    <?php endif; ?>
                },
                onReady: function() {
                    log('에디터 준비 완료!', 'success');
                },
                onComplete: function(result) {
                    log('편집 완료: ' + JSON.stringify(result), 'success');
                    handleComplete(result);
                },
                onCancel: function() {
                    log('편집 취소');
                    handleCancel();
                },
                onSave: function(result) {
                    log('저장 완료: ' + JSON.stringify(result), 'success');
                },
                onError: function(error) {
                    log('에러 발생: ' + error.message, 'error');
                    showError(error.message);
                }
            };

            log('설정: ' + JSON.stringify({
                templateSetId: config.templateSetId,
                productId: config.productId,
                options: config.options
            }));

            try {
                // 에디터 인스턴스 생성 및 마운트
                editor = window.StorigeEditor.create(config);
                editor.mount('editor-root');
                log('에디터 마운트 완료');
            } catch (error) {
                log('에디터 마운트 실패: ' + error.message, 'error');
                showError('에디터를 초기화하는 중 오류가 발생했습니다: ' + error.message);
            }
        }

        // 편집 완료 처리
        function handleComplete(result) {
            // 콜백 페이지로 이동
            const params = new URLSearchParams({
                sessionId: result.sessionId,
                pages: result.pages.final,
                productId: '<?= htmlspecialchars($productId) ?>'
            });
            window.location.href = '/callback.php?' + params.toString();
        }

        // 편집 취소 처리
        function handleCancel() {
            if (confirm('편집을 취소하시겠습니까?\n저장되지 않은 내용은 사라집니다.')) {
                window.location.href = '/products.php';
            }
        }

        // 에러 표시
        function showError(message) {
            const container = document.getElementById('editor-root');
            container.innerHTML = `
                <div class="editor-error">
                    <div class="error-icon">!</div>
                    <h2>에디터 로드 실패</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-editor btn-save" style="margin-top: 16px;">
                        다시 시도
                    </button>
                    <button onclick="window.location.href='/products.php'" class="btn-editor btn-cancel" style="margin-top: 16px;">
                        돌아가기
                    </button>
                </div>
            `;
        }

        // 버튼 이벤트 연결
        document.getElementById('btn-cancel').onclick = function() {
            if (editor && editor.cancel) {
                editor.cancel();
            } else {
                handleCancel();
            }
        };

        document.getElementById('btn-save').onclick = function() {
            if (editor && editor.save) {
                log('저장 요청...');
                editor.save().then(function(result) {
                    log('저장 성공', 'success');
                    alert('저장되었습니다.');
                }).catch(function(error) {
                    log('저장 실패: ' + error.message, 'error');
                    alert('저장 실패: ' + error.message);
                });
            } else {
                log('에디터가 초기화되지 않았습니다.', 'error');
            }
        };

        document.getElementById('btn-complete').onclick = function() {
            if (editor && editor.complete) {
                log('완료 요청...');
                editor.complete().catch(function(error) {
                    log('완료 실패: ' + error.message, 'error');
                    alert('완료 처리 실패: ' + error.message);
                });
            } else {
                log('에디터가 초기화되지 않았습니다.', 'error');
            }
        };

        // 페이지 로드 시 에디터 초기화
        window.onload = function() {
            log('페이지 로드 완료');
            // 약간의 지연 후 초기화 (번들 로드 완료 대기)
            setTimeout(initEditor, 100);
        };
    </script>
</body>
</html>
