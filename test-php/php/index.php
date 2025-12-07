<?php
/**
 * PHP 에디터 연동 테스트 - 홈페이지
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
    <title>Storige 에디터 연동 테스트 - 쇼핑몰</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Storige 에디터 연동 테스트</h1>
            <p class="subtitle">PHP 쇼핑몰 시뮬레이션</p>
            <div class="user-info">
                로그인: <?= htmlspecialchars($_SESSION['user_name']) ?>
            </div>
        </header>

        <nav class="nav">
            <a href="/" class="nav-link active">홈</a>
            <a href="/products.php" class="nav-link">상품 목록</a>
        </nav>

        <main class="main">
            <section class="hero">
                <h2>에디터 임베딩 테스트</h2>
                <p>이 페이지는 PHP 기반 쇼핑몰에서 Storige 에디터를 JS 번들로 임베딩하는 테스트 환경입니다.</p>
            </section>

            <section class="products-preview">
                <h3>인기 상품</h3>
                <div class="product-grid">
                    <?php foreach ($products as $product): ?>
                    <div class="product-card">
                        <div class="product-thumbnail">
                            <div class="placeholder-image"><?= mb_substr($product['name'], 0, 2) ?></div>
                        </div>
                        <div class="product-info">
                            <h4><?= htmlspecialchars($product['name']) ?></h4>
                            <p class="product-desc"><?= htmlspecialchars($product['description']) ?></p>
                            <p class="product-price"><?= number_format($product['price']) ?>원</p>
                            <a href="/editor.php?productId=<?= urlencode($product['id']) ?>&templateSetId=<?= urlencode($product['templateSetId']) ?>"
                               class="btn btn-primary">
                                편집하기
                            </a>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="info-section">
                <h3>테스트 방법</h3>
                <ol>
                    <li>상품의 "편집하기" 버튼을 클릭합니다.</li>
                    <li>Storige 에디터가 JS 번들로 로드됩니다.</li>
                    <li>에디터에서 디자인을 편집합니다.</li>
                    <li>"편집 완료" 버튼을 클릭하면 콜백이 호출됩니다.</li>
                </ol>
            </section>

            <section class="tech-info">
                <h3>기술 스택</h3>
                <ul>
                    <li><strong>쇼핑몰:</strong> PHP 8.2 + nginx</li>
                    <li><strong>에디터:</strong> React + Fabric.js (JS 번들)</li>
                    <li><strong>API:</strong> NestJS (localhost:4000)</li>
                    <li><strong>통신:</strong> 직접 함수 호출 (window.StorigeEditor)</li>
                </ul>
            </section>
        </main>

        <footer class="footer">
            <p>Storige Editor Integration Test &copy; 2024</p>
        </footer>
    </div>
</body>
</html>
