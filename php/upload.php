<?php
require_once 'config.php';
// 群晖环境：设置文件所有者为 http 用户组
umask(0002); 
// 解决跨域和请求头问题
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode(['success' => false, 'msg' => '仅支持POST请求']));
}
// 获取表单数据（目录名用原始值，不编码）
$username = trim($_POST['username'] ?? '');
$userPhone = trim($_POST['user_phone'] ?? '');
$workType = trim($_POST['work_type'] ?? '');
$workLocation = trim($_POST['work_location'] ?? '');
$completeTime = trim($_POST['complete_time'] ?? '');
$workContent = trim($_POST['work_content'] ?? '');

// 校验必填项
if (empty($username) || empty($workType) || empty($completeTime)) {
    exit(json_encode(['success' => false, 'msg' => '用户名、工作类型、完成时间不能为空']));
}
// 解析日期
try {
    $date = new DateTime($completeTime);
    $year = $date->format('Y');
    $month = $date->format('m');
    $day = $date->format('d');
} catch (Exception $e) {
    exit(json_encode(['success' => false, 'msg' => '日期格式错误，需为YYYY-MM-DD']));
}
// 构建存储路径：目录名用原始值（不编码），避免路径冲突
$savePath = rtrim(ROOT_PATH, '/\\') . DIRECTORY_SEPARATOR 
           . $workType . DIRECTORY_SEPARATOR 
           . $year . DIRECTORY_SEPARATOR 
           . $month . DIRECTORY_SEPARATOR 
           . $day . DIRECTORY_SEPARATOR 
           . $username;

// 创建目录
if (!is_dir($savePath)) {
    if (!mkdir($savePath, 0755, true)) {
        exit(json_encode(['success' => false, 'msg' => '无法创建存储目录，请检查uploads文件夹权限']));
    }
    chmod($savePath, 0755);
}

// 保存项目信息
$infoContent = "用户名字：{$username}\n";
$infoContent .= "用户电话：{$userPhone}\n";
$infoContent .= "工作类型：{$workType}\n";
$infoContent .= "工作地点：{$workLocation}\n";
$infoContent .= "完成时间：{$completeTime}\n";
$infoContent .= "工作任务内容：{$workContent}\n";
$infoContent .= "保存时间：" . date('Y-m-d H:i:s');
$infoFile = $savePath . DIRECTORY_SEPARATOR . 'project_info.txt';
if (!file_put_contents($infoFile, $infoContent)) {
    exit(json_encode(['success' => false, 'msg' => '无法保存项目信息文件']));
}
chmod($infoFile, 0644);

// 通用上传函数（仅解码文件名）
function uploadFiles($files, $targetDir) {
    if (empty($files['name'][0])) return true;
    
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
        chmod($targetDir, 0755);
    }
    $fileCount = count($files['name']);
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = $files['name'][$i];
        // 仅解码文件名（目录名已用原始值，无需处理）
        $decodedFileName = urldecode($fileName);
        $fileTmp = $files['tmp_name'][$i];
        $fileError = $files['error'][$i];
        $fileSize = $files['size'][$i];
        
        if (empty($decodedFileName) || $fileSize <= 0) continue;
        if ($fileError !== UPLOAD_ERR_OK) {
            $errorMsg = match ($fileError) {
                UPLOAD_ERR_INI_SIZE => '文件超过php.ini限制大小',
                UPLOAD_ERR_FORM_SIZE => '文件超过表单限制大小',
                UPLOAD_ERR_PARTIAL => '文件上传不完整，请重试',
                UPLOAD_ERR_NO_FILE => '未检测到上传文件',
                UPLOAD_ERR_NO_TMP_DIR => '服务器缺少临时文件夹',
                UPLOAD_ERR_CANT_WRITE => '文件无法写入磁盘，请检查权限',
                default => '上传失败，错误码：'.$fileError
            };
            exit(json_encode(['success' => false, 'msg' => $decodedFileName . ' - ' . $errorMsg]));
        }
        // 校验文件类型
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $fileMime = finfo_file($fileInfo, $fileTmp);
        finfo_close($fileInfo);
        if (!in_array($fileMime, $allowedTypes)) {
            exit(json_encode(['success' => false, 'msg' => $decodedFileName . ' - 不支持的文件类型，仅允许jpg/png/gif/webp']));
        }
        // 处理同名文件
        $ext = pathinfo($decodedFileName, PATHINFO_EXTENSION);
        $name = pathinfo($decodedFileName, PATHINFO_FILENAME);
        $targetFileName = $decodedFileName;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $targetFileName;
        
        $counter = 1;
        while (file_exists($targetPath)) {
            $targetFileName = $name . '_' . date('YmdHis') . '_' . $counter . '.' . $ext;
            $targetPath = $targetDir . DIRECTORY_SEPARATOR . $targetFileName;
            $counter++;
        }
        // 移动文件
        if (!move_uploaded_file($fileTmp, $targetPath)) {
            exit(json_encode(['success' => false, 'msg' => $decodedFileName . ' - 保存失败，请检查目录权限']));
        }
        chmod($targetPath, 0644);
    }
    return true;
}
// 上传施工前图片
if (!empty($_FILES['before_files'])) {
    $beforePath = $savePath . DIRECTORY_SEPARATOR . '施工前';
    uploadFiles($_FILES['before_files'], $beforePath);
}
// 上传施工后图片
if (!empty($_FILES['after_files'])) {
    $afterPath = $savePath . DIRECTORY_SEPARATOR . '施工后';
    uploadFiles($_FILES['after_files'], $afterPath);
}
// 返回成功信息
echo json_encode(['success' => true, 'msg' => '项目信息和图片保存成功']);
?>