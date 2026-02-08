<?php
/**
 * 웹훅 수신 결과 확인 페이지
 *
 * 테스트용으로 수신된 웹훅 결과를 조회합니다.
 */

require_once 'config.php';

session_start();

// 테스트용 자동 로그인
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 'test-user-001';
    $_SESSION['user_name'] = '테스트 사용자';
}

// 결과 파일 목록 조회
$resultsDir = __DIR__ . '/logs/results';
$results = [];

if (is_dir($resultsDir)) {
    $files = glob($resultsDir . '/*.json');
    foreach ($files as $file) {
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if ($data) {
            $results[] = $data;
        }
    }
    // 최신순 정렬
    usort($results, function ($a, $b) {
        return strtotime($b['receivedAt'] ?? 0) - strtotime($a['receivedAt'] ?? 0);
    });
}

// 로그 파일 내용 (최근 50줄)
$logFile = __DIR__ . '/logs/webhook.log';
$logContent = '';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $logContent = implode('', array_slice($lines, -50));
}

// 특정 결과 삭제
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete'])) {
    $jobId = $_POST['delete'];
    $targetFile = $resultsDir . '/' . basename($jobId) . '.json';
    if (file_exists($targetFile)) {
        unlink($targetFile);
    }
    header('Location: /webhook-status.php');
    exit;
}

// 전체 삭제
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clear_all'])) {
    if (is_dir($resultsDir)) {
        array_map('unlink', glob($resultsDir . '/*.json'));
    }
    if (file_exists($logFile)) {
        file_put_contents($logFile, '');
    }
    header('Location: /webhook-status.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>웹훅 수신 현황 - Storige 테스트</title>
    <link rel="stylesheet" href="/assets/css/style.css">
    <style>
        .result-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .result-card.completed {
            border-left: 4px solid #28a745;
        }
        .result-card.failed {
            border-left: 4px solid #dc3545;
        }
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .result-header h4 {
            margin: 0;
            font-size: 14px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-badge.completed {
            background: #d4edda;
            color: #155724;
        }
        .status-badge.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .result-urls {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
        }
        .result-urls a {
            color: #007bff;
            word-break: break-all;
        }
        .url-label {
            color: #666;
            font-weight: bold;
        }
        .log-section {
            margin-top: 32px;
        }
        .log-content {
            background: #1a1a1a;
            color: #0f0;
            padding: 16px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        .actions-bar {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .empty-state {
            text-align: center;
            padding: 48px;
            color: #666;
        }
        .delete-btn {
            background: none;
            border: none;
            color: #dc3545;
            cursor: pointer;
            font-size: 12px;
        }
        .delete-btn:hover {
            text-decoration: underline;
        }
        .separate-files {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>웹훅 수신 현황</h1>
            <div class="user-info">
                로그인: <?= htmlspecialchars($_SESSION['user_name']) ?>
            </div>
        </header>

        <nav class="nav">
            <a href="/" class="nav-link">홈</a>
            <a href="/products.php" class="nav-link">상품 목록</a>
            <a href="/webhook-status.php" class="nav-link active">웹훅 현황</a>
        </nav>

        <main class="main">
            <section>
                <div class="actions-bar">
                    <h2>수신된 웹훅 (<?= count($results) ?>건)</h2>
                    <?php if (!empty($results)): ?>
                    <form method="post" onsubmit="return confirm('모든 결과를 삭제하시겠습니까?');">
                        <button type="submit" name="clear_all" class="btn btn-danger">전체 삭제</button>
                    </form>
                    <?php endif; ?>
                </div>

                <?php if (empty($results)): ?>
                <div class="empty-state">
                    <p>수신된 웹훅이 없습니다.</p>
                    <p>PDF 합성 작업을 실행하면 여기에 결과가 표시됩니다.</p>
                </div>
                <?php else: ?>
                    <?php foreach ($results as $result): ?>
                    <div class="result-card <?= htmlspecialchars($result['status']) ?>">
                        <div class="result-header">
                            <h4>Job ID: <code><?= htmlspecialchars($result['jobId']) ?></code></h4>
                            <div>
                                <span class="status-badge <?= htmlspecialchars($result['status']) ?>">
                                    <?= $result['status'] === 'completed' ? '완료' : '실패' ?>
                                </span>
                                <form method="post" style="display: inline;">
                                    <button type="submit" name="delete" value="<?= htmlspecialchars($result['jobId']) ?>" class="delete-btn">삭제</button>
                                </form>
                            </div>
                        </div>

                        <?php if ($result['status'] === 'completed'): ?>
                        <div class="result-urls">
                            <div>
                                <span class="url-label">출력 형식:</span>
                                <?= htmlspecialchars($result['outputFormat'] ?? 'merged') ?>
                            </div>
                            <div style="margin-top: 8px;">
                                <span class="url-label">Merged PDF:</span>
                                <a href="<?= htmlspecialchars($result['mergedUrl']) ?>" target="_blank">
                                    <?= htmlspecialchars($result['mergedUrl']) ?>
                                </a>
                            </div>

                            <?php if (!empty($result['coverUrl']) && !empty($result['contentUrl'])): ?>
                            <div class="separate-files">
                                <div>
                                    <span class="url-label">Cover PDF:</span>
                                    <a href="<?= htmlspecialchars($result['coverUrl']) ?>" target="_blank">
                                        <?= htmlspecialchars($result['coverUrl']) ?>
                                    </a>
                                </div>
                                <div>
                                    <span class="url-label">Content PDF:</span>
                                    <a href="<?= htmlspecialchars($result['contentUrl']) ?>" target="_blank">
                                        <?= htmlspecialchars($result['contentUrl']) ?>
                                    </a>
                                </div>
                            </div>
                            <?php endif; ?>
                        </div>
                        <?php else: ?>
                        <div class="result-urls" style="background: #fff5f5;">
                            <span class="url-label">에러:</span>
                            <?= htmlspecialchars($result['errorMessage'] ?? 'Unknown error') ?>
                        </div>
                        <?php endif; ?>

                        <div style="margin-top: 8px; color: #666; font-size: 12px;">
                            수신: <?= htmlspecialchars($result['receivedAt'] ?? '-') ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </section>

            <section class="log-section">
                <h2>웹훅 로그 (최근 50줄)</h2>
                <div class="log-content"><?= htmlspecialchars($logContent ?: '로그가 없습니다.') ?></div>
            </section>

            <section style="margin-top: 32px;">
                <h2>웹훅 엔드포인트 정보</h2>
                <div class="info-table" style="background: #f8f9fa; padding: 16px; border-radius: 4px;">
                    <p><strong>URL:</strong> <code>http://localhost:8080/webhook.php</code></p>
                    <p><strong>Method:</strong> POST</p>
                    <p><strong>Content-Type:</strong> application/json</p>
                    <p style="margin-top: 16px;"><strong>테스트 curl:</strong></p>
                    <pre style="background: #1a1a1a; color: #0f0; padding: 12px; border-radius: 4px; overflow-x: auto;">curl -X POST http://localhost:8080/webhook.php \
  -H "Content-Type: application/json" \
  -d '{
    "event": "synthesis.completed",
    "jobId": "test-job-001",
    "status": "completed",
    "outputFileUrl": "/storage/outputs/test/merged.pdf",
    "outputFiles": [
      {"type": "cover", "url": "/storage/outputs/test/cover.pdf"},
      {"type": "content", "url": "/storage/outputs/test/content.pdf"}
    ],
    "outputFormat": "separate",
    "timestamp": "2026-02-05T10:00:00Z"
  }'</pre>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>Storige Editor Integration Test &copy; 2024</p>
        </footer>
    </div>

    <script>
        // 10초마다 자동 새로고침
        setTimeout(function() {
            location.reload();
        }, 10000);
    </script>
</body>
</html>
