<?php
// 确认与真实路径一致（无需修改）
define('ROOT_PATH', '/volume1/web/gzrwglq/uploads');
define('TYPE_FILE', '/volume1/web/gzrwglq/types.json');

// 优化群晖目录权限配置（确保http用户可读写）
if (!is_dir(ROOT_PATH)) {
    mkdir(ROOT_PATH, 0775, true); // 群晖推荐775权限（兼容用户组）
    chmod(ROOT_PATH, 0775);
}
// 初始化类型文件（确保文件存在且可读写）
if (!file_exists(TYPE_FILE)) {
    file_put_contents(TYPE_FILE, json_encode(["应急", "业扩"], JSON_UNESCAPED_UNICODE));
    chmod(TYPE_FILE, 0664); // 读写权限（http用户可读取）
}

// 新增：获取工作类型函数（统一调用）
function getWorkTypes() {
    return json_decode(file_get_contents(TYPE_FILE), true) ?: [];
}
// 新增：添加工作类型函数
function addWorkType($type) {
    $types = getWorkTypes();
    if (!in_array($type, $types)) {
        $types[] = $type;
        file_put_contents(TYPE_FILE, json_encode($types, JSON_UNESCAPED_UNICODE));
        return true;
    }
    return false;
}
?>
