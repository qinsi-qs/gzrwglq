<?php
error_reporting(0); // 关闭错误输出，避免干扰JSON结构
require_once 'config.php';
/**
 * 递归扫描所有项目目录（群晖兼容）
 * @param string $rootPath 项目根目录（uploads）
 * @return array 项目列表
 */
function scanProjects($rootPath) {
    $projects = [];
    if (!is_dir($rootPath) || !is_readable($rootPath)) {
        return $projects;
    }
    
    $dirIterator = new RecursiveDirectoryIterator($rootPath, RecursiveDirectoryIterator::SKIP_DOTS);
    $iterator = new RecursiveIteratorIterator($dirIterator);
    
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getFilename() === 'project_info.txt') {
            $userDir = $file->getPath();
            $project = parseProjectInfo($file->getPathname(), $userDir);
            if ($project) {
                $projects[] = $project;
            }
        }
    }
    
    // 按完成时间倒序排序
    usort($projects, function($a, $b) {
        $timeA = strtotime($a['completeTime']);
        $timeB = strtotime($b['completeTime']);
        return $timeB - $timeA;
    });
    
    return $projects;
}
/**
 * 解析项目信息文件
 * @param string $infoFile project_info.txt路径
 * @param string $projectPath 项目目录路径
 * @return array|null 项目信息
 */
function parseProjectInfo($infoFile, $projectPath) {
    $content = file_get_contents($infoFile);
    if (!$content) {
        return null;
    }
    
    $project = [
        'path' => $projectPath,
        'username' => '',
        'userPhone' => '',
        'workType' => '',
        'workLocation' => '',
        'completeTime' => '',
        'workContent' => '',
        'saveTime' => '',
        'beforeImages' => [],
        'afterImages' => []
    ];
    
    // 提取项目信息
    preg_match('/用户名字：\s*(.*?)\s*(?=\n|$)/', $content, $nameMatch);
    preg_match('/用户电话：\s*(.*?)\s*(?=\n|$)/', $content, $phoneMatch);
    preg_match('/工作类型：\s*(.*?)\s*(?=\n|$)/', $content, $typeMatch);
    preg_match('/工作地点：\s*(.*?)\s*(?=\n|$)/', $content, $locMatch);
    preg_match('/完成时间：\s*(.*?)\s*(?=\n|$)/', $content, $timeMatch);
    preg_match('/工作任务内容：\s*(.*?)\s*(?=\n|$)/s', $content, $contentMatch);
    preg_match('/保存时间：\s*(.*?)\s*(?=\n|$)/', $content, $saveTimeMatch);
    
    $project['username'] = $nameMatch[1] ?? '';
    $project['userPhone'] = $phoneMatch[1] ?? '';
    $project['workType'] = $typeMatch[1] ?? '';
    $project['workLocation'] = $locMatch[1] ?? '';
    $project['completeTime'] = $timeMatch[1] ?? '';
    $project['workContent'] = $contentMatch[1] ?? '';
    $project['saveTime'] = $saveTimeMatch[1] ?? date('Y-m-d H:i:s', filemtime($infoFile));
    
    // 核心字段校验
    if (empty($project['username']) || empty($project['workType']) || empty($project['completeTime'])) {
        return null;
    }
    
    // 读取图片列表
    $beforeDir = $projectPath . DIRECTORY_SEPARATOR . '施工前';
    $afterDir = $projectPath . DIRECTORY_SEPARATOR . '施工后';
    $project['beforeImages'] = getImageList($beforeDir);
    $project['afterImages'] = getImageList($afterDir);
    
    return $project;
}
/**
 * 获取目录下的图片列表（仅编码文件名，目录名原样保留）
 * @param string $dir 图片目录（施工前/施工后）
 * @return array 图片信息
 */
function getImageList($dir) {
    $images = [];
    if (!is_dir($dir) || !is_readable($dir)) {
        return $images;
    }
    
    $files = glob($dir . DIRECTORY_SEPARATOR . '*.*');
    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, $allowedExts) && is_readable($file)) {
            $filename = basename($file);
            $encodedFilename = urlencode($filename); // 仅编码文件名
            
            // 目录路径原样保留，仅替换分隔符
            $webPath = str_replace('/volume1/web/gzrwglq', '', $dir) . '/' . $encodedFilename;
            $webPath = str_replace(DIRECTORY_SEPARATOR, '/', $webPath);
            
            // 兼容旧文件中未编码的#
            $webPath = str_replace('#', '%23', $webPath);
            
            $images[] = [
                'filename' => $filename,
                'encodedFilename' => $encodedFilename,
                'url' => $webPath, // 目录名原样，文件名编码
                'thumbUrl' => $webPath
            ];
        }
    }
    
    return $images;
}
// 执行扫描并输出JSON
$projects = scanProjects(ROOT_PATH);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($projects ?: [], JSON_UNESCAPED_UNICODE);
exit;
?>