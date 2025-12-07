<?php
/**
 * PHP 에디터 연동 테스트 - 상품 목록
 */
require_once 'config.php';

session_start();

// 테스트용 자동 로그인
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 'test-user-001';
    $_SESSION['user_name'] = '테스트 사용자';
}

$products = getTestProducts();
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>상품 목록 - Storige 테스트</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>상품 목록</h1>
            <div class="user-info">
                로그인: <?= htmlspecialchars($_SESSION['user_name']) ?>
            </div>
        </header>

        <nav class="nav">
            <a href="/" class="nav-link">홈</a>
            <a href="/products.php" class="nav-link active">상품 목록</a>
        </nav>

        <main class="main">
            <div class="product-list">
                <?php foreach ($products as $product): ?>
                <div class="product-row">
                    <div class="product-thumbnail">
                        <div class="placeholder-image"><?= mb_substr($product['name'], 0, 2) ?></div>
                    </div>
                    <div class="product-details">
                        <h3><?= htmlspecialchars($product['name']) ?></h3>
                        <p><?= htmlspecialchars($product['description']) ?></p>
                        <p class="product-id">상품 ID: <?= htmlspecialchars($product['id']) ?></p>
                        <p class="template-set-id">템플릿셋 ID: <?= htmlspecialchars($product['templateSetId']) ?></p>
                    </div>
                    <div class="product-actions">
                        <p class="product-price"><?= number_format($product['price']) ?>원</p>
                        <a href="/editor.php?productId=<?= urlencode($product['id']) ?>&templateSetId=<?= urlencode($product['templateSetId']) ?>&pages=20"
                           class="btn btn-primary">
                            디자인 편집
                        </a>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <section class="options-test">
                <h3>옵션 테스트</h3>
                <p>다양한 옵션으로 에디터를 열어볼 수 있습니다:</p>

                <div class="option-links">
                    <a href="/editor.php?productId=PROD-001&templateSetId=ts-book-a4-001&pages=40"
                       class="btn btn-secondary">
                        40페이지 책자
                    </a>
                    <a href="/editor.php?productId=PROD-001&templateSetId=ts-book-a4-001&pages=100&wingFront=50&wingBack=50"
                       class="btn btn-secondary">
                        100페이지 + 날개
                    </a>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>Storige Editor Integration Test &copy; 2024</p>
        </footer>
    </div>
</body>
</html>
