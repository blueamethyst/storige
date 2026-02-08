<?php
/**
 * PDF 합성 웹훅 수신 엔드포인트
 *
 * Worker에서 PDF 합성 완료/실패 시 POST로 호출됨
 *
 * 웹훅 페이로드 예시 (completed):
 * {
 *   "event": "synthesis.completed",
 *   "jobId": "uuid-xxx",
 *   "status": "completed",
 *   "outputFileUrl": "/storage/outputs/xxx/merged.pdf",  // 항상 merged (하위호환)
 *   "outputFiles": [                                      // separate 모드에서만
 *     { "type": "cover", "url": "/storage/outputs/xxx/cover.pdf" },
 *     { "type": "content", "url": "/storage/outputs/xxx/content.pdf" }
 *   ],
 *   "outputFormat": "separate",
 *   "timestamp": "2026-02-05T10:30:00.000Z"
 * }
 */

require_once 'config.php';

// POST 요청만 허용
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// JSON 페이로드 파싱
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

// 로그 기록 (디버깅용)
$logFile = __DIR__ . '/logs/webhook.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

$logEntry = sprintf(
    "[%s] %s: %s\n",
    date('Y-m-d H:i:s'),
    $payload['event'] ?? 'unknown',
    $rawInput
);
file_put_contents($logFile, $logEntry, FILE_APPEND);

// 이벤트 타입별 처리
$event = $payload['event'] ?? '';
$jobId = $payload['jobId'] ?? '';
$status = $payload['status'] ?? '';

switch ($event) {
    case 'synthesis.completed':
        handleSynthesisCompleted($payload);
        break;

    case 'synthesis.failed':
        handleSynthesisFailed($payload);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Unknown event type: ' . $event]);
        exit;
}

/**
 * 합성 완료 처리
 */
function handleSynthesisCompleted(array $payload): void
{
    $jobId = $payload['jobId'];
    $outputFormat = $payload['outputFormat'] ?? 'merged';

    // 1. 하위호환: merged URL은 항상 사용 가능
    $mergedUrl = $payload['outputFileUrl'] ?? '';

    // 2. separate 모드: outputFiles 처리
    $coverUrl = null;
    $contentUrl = null;

    if (isset($payload['outputFiles']) && is_array($payload['outputFiles'])) {
        foreach ($payload['outputFiles'] as $file) {
            if ($file['type'] === 'cover') {
                $coverUrl = $file['url'];
            } elseif ($file['type'] === 'content') {
                $contentUrl = $file['url'];
            }
        }
    }

    // 3. 결과 저장 (실제로는 DB에 저장)
    $result = [
        'jobId' => $jobId,
        'status' => 'completed',
        'outputFormat' => $outputFormat,
        'mergedUrl' => $mergedUrl,
        'coverUrl' => $coverUrl,
        'contentUrl' => $contentUrl,
        'receivedAt' => date('Y-m-d H:i:s'),
    ];

    // 결과 파일로 저장 (테스트용)
    saveResult($jobId, $result);

    // 로그 출력
    logMessage("합성 완료: jobId={$jobId}, format={$outputFormat}");
    if ($coverUrl && $contentUrl) {
        logMessage("  - merged: {$mergedUrl}");
        logMessage("  - cover: {$coverUrl}");
        logMessage("  - content: {$contentUrl}");
    } else {
        logMessage("  - merged: {$mergedUrl}");
    }

    // 성공 응답
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Webhook received',
        'jobId' => $jobId,
    ]);
}

/**
 * 합성 실패 처리
 */
function handleSynthesisFailed(array $payload): void
{
    $jobId = $payload['jobId'];
    $errorMessage = $payload['errorMessage'] ?? 'Unknown error';

    // 결과 저장
    $result = [
        'jobId' => $jobId,
        'status' => 'failed',
        'errorMessage' => $errorMessage,
        'receivedAt' => date('Y-m-d H:i:s'),
    ];

    saveResult($jobId, $result);

    // 로그 출력
    logMessage("합성 실패: jobId={$jobId}, error={$errorMessage}");

    // 성공 응답 (웹훅 수신 자체는 성공)
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Webhook received (failure noted)',
        'jobId' => $jobId,
    ]);
}

/**
 * 결과를 파일로 저장 (테스트용)
 * 실제 환경에서는 DB에 저장
 */
function saveResult(string $jobId, array $result): void
{
    $resultsDir = __DIR__ . '/logs/results';
    if (!is_dir($resultsDir)) {
        mkdir($resultsDir, 0755, true);
    }

    $filename = $resultsDir . '/' . $jobId . '.json';
    file_put_contents($filename, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * 로그 메시지 출력
 */
function logMessage(string $message): void
{
    $logFile = __DIR__ . '/logs/webhook.log';
    $logEntry = sprintf("[%s] %s\n", date('Y-m-d H:i:s'), $message);
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}
