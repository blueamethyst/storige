<?php
/**
 * PHP 에디터 연동 테스트 - 편집 완료 콜백 페이지
 *
 * 에디터에서 "편집 완료" 시 리다이렉트되는 페이지
 */
require_once 'config.php';

session_start();

// 세션 확인
if (!isset($_SESSION['user_id'])) {
    header('Location: /products.php?error=session_expired');
    exit;
}

// 파라미터 확인
$sessionId = $_GET['sessionId'] ?? null;
$pages = $_GET['pages'] ?? null;
$productId = $_GET['productId'] ?? null;

if (!$sessionId || !$productId) {
    header('Location: /products.php?error=invalid_callback');
    exit;
}

// 상품 정보 조회
$product = getProductById($productId);
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>편집 완료 - Storige 테스트</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>편집 완료</h1>
            <div class="user-info">
                로그인: <?= htmlspecialchars($_SESSION['user_name']) ?>
            </div>
        </header>

        <nav class="nav">
            <a href="/" class="nav-link">홈</a>
            <a href="/products.php" class="nav-link">상품 목록</a>
        </nav>

        <main class="main">
            <section class="completion-info">
                <div class="success-icon">✓</div>
                <h2>디자인 편집이 완료되었습니다!</h2>

                <div class="session-details">
                    <h3>편집 세션 정보</h3>
                    <table class="info-table">
                        <tr>
                            <th>세션 ID</th>
                            <td><code><?= htmlspecialchars($sessionId) ?></code></td>
                        </tr>
                        <tr>
                            <th>상품</th>
                            <td><?= htmlspecialchars($product ? $product['name'] : '알 수 없음') ?></td>
                        </tr>
                        <tr>
                            <th>상품 ID</th>
                            <td><code><?= htmlspecialchars($productId) ?></code></td>
                        </tr>
                        <?php if ($pages): ?>
                        <tr>
                            <th>최종 페이지 수</th>
                            <td><?= htmlspecialchars($pages) ?>페이지</td>
                        </tr>
                        <?php endif; ?>
                    </table>
                </div>

                <div class="next-steps">
                    <h3>다음 단계</h3>
                    <p>실제 쇼핑몰에서는 이 정보를 바탕으로:</p>
                    <ol>
                        <li>주문서 생성 또는 장바구니에 추가</li>
                        <li>결제 프로세스 진행</li>
                        <li>PDF 변환 작업 시작</li>
                    </ol>
                </div>

                <div class="actions">
                    <a href="/editor.php?productId=<?= urlencode($productId) ?>&templateSetId=<?= urlencode($product['templateSetId'] ?? '') ?>&sessionId=<?= urlencode($sessionId) ?>"
                       class="btn btn-secondary">
                        다시 편집하기
                    </a>
                    <a href="/products.php" class="btn btn-primary">
                        상품 목록으로
                    </a>
                </div>
            </section>

            <section class="debug-info">
                <h3>디버그 정보</h3>
                <pre><?php
                    echo "GET Parameters:\n";
                    print_r($_GET);
                    echo "\nSession Data:\n";
                    print_r($_SESSION);
                ?></pre>
            </section>
        </main>

        <footer class="footer">
            <p>Storige Editor Integration Test &copy; 2024</p>
        </footer>
    </div>
</body>
</html>
