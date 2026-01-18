// 全局变量
let allProjects = []; // 所有项目数据
let currentProject = null; // 当前操作的项目
let editBeforeFiles = []; // 编辑页施工前新文件
let editAfterFiles = []; // 编辑页施工后新文件
let deleteBeforeImages = []; // 编辑页要删除的施工前图片
let deleteAfterImages = []; // 编辑页要删除的施工后图片
// 图片预览窗口状态（复用逻辑）
let viewModalSize = { width: 800, height: 600 };
let viewIsDraggingWindow = false;
let viewIsDraggingImage = false;
let viewWindowDragStart = { x: 0, y: 0 };
let viewImageDragStart = { x: 0, y: 0 };
let viewImageOffset = { x: 0, y: 0 };
let viewCurrentScale = 1;
let viewLastTouchDistance = 0;
let viewIsTouchDragging = false;
document.addEventListener('DOMContentLoaded', function() {
    // 加载工作类型（用于筛选和编辑）
    loadWorkTypesForFilter();
    // 加载所有项目
    loadAllProjects();
    // 绑定搜索和筛选事件
    bindSearchFilterEvents();
    // 绑定编辑模态框事件
    bindEditModalEvents();
    // 初始化图片预览窗口
    initImagePreviewWindow();
    // 绑定编辑页上传事件
    bindEditUploadEvents();
});
// 加载工作类型到筛选和编辑下拉框
function loadWorkTypesForFilter() {
    fetch('php/type-manage.php?action=get')
        .then(res => res.json())
        .then(data => {
            const typeFilter = document.getElementById('type-filter');
            const editWorkType = document.getElementById('edit-work-type');
            data.forEach(type => {
                const option1 = document.createElement('option');
                option1.value = type;
                option1.textContent = type;
                typeFilter.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = type;
                option2.textContent = type;
                editWorkType.appendChild(option2);
            });
        })
        .catch(err => {
            alert('加载工作类型失败：' + err.message);
        });
}
// 加载所有项目
function loadAllProjects() {
    fetch('php/get-projects.php')
        .then(res => res.json())
        .then(data => {
            allProjects = data;
            renderProjectList(allProjects);
        })
        .catch(err => {
            alert('加载项目失败：' + err.message);
            document.getElementById('project-list').innerHTML = `
                <div style="text-align: center; padding: 50px; color: #e53e3e;">
                    加载失败，请刷新页面重试
                </div>
            `;
        });
}
// 渲染项目列表（新增单图下载按钮 + 显示保存时间）
function renderProjectList(projects) {
    const projectList = document.getElementById('project-list');
    if (projects.length === 0) {
        projectList.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #718096;">
                未找到匹配的项目
            </div>
        `;
        return;
    }
    
    let html = '';
    projects.forEach(project => {
        // 提取保存时间（优先文件中的保存时间，无则用文件修改时间）
        const saveTime = project.saveTime || new Date(project.path ? new Date().getTime() : new Date()).toLocaleString();
        
        html += `
            <div class="project-card" data-path="${project.path}">
                <div class="project-header">
                    <div class="project-title">${project.workType} - ${project.workLocation}</div>
                    <div class="project-actions">
                        <button class="action-btn" style="background: #fef7fb; color: #ed8936;" onclick="handleEditProject('${project.path}')">
                            <span class="icon icon-edit"></span> 编辑
                        </button>
                        <button class="action-btn" style="background: #f0f8fb; color: #48bb78;" onclick="copyProjectContent('${project.path}')">
                            <span class="icon icon-copy"></span> 复制内容
                        </button>
                        <button class="action-btn" style="background: #eaf6fa; color: #38b2ac;" onclick="downloadAllImages('${project.path}')">
                            <span class="icon icon-download"></span> 下载所有图片
                        </button>
                        <button class="action-btn" style="background: #fef2f2; color: #e22828;" onclick="deleteProject('${project.path}')">
                            <span class="icon icon-delete"></span> 删除
                        </button>
                    </div>
                </div>
                <div class="project-info">
                    <div class="info-item">
                        <span class="info-label">用户名：</span>
                        <span class="info-content">${project.username}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">联系电话：</span>
                        <span class="info-content">${project.userPhone || '无'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">工作类型：</span>
                        <span class="info-content">${project.workType}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">完成时间：</span>
                        <span class="info-content">${project.completeTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">保存时间：</span>
                        <span class="info-content">${saveTime}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">工作内容：</span>
                        <span class="info-content">${project.workContent}</span>
                    </div>
                </div>
                <div class="image-section">
                    <h4>施工前图片（${project.beforeImages.length}张）</h4>
                    <div class="image-grid">
                        ${project.beforeImages.map(img => `
                            <div class="image-item" style="position: relative;">
                                <img src="${img.thumbUrl}" alt="施工前图片" onclick="openImagePreview('${img.url}')">
                                <!-- 单张下载按钮 -->
                                <button style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.8rem;"
                                        onclick="downloadSingleImage('${img.url}', '施工前_${img.filename}', event)">
                                    下载
                                </button>
                            </div>
                        `).join('')}
                        ${project.beforeImages.length === 0 ? '<div style="color: #718096; grid-column: 1/-1; text-align: center;">无图片</div>' : ''}
                    </div>
                </div>
                <div class="image-section">
                    <h4>施工后图片（${project.afterImages.length}张）</h4>
                    <div class="image-grid">
                        ${project.afterImages.map(img => `
                            <div class="image-item" style="position: relative;">
                                <img src="${img.thumbUrl}" alt="施工后图片" onclick="openImagePreview('${img.url}')">
                                <!-- 单张下载按钮 -->
                                <button style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.8rem;"
                                        onclick="downloadSingleImage('${img.url}', '施工后_${img.filename}', event)">
                                    下载
                                </button>
                            </div>
                        `).join('')}
                        ${project.afterImages.length === 0 ? '<div style="color: #718096; grid-column: 1/-1; text-align: center;">无图片</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    projectList.innerHTML = html;
}
// 绑定搜索和筛选事件（支持去年/前年/自定义日期）
function bindSearchFilterEvents() {
    // 搜索按钮
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    // 回车搜索
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('type-filter').value = '';
        document.getElementById('date-filter').value = '';
        // 隐藏自定义日期框
        document.getElementById('custom-date-range').style.display = 'none';
        loadAllProjects();
    });
    // 筛选改变
    document.getElementById('type-filter').addEventListener('change', handleFilter);
    document.getElementById('date-filter').addEventListener('change', function() {
        const value = this.value;
        const customDateRange = document.getElementById('custom-date-range');
        if (value === 'custom') {
            customDateRange.style.display = 'flex';
            // 默认结束日期为今天
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('end-date').value = today;
        } else {
            customDateRange.style.display = 'none';
            handleFilter();
        }
    });
    // 自定义日期应用按钮
    document.getElementById('apply-date-filter').addEventListener('click', handleFilter);
}
// 搜索处理
function handleSearch() {
    const keyword = document.getElementById('search-input').value.trim().toLowerCase();
    if (!keyword) {
        handleFilter();
        return;
    }
    
    const filtered = allProjects.filter(project => {
        return project.username.toLowerCase().includes(keyword) ||
               project.workLocation.toLowerCase().includes(keyword) ||
               project.workType.toLowerCase().includes(keyword) ||
               project.workContent.toLowerCase().includes(keyword);
    });
    renderProjectList(filtered);
}
// 筛选处理（新增去年、前年、自定义日期逻辑）
function handleFilter() {
    const type = document.getElementById('type-filter').value;
    const dateRange = document.getElementById('date-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    let filtered = [...allProjects];
    
    // 类型筛选
    if (type) {
        filtered = filtered.filter(project => project.workType === type);
    }
    
    // 日期筛选
    if (dateRange) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(project => {
            const projectDate = new Date(project.completeTime);
            switch (dateRange) {
                case 'today':
                    return projectDate.toDateString() === today.toDateString();
                case 'week':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    return projectDate >= weekStart && projectDate <= now;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return projectDate >= monthStart && projectDate <= now;
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    return projectDate >= yearStart && projectDate <= now;
                case 'lastYear':
                    const lastYear = now.getFullYear() - 1;
                    const lastYearStart = new Date(lastYear, 0, 1);
                    const lastYearEnd = new Date(lastYear, 11, 31);
                    return projectDate >= lastYearStart && projectDate <= lastYearEnd;
                case 'lastTwoYears':
                    const twoYearsAgo = now.getFullYear() - 2;
                    const twoYearsAgoStart = new Date(twoYearsAgo, 0, 1);
                    const twoYearsAgoEnd = new Date(twoYearsAgo, 11, 31);
                    return projectDate >= twoYearsAgoStart && projectDate <= twoYearsAgoEnd;
                case 'custom':
                    if (!startDate || !endDate) {
                        alert('请选择完整的日期范围');
                        return true;
                    }
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    return projectDate >= start && projectDate <= end;
                default:
                    return true;
            }
        });
    }
    
    renderProjectList(filtered);
}
// 绑定编辑模态框事件
function bindEditModalEvents() {
    // 关闭模态框
    document.getElementById('modal-close-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    // 保存修改
    document.getElementById('save-edit-btn').addEventListener('click', saveProjectEdit);
}
// 打开编辑模态框
function handleEditProject(projectPath) {
    currentProject = allProjects.find(p => p.path === projectPath);
    if (!currentProject) return;
    
    // 填充表单数据
    document.getElementById('project-path').value = projectPath;
    document.getElementById('edit-username').value = currentProject.username;
    document.getElementById('edit-user-phone').value = currentProject.userPhone || '';
    document.getElementById('edit-work-type').value = currentProject.workType;
    document.getElementById('edit-work-location').value = currentProject.workLocation;
    document.getElementById('edit-complete-time').value = currentProject.completeTime;
    document.getElementById('edit-work-content').value = currentProject.workContent;
    
    // 加载现有图片
    renderEditImages('before', currentProject.beforeImages);
    renderEditImages('after', currentProject.afterImages);
    
    // 重置文件列表
    editBeforeFiles = [];
    editAfterFiles = [];
    deleteBeforeImages = [];
    deleteAfterImages = [];
    
    // 显示模态框
    document.getElementById('edit-modal').style.display = 'flex';
}
// 渲染编辑页图片
function renderEditImages(type, images) {
    const container = document.getElementById(`edit-${type}-images`);
    let html = '';
    images.forEach(img => {
        html += `
            <div class="image-item" data-filename="${img.encodedFilename || img.filename}" style="position: relative;">
                <img src="${img.thumbUrl}" alt="${type === 'before' ? '施工前' : '施工后'}图片">
                <div style="position: relative; top: -100%; right: 5px; text-align: right;">
                    <span style="background: #e53e3e; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-block; cursor: pointer; line-height: 20px;"
                          onclick="deleteEditImage('${type}', '${img.encodedFilename || img.filename}', event)">×</span>
                </div>
                <!-- 编辑页单张下载按钮 -->
                <button style="position: absolute; bottom: 5px; right: 30px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.8rem;"
                        onclick="downloadSingleImage('${img.url}', '${type === 'before' ? '施工前_' : '施工后_'}${img.filename}', event)">
                    下载
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}
// 编辑页删除图片
function deleteEditImage(type, filename, e) {
    e.stopPropagation();
    const deleteArray = type === 'before' ? deleteBeforeImages : deleteAfterImages;
    if (!deleteArray.includes(filename)) {
        deleteArray.push(filename);
    }
    e.target.closest('.image-item').remove();
}
// 绑定编辑页上传事件
function bindEditUploadEvents() {
    // 施工前上传
    const beforeArea = document.getElementById('edit-before-upload-area');
    const beforeInput = document.getElementById('edit-before-files');
    beforeArea.addEventListener('click', () => beforeInput.click());
    beforeInput.addEventListener('change', (e) => {
        handleEditUploadFiles(Array.from(e.target.files), 'before');
    });
    
    // 施工后上传
    const afterArea = document.getElementById('edit-after-upload-area');
    const afterInput = document.getElementById('edit-after-files');
    afterArea.addEventListener('click', () => afterInput.click());
    afterInput.addEventListener('change', (e) => {
        handleEditUploadFiles(Array.from(e.target.files), 'after');
    });
    
    // 拖拽上传
    [beforeArea, afterArea].forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('active');
        });
        area.addEventListener('dragleave', () => area.classList.remove('active'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('active');
            const type = area.id.includes('before') ? 'before' : 'after';
            handleEditUploadFiles(Array.from(e.dataTransfer.files), type);
        });
    });
}
// 处理编辑页上传文件（仅编码文件名）
function handleEditUploadFiles(files, type) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        alert('请选择图片文件！');
        return;
    }
    
    const container = document.getElementById(`edit-${type}-images`);
    const fileArray = type === 'before' ? editBeforeFiles : editAfterFiles;
    
    imageFiles.forEach(file => {
        const encodedFileName = encodeURIComponent(file.name); // 仅编码文件名
        if (!fileArray.some(f => encodeURIComponent(f.name) === encodedFileName)) {
            const encodedFile = { ...file, encodedName: encodedFileName };
            fileArray.push(encodedFile);
            // 预览图片
            const reader = new FileReader();
            reader.onload = (e) => {
                const html = `
                    <div class="image-item" data-filename="${encodedFileName}" style="position: relative;">
                        <img src="${e.target.result}" alt="新上传图片">
                        <div style="position: relative; top: -100%; right: 5px; text-align: right;">
                            <span style="background: #e53e3e; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-block; cursor: pointer; line-height: 20px;"
                                  onclick="removeNewUploadFile('${type}', '${encodedFileName}', event)">×</span>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            };
            reader.readAsDataURL(file);
        }
    });
}
// 移除新上传的文件（使用编码文件名）
function removeNewUploadFile(type, encodedFileName, e) {
    e.stopPropagation();
    const fileArray = type === 'before' ? editBeforeFiles : editAfterFiles;
    const index = fileArray.findIndex(f => f.encodedName === encodedFileName);
    if (index !== -1) {
        fileArray.splice(index, 1);
    }
    e.target.closest('.image-item').remove();
}
// 保存项目修改（无需编码目录名，仅传递原始值）
function saveProjectEdit() {
    const projectPath = document.getElementById('project-path').value;
    const username = document.getElementById('edit-username').value.trim();
    const userPhone = document.getElementById('edit-user-phone').value.trim();
    const workType = document.getElementById('edit-work-type').value;
    const workLocation = document.getElementById('edit-work-location').value.trim();
    const completeTime = document.getElementById('edit-complete-time').value;
    const workContent = document.getElementById('edit-work-content').value.trim();
    
    // 校验必填项
    if (!username || !workType || !workLocation || !completeTime || !workContent) {
        alert('用户名、工作类型、工作地点、完成时间、工作内容不能为空！');
        return;
    }
    
    // 构建表单数据（仅传递原始目录名，不编码）
    const formData = new FormData();
    formData.append('project_path', projectPath);
    formData.append('username', username);
    formData.append('user_phone', userPhone);
    formData.append('work_type', workType);
    formData.append('work_location', workLocation);
    formData.append('complete_time', completeTime);
    formData.append('work_content', workContent);
    
    // 添加要删除的图片
    formData.append('delete_before', JSON.stringify(deleteBeforeImages));
    formData.append('delete_after', JSON.stringify(deleteAfterImages));
    
    // 添加新上传的图片（仅文件名编码）
    editBeforeFiles.forEach(file => {
        formData.append('new_before[]', file, file.encodedName || file.name);
    });
    editAfterFiles.forEach(file => {
        formData.append('new_after[]', file, file.encodedName || file.name);
    });
    
    // 发送请求
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'php/edit-project.php', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    showAlert('项目修改成功！');
                    closeEditModal();
                    loadAllProjects();
                } else {
                    alert('修改失败：' + data.msg);
                }
            } catch (err) {
                alert('解析响应失败：' + err.message);
            }
        } else {
            alert('服务器响应失败，状态码：' + xhr.status);
        }
    };
    xhr.onerror = function() {
        alert('上传失败，请检查网络连接');
    };
    xhr.send(formData);
}
// 关闭编辑模态框
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    currentProject = null;
}
// 复制项目内容（替换图片数量为保存时间）
function copyProjectContent(projectPath) {
    const project = allProjects.find(p => p.path === projectPath);
    if (!project) return;
    
    // 提取保存时间
    const saveTime = project.saveTime || new Date().toLocaleString();
    
    // 构建新格式
    const content = `用户名：${project.username}
联系电话：${project.userPhone || '无'}
工作类型：${project.workType}
工作地点：${project.workLocation}
完成时间：${project.completeTime}
工作任务内容：${project.workContent}
保存时间：${saveTime}`;
    
    // 兼容方案
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(() => {
            showAlert('项目内容已复制到剪贴板！');
        }).catch(err => {
            fallbackCopyText(content);
        });
    } else {
        fallbackCopyText(content);
    }
}
// 复制降级方案
function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showAlert('项目内容已复制到剪贴板！');
}
// 单张图片下载
function downloadSingleImage(imageUrl, filename, e) {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showAlert('图片开始下载！');
}
// 下载所有图片
function downloadAllImages(projectPath) {
    const project = allProjects.find(p => p.path === projectPath);
    if (!project) return;
    
    if (project.beforeImages.length === 0 && project.afterImages.length === 0) {
        alert('该项目无图片可下载');
        return;
    }
    
    showAlert(`开始下载${project.beforeImages.length + project.afterImages.length}张图片！`);
    
    // 下载施工前图片
    project.beforeImages.forEach((img, index) => {
        downloadSingleImage(img.url, `施工前_${index + 1}_${img.filename}`, { stopPropagation: () => {} });
    });
    
    // 下载施工后图片
    project.afterImages.forEach((img, index) => {
        downloadSingleImage(img.url, `施工后_${index + 1}_${img.filename}`, { stopPropagation: () => {} });
    });
}
// 删除项目
function deleteProject(projectPath) {
    if (!confirm('确定要删除该项目吗？删除后不可恢复！')) {
        return;
    }
    
    fetch('php/delete-project.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('项目删除成功！');
            loadAllProjects();
        } else {
            alert('删除失败：' + data.msg);
        }
    })
    .catch(err => {
        alert('删除失败：' + err.message);
    });
}
// 初始化图片预览窗口
function initImagePreviewWindow() {
    const resizableModal = document.getElementById('view-resizable-modal');
    const resizableImg = document.getElementById('view-resizable-img');
    const modalCloseBtn = document.getElementById('view-modal-close-btn');
    const modalOverlay = document.getElementById('view-modal-overlay');
    const zoomInBtn = document.getElementById('view-zoom-in');
    const zoomOutBtn = document.getElementById('view-zoom-out');
    const zoomResetBtn = document.getElementById('view-zoom-reset');
    const modalHeader = resizableModal.querySelector('.modal-header');
    const modalBody = resizableModal.querySelector('.modal-body');
    const touchTip = document.getElementById('view-touch-tip');
    
    // 初始化窗口大小
    function initModalSize() {
        resizableModal.style.width = `${viewModalSize.width}px`;
        resizableModal.style.height = `${viewModalSize.height}px`;
    }
    
    // 打开预览窗口
    window.openImagePreview = function(src) {
        resizableImg.src = src;
        viewCurrentScale = 1;
        viewImageOffset = { x: 0, y: 0 };
        resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
        resizableImg.style.transformOrigin = 'center center';
        modalBody.style.cursor = 'default';
        initModalSize();
        resizableModal.style.display = 'block';
        modalOverlay.style.display = 'block';
        
        // 手机端提示
        if (touchTip && window.innerWidth <= 768) {
            touchTip.style.display = 'block';
            setTimeout(() => touchTip.style.display = 'none', 3000);
        }
    };
    
    // 关闭预览窗口
    function closeImagePreview() {
        resizableModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        resizableImg.src = '';
        viewCurrentScale = 1;
        viewImageOffset = { x: 0, y: 0 };
        viewIsDraggingWindow = false;
        viewIsDraggingImage = false;
        viewIsTouchDragging = false;
    }
    
    // 窗口拖拽
    modalHeader.addEventListener('mousedown', (e) => {
        viewIsDraggingWindow = true;
        const modalRect = resizableModal.getBoundingClientRect();
        viewWindowDragStart.x = e.clientX - modalRect.left;
        viewWindowDragStart.y = e.clientY - modalRect.top;
        modalHeader.style.cursor = 'grabbing';
    });
    
    // 图片拖拽
    modalBody.addEventListener('mousedown', (e) => {
        if (viewCurrentScale <= 1) return;
        viewIsDraggingImage = true;
        viewImageDragStart.x = e.clientX - viewImageOffset.x;
        viewImageDragStart.y = e.clientY - viewImageOffset.y;
        modalBody.style.cursor = 'grabbing';
        e.stopPropagation();
    });
    
    // 鼠标移动
    document.addEventListener('mousemove', (e) => {
        if (viewIsDraggingWindow) {
            const x = e.clientX - viewWindowDragStart.x;
            const y = e.clientY - viewWindowDragStart.y;
            const maxX = window.innerWidth - resizableModal.offsetWidth;
            const maxY = window.innerHeight - resizableModal.offsetHeight;
            resizableModal.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            resizableModal.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            resizableModal.style.transform = 'none';
        }
        
        if (viewIsDraggingImage) {
            const newX = e.clientX - viewImageDragStart.x;
            const newY = e.clientY - viewImageDragStart.y;
            const imgNaturalWidth = resizableImg.naturalWidth * viewCurrentScale;
            const imgNaturalHeight = resizableImg.naturalHeight * viewCurrentScale;
            const windowWidth = modalBody.offsetWidth;
            const windowHeight = modalBody.offsetHeight;
            const limitX = Math.max(0, imgNaturalWidth - windowWidth);
            const limitY = Math.max(0, imgNaturalHeight - windowHeight);
            viewImageOffset.x = Math.max(-limitX, Math.min(newX, 0));
            viewImageOffset.y = Math.max(-limitY, Math.min(newY, 0));
            resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
        }
    });
    
    // 鼠标松开
    document.addEventListener('mouseup', () => {
        if (viewIsDraggingWindow) {
            viewIsDraggingWindow = false;
            modalHeader.style.cursor = 'move';
        }
        if (viewIsDraggingImage) {
            viewIsDraggingImage = false;
            modalBody.style.cursor = viewCurrentScale > 1 ? 'grab' : 'default';
        }
    });
    
    // 缩放控制
    function updateImageScale() {
        resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
        modalBody.style.cursor = viewCurrentScale > 1 ? 'grab' : 'default';
    }
    
    zoomInBtn.addEventListener('click', () => {
        if (viewCurrentScale < 5) {
            viewCurrentScale += 0.1;
            updateImageScale();
        }
    });
    
    zoomOutBtn.addEventListener('click', () => {
        if (viewCurrentScale > 0.5) {
            viewCurrentScale -= 0.1;
            if (viewCurrentScale <= 1) {
                viewCurrentScale = 1;
                viewImageOffset = { x: 0, y: 0 };
            }
            updateImageScale();
        }
    });
    
    zoomResetBtn.addEventListener('click', () => {
        viewCurrentScale = 1;
        viewImageOffset = { x: 0, y: 0 };
        resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
        modalBody.style.cursor = 'default';
        resizableModal.style.transform = 'translate(-50%, -50%)';
        resizableModal.style.left = '50%';
        resizableModal.style.top = '50%';
        initModalSize();
    });
    
    // 滚轮缩放
    modalBody.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0 && viewCurrentScale < 5) {
            viewCurrentScale += 0.1;
        } else if (e.deltaY > 0 && viewCurrentScale > 0.5) {
            viewCurrentScale -= 0.1;
            if (viewCurrentScale <= 1) {
                viewCurrentScale = 1;
                viewImageOffset = { x: 0, y: 0 };
            }
        } else {
            return;
        }
        updateImageScale();
    });
    
    // 触摸事件（手机端）
    modalBody.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            if (viewCurrentScale > 1) {
                viewIsTouchDragging = true;
                viewImageDragStart.x = e.touches[0].clientX - viewImageOffset.x;
                viewImageDragStart.y = e.touches[0].clientY - viewImageOffset.y;
                modalBody.style.cursor = 'grabbing';
            }
        } else if (e.touches.length === 2) {
            const x1 = e.touches[0].clientX;
            const y1 = e.touches[0].clientY;
            const x2 = e.touches[1].clientX;
            const y2 = e.touches[1].clientY;
            viewLastTouchDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
        e.preventDefault();
    }, { passive: false });
    
    modalBody.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && viewIsTouchDragging) {
            const newX = e.touches[0].clientX - viewImageDragStart.x;
            const newY = e.touches[0].clientY - viewImageDragStart.y;
            const imgNaturalWidth = resizableImg.naturalWidth * viewCurrentScale;
            const imgNaturalHeight = resizableImg.naturalHeight * viewCurrentScale;
            const windowWidth = modalBody.offsetWidth;
            const windowHeight = modalBody.offsetHeight;
            const limitX = Math.max(0, imgNaturalWidth - windowWidth);
            const limitY = Math.max(0, imgNaturalHeight - windowHeight);
            viewImageOffset.x = Math.max(-limitX, Math.min(newX, 0));
            viewImageOffset.y = Math.max(-limitY, Math.min(newY, 0));
            resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
        } else if (e.touches.length === 2) {
            const x1 = e.touches[0].clientX;
            const y1 = e.touches[0].clientY;
            const x2 = e.touches[1].clientX;
            const y2 = e.touches[1].clientY;
            const currentDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const scaleRatio = currentDistance / viewLastTouchDistance;
            
            const newScale = Math.min(5, Math.max(0.5, viewCurrentScale * scaleRatio));
            if (newScale !== viewCurrentScale) {
                viewCurrentScale = newScale;
                if (viewCurrentScale <= 1) {
                    viewCurrentScale = 1;
                    viewImageOffset = { x: 0, y: 0 };
                }
                resizableImg.style.transform = `translate(${viewImageOffset.x}px, ${viewImageOffset.y}px) scale(${viewCurrentScale})`;
                modalBody.style.cursor = viewCurrentScale > 1 ? 'grab' : 'default';
                viewLastTouchDistance = currentDistance;
            }
        }
        e.preventDefault();
    }, { passive: false });
    
    modalBody.addEventListener('touchend', () => {
        viewIsTouchDragging = false;
        modalBody.style.cursor = viewCurrentScale > 1 ? 'grab' : 'default';
    });
    
    // 关闭按钮
    modalCloseBtn.addEventListener('click', closeImagePreview);
    modalOverlay.addEventListener('click', closeImagePreview);
}
// 显示提示
function showAlert(msg) {
    const alertElement = document.getElementById('success-alert');
    if (alertElement) {
        alertElement.textContent = msg;
        alertElement.style.display = 'block';
        setTimeout(() => alertElement.style.display = 'none', 3000);
    } else {
        alert(msg);
    }
}