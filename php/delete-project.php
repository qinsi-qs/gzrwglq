<?php
require_once 'config.php';

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode(['success' => false, 'msg' => '仅支持POST请求']));
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);
$projectPath = $data['project_path'] ?? '';

// 校验路径
if (!file_exists($projectPath) || !is_dir($projectPath)) {
    exit(json_encode(['success' => false, 'msg' => '项目路径不存在']));
}

// 递归删除目录
function deleteDir($dir) {
    $files = array_diff(scandir($dir), ['.', '..']);
    foreach ($files as $file) {
        $path = $dir . DIRECTORY_SEPARATOR . $file;
        if (is_dir($path)) {
            deleteDir($path);
        } else {
            unlink($path);
        }
    }
    return rmdir($dir);
}

if (deleteDir($projectPath)) {
    // 尝试删除空的父目录（日期目录和类型目录）
    $parentDirs = explode(DIRECTORY_SEPARATOR, $projectPath);
    for ($i = count($parentDirs) - 2; $i >= count($parentDirs) - 5; $i--) {
        $dir = implode(DIRECTORY_SEPARATOR, array_slice($parentDirs, 0, $i + 1));
        if (is_dir($dir) && count(scandir($dir)) === 2) {
            rmdir($dir);
        } else {
            break;
        }
    }
    echo json_encode(['success' => true, 'msg' => '项目删除成功']);
} else {
    echo json_encode(['success' => false, 'msg' => '项目删除失败']);
}
?>