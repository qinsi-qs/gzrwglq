<?php
require_once 'config.php';
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode(['success' => false, 'msg' => '仅支持POST请求']));
}
// 获取表单数据（目录名用原始值）
$projectPath = $_POST['project_path'] ?? '';
$username = trim($_POST['username'] ?? '');
$userPhone = trim($_POST['user_phone'] ?? '');
$workType = trim($_POST['work_type'] ?? '');
$workLocation = trim($_POST['work_location'] ?? '');
$completeTime = trim($_POST['complete_time'] ?? '');
$workContent = trim($_POST['work_content'] ?? '');
$deleteBefore = json_decode($_POST['delete_before'] ?? '[]', true);
$deleteAfter = json_decode($_POST['delete_after'] ?? '[]', true);

// 校验路径
if (!file_exists($projectPath) || !is_dir($projectPath)) {
    exit(json_encode(['success' => false, 'msg' => '项目路径不存在']));
}

// 解析日期
try {
    $oldDateParts = explode(DIRECTORY_SEPARATOR, $projectPath);
    $oldDateStr = $oldDateParts[count($oldDateParts) - 3];
    $oldDate = new DateTime($oldDateStr);
    $newDate = new DateTime($completeTime);
    $oldYear = $oldDate->format('Y');
    $oldMonth = $oldDate->format('m');
    $oldDay = $oldDate->format('d');
    $newYear = $newDate->format('Y');
    $newMonth = $newDate->format('m');
    $newDay = $newDate->format('d');
} catch (Exception $e) {
    exit(json_encode(['success' => false, 'msg' => '日期格式错误']));
}

// 构建新路径（目录名用原始值）
$newPath = rtrim(ROOT_PATH, '/\\') . DIRECTORY_SEPARATOR 
          . $workType . DIRECTORY_SEPARATOR 
          . $newYear . DIRECTORY_SEPARATOR 
          . $newMonth . DIRECTORY_SEPARATOR 
          . $newDay . DIRECTORY_SEPARATOR 
          . $username;

// 路径改变时移动文件
if ($newPath !== $projectPath) {
    if (!is_dir($newPath)) {
        mkdir($newPath, 0755, true);
        chmod($newPath, 0755);
    }
    
    // 移动施工前图片目录
    $oldBeforeDir = $projectPath . DIRECTORY_SEPARATOR . '施工前';
    $newBeforeDir = $newPath . DIRECTORY_SEPARATOR . '施工前';
    if (is_dir($oldBeforeDir)) {
        rename($oldBeforeDir, $newBeforeDir);
    }
    
    // 移动施工后图片目录
    $oldAfterDir = $projectPath . DIRECTORY_SEPARATOR . '施工后';
    $newAfterDir = $newPath . DIRECTORY_SEPARATOR . '施工后';
    if (is_dir($oldAfterDir)) {
        rename($oldAfterDir, $newAfterDir);
    }
    
    // 删除原目录
    rmdir($projectPath);
    $projectPath = $newPath;
}

// 删除指定图片（支持编码后的文件名）
$beforeDir = $projectPath . DIRECTORY_SEPARATOR . '施工前';
$afterDir = $projectPath . DIRECTORY_SEPARATOR . '施工后';
foreach ($deleteBefore as $filename) {
    $file = $beforeDir . DIRECTORY_SEPARATOR . $filename;
    $decodedFile = $beforeDir . DIRECTORY_SEPARATOR . urldecode($filename);
    if (file_exists($file)) {
        unlink($file);
    } elseif (file_exists($decodedFile)) {
        unlink($decodedFile);
    }
}
foreach ($deleteAfter as $filename) {
    $file = $afterDir . DIRECTORY_SEPARATOR . $filename;
    $decodedFile = $afterDir . DIRECTORY_SEPARATOR . urldecode($filename);
    if (file_exists($file)) {
        unlink($file);
    } elseif (file_exists($decodedFile)) {
        unlink($decodedFile);
    }
}

// 上传新图片（仅解码文件名）
function uploadNewImages($files, $targetDir) {
    if (empty($files['name'][0])) return true;
    
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
        chmod($targetDir, 0755);
    }
    
    $fileCount = count($files['name']);
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    for ($i = 0; $i < $fileCount; $i++) {
        $fileName = $files['name'][$i];
        $decodedFileName = urldecode($fileName); // 仅解码文件名
        $fileTmp = $files['tmp_name'][$i];
        $fileError = $files['error'][$i];
        $fileSize = $files['size'][$i];
        
        if (empty($decodedFileName) || $fileSize <= 0) continue;
        
        if ($fileError !== UPLOAD_ERR_OK) {
            return false;
        }
        
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $fileMime = finfo_file($fileInfo, $fileTmp);
        finfo_close($fileInfo);
        
        if (!in_array($fileMime, $allowedTypes)) {
            return false;
        }
        
        $ext = pathinfo($decodedFileName, PATHINFO_EXTENSION);
        $name = pathinfo($decodedFileName, PATHINFO_FILENAME);
        $targetFileName = $decodedFileName;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $targetFileName;
        
        // 处理同名文件
        $counter = 1;
        while (file_exists($targetPath)) {
            $targetFileName = $name . '_' . date('YmdHis') . '_' . $counter . '.' . $ext;
            $targetPath = $targetDir . DIRECTORY_SEPARATOR . $targetFileName;
            $counter++;
        }
        
        if (!move_uploaded_file($fileTmp, $targetPath)) {
            return false;
        }
        chmod($targetPath, 0644);
    }
    return true;
}

// 上传新的施工前图片
if (!empty($_FILES['new_before'])) {
    if (!uploadNewImages($_FILES['new_before'], $beforeDir)) {
        exit(json_encode(['success' => false, 'msg' => '施工前图片上传失败']));
    }
}

// 上传新的施工后图片
if (!empty($_FILES['new_after'])) {
    if (!uploadNewImages($_FILES['new_after'], $afterDir)) {
        exit(json_encode(['success' => false, 'msg' => '施工后图片上传失败']));
    }
}

// 保存项目信息
$infoContent = "用户名字：{$username}\n";
$infoContent .= "用户电话：{$userPhone}\n";
$infoContent .= "工作类型：{$workType}\n";
$infoContent .= "工作地点：{$workLocation}\n";
$infoContent .= "完成时间：{$completeTime}\n";
$infoContent .= "工作任务内容：{$workContent}\n";
$infoContent .= "保存时间：" . date('Y-m-d H:i:s');
$infoFile = $projectPath . DIRECTORY_SEPARATOR . 'project_info.txt';
if (!file_put_contents($infoFile, $infoContent)) {
    exit(json_encode(['success' => false, 'msg' => '无法保存项目信息']));
}
chmod($infoFile, 0644);

echo json_encode(['success' => true, 'msg' => '项目修改成功']);
?>