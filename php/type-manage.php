<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get':
        // 获取所有类型
        $types = getWorkTypes();
        echo json_encode($types);
        break;
    
    case 'add':
        // 添加类型
        $type = $_GET['type'] ?? '';
        if (empty($type)) {
            echo json_encode(['success' => false]);
            exit;
        }
        $result = addWorkType($type);
        echo json_encode(['success' => $result]);
        break;
    
    default:
        echo json_encode(['success' => false, 'msg' => '无效操作']);
        break;
}
?>