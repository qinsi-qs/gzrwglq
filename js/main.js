// 全局变量
let beforeFiles = [];  // 施工前文件列表（存储原生File对象）
let afterFiles = [];   // 施工后文件列表（存储原生File对象）
let pendingFiles = []; // 待保存文件列表（{file: 原生File, type: string, encodedName: string}）
// 可调节窗口全局状态变量（默认尺寸800×600）
let modalSize = { width: 800, height: 600 };
let isDraggingWindow = false; // 窗口拖拽标记
let isDraggingImage = false; // 图片拖拽标记
let windowDragStart = { x: 0, y: 0 }; // 窗口拖拽起始位置
let imageDragStart = { x: 0, y: 0 }; // 图片拖拽起始位置
let imageOffset = { x: 0, y: 0 }; // 图片平移偏移量
let currentScale = 1; // 图片缩放比例
const scaleStep = 0.1; // 缩放步长
const minScale = 0.5; // 最小缩放
const maxScale = 5; // 最大缩放（满足细节查看）
// 手机端触摸相关变量
let lastTouchDistance = 0; // 上一次双指距离
let isTouchDragging = false; // 触摸拖拽标记
// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载工作类型
    loadWorkTypes();
    // 初始化完成时间为当前日期
    initCurrentTime();
    // 绑定复原时间按钮事件
    bindResetTimeEvent();
    // 绑定电话输入框实时校验事件
    bindPhoneInputCheck();
    // 施工前上传区域
    const beforeArea = document.getElementById('before-upload-area');
    const beforeFileInput = document.getElementById('before-files');
    const beforeFileList = document.getElementById('before-file-list');
    // 施工后上传区域
    const afterArea = document.getElementById('after-upload-area');
    const afterFileInput = document.getElementById('after-files');
    const afterFileList = document.getElementById('after-file-list');
    // 上传区域点击事件
    if (beforeArea && beforeFileInput) {
        beforeArea.addEventListener('click', () => beforeFileInput.click());
    }
    if (afterArea && afterFileInput) {
        afterArea.addEventListener('click', () => afterFileInput.click());
    }
    // 拖拽事件
    [beforeArea, afterArea].forEach(area => {
        if (!area) return;
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('active');
        });
        area.addEventListener('dragleave', () => {
            area.classList.remove('active');
        });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('active');
            const files = Array.from(e.dataTransfer.files);
            if (area === beforeArea) {
                handleFiles(files, 'before');
            } else if (area === afterArea) {
                handleFiles(files, 'after');
            }
        });
    });
    // 文件选择事件
    if (beforeFileInput) {
        beforeFileInput.addEventListener('change', () => {
            handleFiles(Array.from(beforeFileInput.files), 'before');
        });
    }
    if (afterFileInput) {
        afterFileInput.addEventListener('change', () => {
            handleFiles(Array.from(afterFileInput.files), 'after');
        });
    }
    // 添加工作类型按钮事件
    const typeAddBtn = document.getElementById('type-add-btn');
    if (typeAddBtn) {
        typeAddBtn.addEventListener('click', function() {
            const newType = prompt('请输入新的工作类型：');
            if (newType && newType.trim()) {
                addWorkType(newType.trim());
            }
        });
    }
    // 表单提交事件
    const constructionForm = document.getElementById('construction-form');
    if (constructionForm) {
        constructionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitForm();
        });
    }
    // 新增：绑定所有添加按钮事件
    bindAddButtons();
    // ===================== 可调节图片放大窗口功能（核心优化：固定中心放大） =====================
    // 可调节放大窗口元素（全局获取）
    const resizableModal = document.getElementById('resizable-modal');
    const resizableImg = document.getElementById('resizable-img');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const modalHeader = document.querySelector('.modal-header');
    const modalBody = document.querySelector('.modal-body');
    const touchTip = document.getElementById('touch-tip');
    
    // 初始化窗口大小（全局函数）
    window.initModalSize = function() {
        if (resizableModal) {
            resizableModal.style.width = `${modalSize.width}px`;
            resizableModal.style.height = `${modalSize.height}px`;
        }
    };
    // 打开放大窗口（全局函数，重置图片状态）
    window.openResizableModal = function(src) {
        if (resizableImg && resizableModal && modalOverlay && modalBody) {
            resizableImg.src = src;
            // 重置图片状态：缩放1倍，无偏移，居中显示
            currentScale = 1;
            imageOffset = { x: 0, y: 0 };
            resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
            resizableImg.style.transformOrigin = 'center center'; // 固定以图片中心为缩放基准
            // 重置鼠标样式
            modalBody.style.cursor = 'default';
            initModalSize();
            resizableModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            // 手机端显示触摸提示
            if (touchTip && window.innerWidth <= 768) {
                touchTip.style.display = 'block';
                setTimeout(() => touchTip.style.display = 'none', 3000);
            }
        }
    };
    // 关闭放大窗口（全局函数）
    window.closeResizableModal = function() {
        if (resizableModal && modalOverlay && resizableImg) {
            resizableModal.style.display = 'none';
            modalOverlay.style.display = 'none';
            resizableImg.src = '';
            // 重置所有状态
            currentScale = 1;
            imageOffset = { x: 0, y: 0 };
            isDraggingWindow = false;
            isDraggingImage = false;
            isTouchDragging = false;
        }
    };
    // 1. 窗口拖拽（标题栏）
    if (modalHeader) {
        modalHeader.addEventListener('mousedown', (e) => {
            isDraggingWindow = true;
            const modalRect = resizableModal.getBoundingClientRect();
            windowDragStart.x = e.clientX - modalRect.left;
            windowDragStart.y = e.clientY - modalRect.top;
            modalHeader.style.cursor = 'grabbing';
        });
    }
    // 2. 图片拖拽（窗口内容区，缩放后生效）
    if (modalBody) {
        modalBody.addEventListener('mousedown', (e) => {
            // 仅当图片缩放超过1倍时，允许拖拽平移
            if (currentScale <= 1) return;
            isDraggingImage = true;
            // 记录拖拽起始位置（鼠标相对于图片偏移量）
            imageDragStart.x = e.clientX - imageOffset.x;
            imageDragStart.y = e.clientY - imageOffset.y;
            modalBody.style.cursor = 'grabbing';
            e.stopPropagation(); // 阻止事件冒泡到窗口拖拽
        });
    }
    // 全局鼠标移动事件（处理窗口/图片拖拽）
    document.addEventListener('mousemove', (e) => {
        // 处理窗口拖拽
        if (isDraggingWindow && resizableModal) {
            const x = e.clientX - windowDragStart.x;
            const y = e.clientY - windowDragStart.y;
            // 限制窗口不超出视口
            const maxX = window.innerWidth - resizableModal.offsetWidth;
            const maxY = window.innerHeight - resizableModal.offsetHeight;
            resizableModal.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            resizableModal.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            resizableModal.style.transform = 'none';
        }
        // 处理图片拖拽（平移查看边缘）
        if (isDraggingImage && resizableImg) {
            // 计算新偏移量
            const newX = e.clientX - imageDragStart.x;
            const newY = e.clientY - imageDragStart.y;
            // 限制偏移范围（避免图片空白区域过大）
            const imgNaturalWidth = resizableImg.naturalWidth * currentScale;
            const imgNaturalHeight = resizableImg.naturalHeight * currentScale;
            const windowWidth = modalBody.offsetWidth;
            const windowHeight = modalBody.offsetHeight;
            // 横向限制：左不超过0，右不超过（图片宽度 - 窗口宽度）
            const limitX = Math.max(0, imgNaturalWidth - windowWidth);
            // 纵向限制：上不超过0，下不超过（图片高度 - 窗口高度）
            const limitY = Math.max(0, imgNaturalHeight - windowHeight);
            // 更新偏移量（在限制范围内）
            imageOffset.x = Math.max(-limitX, Math.min(newX, 0));
            imageOffset.y = Math.max(-limitY, Math.min(newY, 0));
            // 应用平移和缩放（固定中心基准）
            resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
        }
    });
    // 全局鼠标松开事件（结束拖拽）
    document.addEventListener('mouseup', () => {
        if (isDraggingWindow && modalHeader) {
            isDraggingWindow = false;
            modalHeader.style.cursor = 'move';
        }
        if (isDraggingImage && modalBody) {
            isDraggingImage = false;
            modalBody.style.cursor = currentScale > 1 ? 'grab' : 'default';
        }
    });
    // 缩放控制（核心：固定以图片中心放大）
    function updateImageScale() {
        if (resizableImg && modalBody) {
            resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
            // 缩放超过1倍时，显示拖拽提示光标
            modalBody.style.cursor = currentScale > 1 ? 'grab' : 'default';
        }
    }
    // 放大按钮（固定中心放大）
    if (zoomInBtn && resizableImg && modalBody) {
        zoomInBtn.addEventListener('click', () => {
            if (currentScale >= maxScale) return;
            currentScale += scaleStep;
            // 固定中心基准，无需根据鼠标位置调整偏移
            updateImageScale();
        });
    }
    // 缩小按钮（固定中心缩小，缩小到1倍时居中）
    if (zoomOutBtn && resizableImg && modalBody) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentScale <= minScale) return;
            currentScale -= scaleStep;
            // 缩小到1倍及以下时，重置偏移并居中
            if (currentScale <= 1) {
                currentScale = 1;
                imageOffset = { x: 0, y: 0 };
            }
            updateImageScale();
        });
    }
    // 重置按钮（恢复所有初始状态）
    if (zoomResetBtn && resizableImg && resizableModal && modalBody) {
        zoomResetBtn.addEventListener('click', () => {
            currentScale = 1;
            imageOffset = { x: 0, y: 0 };
            resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
            modalBody.style.cursor = 'default';
            // 重置窗口位置
            resizableModal.style.transform = 'translate(-50%, -50%)';
            resizableModal.style.left = '50%';
            resizableModal.style.top = '50%';
            initModalSize();
        });
    }
    // 鼠标滚轮缩放（固定中心放大）
    if (modalBody && resizableImg) {
        modalBody.addEventListener('wheel', (e) => {
            e.preventDefault();
            // 滚轮向上=放大，向下=缩小
            if (e.deltaY < 0 && currentScale < maxScale) {
                currentScale += scaleStep;
            } else if (e.deltaY > 0 && currentScale > minScale) {
                currentScale -= scaleStep;
                // 缩小到1倍及以下时，重置偏移并居中
                if (currentScale <= 1) {
                    currentScale = 1;
                    imageOffset = { x: 0, y: 0 };
                }
            } else {
                return; // 超出缩放范围，不执行后续逻辑
            }
            updateImageScale();
        });
    }
    // 关闭按钮事件
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeResizableModal);
    }
    // 遮罩层点击关闭
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeResizableModal);
    }
    // ===================== 手机端触摸事件支持（双指缩放+单指拖动） =====================
    // 触摸开始事件
    if (modalBody && resizableImg) {
        modalBody.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // 单指拖动（仅缩放>1时生效）
                if (currentScale > 1) {
                    isTouchDragging = true;
                    imageDragStart.x = e.touches[0].clientX - imageOffset.x;
                    imageDragStart.y = e.touches[0].clientY - imageOffset.y;
                    modalBody.style.cursor = 'grabbing';
                }
            } else if (e.touches.length === 2) {
                // 双指缩放：计算初始距离
                const x1 = e.touches[0].clientX;
                const y1 = e.touches[0].clientY;
                const x2 = e.touches[1].clientX;
                const y2 = e.touches[1].clientY;
                lastTouchDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            }
            e.preventDefault();
        }, { passive: false });
    }
    // 触摸移动事件
    if (modalBody && resizableImg) {
        modalBody.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isTouchDragging) {
                // 单指拖动平移
                const newX = e.touches[0].clientX - imageDragStart.x;
                const newY = e.touches[0].clientY - imageDragStart.y;
                // 限制偏移范围
                const imgNaturalWidth = resizableImg.naturalWidth * currentScale;
                const imgNaturalHeight = resizableImg.naturalHeight * currentScale;
                const windowWidth = modalBody.offsetWidth;
                const windowHeight = modalBody.offsetHeight;
                const limitX = Math.max(0, imgNaturalWidth - windowWidth);
                const limitY = Math.max(0, imgNaturalHeight - windowHeight);
                imageOffset.x = Math.max(-limitX, Math.min(newX, 0));
                imageOffset.y = Math.max(-limitY, Math.min(newY, 0));
                resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
            } else if (e.touches.length === 2) {
                // 双指缩放
                const x1 = e.touches[0].clientX;
                const y1 = e.touches[0].clientY;
                const x2 = e.touches[1].clientX;
                const y2 = e.touches[1].clientY;
                const currentDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const scaleRatio = currentDistance / lastTouchDistance; // 缩放比例
                
                // 更新缩放值（限制范围）
                const newScale = Math.min(maxScale, Math.max(minScale, currentScale * scaleRatio));
                if (newScale !== currentScale) {
                    currentScale = newScale;
                    // 缩小到1倍及以下时重置偏移
                    if (currentScale <= 1) {
                        currentScale = 1;
                        imageOffset = { x: 0, y: 0 };
                    }
                    resizableImg.style.transform = `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${currentScale})`;
                    modalBody.style.cursor = currentScale > 1 ? 'grab' : 'default';
                    lastTouchDistance = currentDistance; // 更新上一次距离
                }
            }
            e.preventDefault();
        }, { passive: false });
    }
    // 触摸结束事件
    if (modalBody) {
        modalBody.addEventListener('touchend', () => {
            isTouchDragging = false;
            modalBody.style.cursor = currentScale > 1 ? 'grab' : 'default';
        });
    }
    // =================================================================
});
// 新增：绑定添加按钮事件
function bindAddButtons() {
    // 1. 线缆添加
    const addCable = document.getElementById('add-cable');
    if (addCable) {
        addCable.addEventListener('click', function() {
            const operation = document.getElementById('cable-operation')?.value || '';
            const spec = document.getElementById('cable-spec')?.value || '';
            const multiple = document.getElementById('cable-multiple')?.value || '';
            const length = document.getElementById('cable-length')?.value || '';
            
            if (!operation || !spec || !multiple || !length) {
                alert('请填写完整线缆信息！');
                return;
            }
            
            const total = length * multiple;
            const content = `${operation}${spec}平方线${multiple}×${length}=${total}米`;
            addToWorkContent(content);
        });
    }
    // 2. 街码添加
    const addStreetCode = document.getElementById('add-street-code');
    if (addStreetCode) {
        addStreetCode.addEventListener('click', function() {
            const operation = document.getElementById('street-code-operation')?.value || '';
            const type = document.getElementById('street-code-type')?.value || '';
            const count = document.getElementById('street-code-count')?.value || '';
            
            if (!operation || !type || !count) {
                alert('请填写完整街码信息！');
                return;
            }
            
            const content = `${operation}${type}街码${count}个`;
            addToWorkContent(content);
        });
    }
    // 3. 电杆添加
    const addPole = document.getElementById('add-pole');
    if (addPole) {
        addPole.addEventListener('click', function() {
            const operation = document.getElementById('pole-operation')?.value || '';
            const type = document.getElementById('pole-type')?.value || '';
            const count = document.getElementById('pole-count')?.value || '';
            
            if (!operation || !type || !count) {
                alert('请填写完整电杆信息！');
                return;
            }
            
            const content = `${operation}${type}${count}条`;
            addToWorkContent(content);
        });
    }
    // 4. 抱箍添加
    const addHoop = document.getElementById('add-hoop');
    if (addHoop) {
        addHoop.addEventListener('click', function() {
            const operation = document.getElementById('hoop-operation')?.value || '';
            const type = document.getElementById('hoop-type')?.value || '';
            const count = document.getElementById('hoop-count')?.value || '';
            
            if (!operation || !type || !count) {
                alert('请填写完整抱箍信息！');
                return;
            }
            
            const content = `${operation}${type}${count}个`;
            addToWorkContent(content);
        });
    }
    // 5. 拨接管添加
    const addConnector = document.getElementById('add-connector');
    if (addConnector) {
        addConnector.addEventListener('click', function() {
            const type = document.getElementById('connector-type')?.value || '';
            const count = document.getElementById('connector-count')?.value || '';
            
            if (!type || !count) {
                alert('请填写完整拨接管信息！');
                return;
            }
            
            const content = `${type}${count}个`;
            addToWorkContent(content);
        });
    }
    // 6. 创通添加
    const addChuangtong = document.getElementById('add-chuangtong');
    if (addChuangtong) {
        addChuangtong.addEventListener('click', function() {
            const type1 = document.getElementById('chuangtong-type1')?.value || '';
            const type2 = document.getElementById('chuangtong-type2')?.value || '';
            const count = document.getElementById('chuangtong-count')?.value || '';
            
            if (!type1 || !type2 || !count) {
                alert('请填写完整创通信息！');
                return;
            }
            
            const content = `${type1}-${type2}创通${count}个`;
            addToWorkContent(content);
        });
    }
    // 7. 瓷碌添加
    const addPorcelain = document.getElementById('add-porcelain');
    if (addPorcelain) {
        addPorcelain.addEventListener('click', function() {
            const count = document.getElementById('porcelain-count')?.value || '';
            
            if (!count) {
                alert('请填写瓷碌数量！');
                return;
            }
            
            const content = `瓷碌${count}个`;
            addToWorkContent(content);
        });
    }
    // 8. 拉线添加
    const addCableWire = document.getElementById('add-cable-wire');
    if (addCableWire) {
        addCableWire.addEventListener('click', function() {
            const operation = document.getElementById('cable-wire-operation')?.value || '';
            const count = document.getElementById('cable-count')?.value || '';
            
            if (!operation || !count) {
                alert('请选择拉线操作并填写数量！');
                return;
            }
            
            if (operation === '拆除') {
                const content = `${operation}拉线${count}组`;
                addToWorkContent(content);
                return;
            }
            
            const baseItems = [
                'NX-2 {count}个',
                'UT-2 {count}个',
                '延长环-10 {count}个',
                'U环-16 {count}个',
                '拉棒16X150 {count}条',
                '钢绞线 {count}×50kg',
                '低压拉盘30X60 {count}块',
                '抱箍160 {count}副',
                '钢卡子 4{count}个',
                '低压绝缘子 {count}个'
            ];
            
            const items = baseItems.map(item => item.replace(/{count}/g, count));
            const content = `${operation}拉线${count}组，包含：${items.join('，')}`;
            addToWorkContent(content);
        });
    }
}
// 新增：添加内容到工作任务文本域
function addToWorkContent(content) {
    const workContent = document.getElementById('work-content');
    if (!workContent) return;
    const currentValue = workContent.value.trim();
    
    if (currentValue) {
        workContent.value = `${currentValue}，${content}`;
    } else {
        workContent.value = content;
    }
    
    workContent.scrollTop = workContent.scrollHeight;
}
// 初始化完成时间为当前日期
function initCurrentTime() {
    const timeInput = document.getElementById('complete-time');
    if (!timeInput) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    timeInput.value = currentDate;
}
// 绑定复原时间按钮事件
function bindResetTimeEvent() {
    const resetBtn = document.getElementById('reset-time-btn');
    if (!resetBtn) return;
    resetBtn.addEventListener('click', function() {
        initCurrentTime();
    });
}
// 绑定电话输入框实时校验事件
function bindPhoneInputCheck() {
    const phoneInput = document.getElementById('user-phone');
    if (!phoneInput) return;
    phoneInput.addEventListener('input', function() {
        const reg = /^[0-9\+\-\(\)\s]*$/;
        if (!reg.test(this.value)) {
            this.value = this.value.replace(/[^0-9\+\-\(\)\s]/g, '');
        }
    });
    phoneInput.addEventListener('blur', function() {
        this.value = this.value.trim();
    });
}
// 加载工作类型
function loadWorkTypes() {
    const select = document.getElementById('work-type');
    if (!select) return;
    fetch('php/type-manage.php?action=get')
        .then(res => res.json())
        .then(data => {
            if (select) {
                select.innerHTML = '';
                data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type;
                    select.appendChild(option);
                });
            }
        })
        .catch(err => {
            alert('加载工作类型失败：' + err.message);
        });
}
// 添加工作类型
function addWorkType(type) {
    fetch('php/type-manage.php?action=add&type=' + encodeURIComponent(type))
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadWorkTypes();
                showAlert('工作类型添加成功！');
            } else {
                alert('该类型已存在！');
            }
        })
        .catch(err => {
            alert('添加工作类型失败：' + err.message);
        });
}
// 处理选择的文件（修复：保留原生File对象，单独存储编码名）
function handleFiles(files, type) {
    const fileList = type === 'before' ? document.getElementById('before-file-list') : document.getElementById('after-file-list');
    const fileArray = type === 'before' ? beforeFiles : afterFiles;
    const emptyTip = document.getElementById('empty-tip');
    if (!fileList) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        alert('请选择图片文件！');
        return;
    }
    imageFiles.forEach(file => {
        // 仅对文件名编码，目录名用原始值
        const encodedFileName = encodeURIComponent(file.name);
        // 检查原生File对象的name编码后是否存在（不包装文件对象）
        if (!fileArray.some(f => encodeURIComponent(f.name) === encodedFileName)) {
            // 直接存储原生File对象，不包装
            fileArray.push(file);
            // 待保存列表存储文件+类型+编码名（单独存储编码名，不修改文件对象）
            pendingFiles.push({
                file: file,
                type: type,
                encodedName: encodedFileName
            });
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`;
            fileList.appendChild(item);
            // 传入原生File对象和编码名
            generatePreview(type, file, encodedFileName);
        }
    });
    renderPendingList();
    if (pendingFiles.length > 0 && emptyTip) {
        emptyTip.style.display = 'none';
    }
    updateCount();
}
// 生成图片预览（修复：接收原生File对象+单独的编码名）
function generatePreview(type, file, encodedFileName) {
    const previewArea = document.getElementById('image-preview');
    if (!previewArea) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${e.target.result}" alt="${encodedFileName || file.name}">
            <div class="preview-label">${type === 'before' ? '施工前' : '施工后'}</div>
        `;
        previewArea.appendChild(previewItem);
        previewItem.addEventListener('click', () => {
            window.openResizableModal(e.target.result);
        });
    };
    // 传入原生File对象（Blob类型）
    reader.readAsDataURL(file);
}
// 渲染待保存图片列表（修复：从pendingFiles中获取编码名）
function renderPendingList() {
    const pendingGrid = document.getElementById('pending-grid');
    if (!pendingGrid) return;
    pendingGrid.innerHTML = '';
    
    pendingFiles.forEach((item, index) => {
        const file = item.file; // 原生File对象
        const type = item.type;
        const encodedFileName = item.encodedName; // 单独存储的编码名
        const size = (file.size / 1024 / 1024).toFixed(2);
        const typeText = type === 'before' ? '施工前' : '施工后';
        const tagClass = type === 'before' ? 'tag-before' : 'tag-after';
        const pendingItem = document.createElement('div');
        pendingItem.className = 'pending-item';
        pendingItem.innerHTML = `
            <div class="pending-info">
                <div class="pending-name">${file.name}</div>
                <div class="pending-size">大小：${size}MB</div>
            </div>
            <span class="pending-tag ${tagClass}">${typeText}</span>
            <span class="pending-remove" data-index="${index}">×</span>
        `;
        pendingGrid.appendChild(pendingItem);
        const removeBtn = pendingItem.querySelector('.pending-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                const idx = this.getAttribute('data-index');
                removePendingFile(idx);
            });
        }
    });
}
// 删除待保存文件（修复：基于文件名匹配删除）
function removePendingFile(index) {
    const removedItem = pendingFiles.splice(index, 1)[0];
    if (!removedItem) return;
    const file = removedItem.file; // 原生File对象
    const type = removedItem.type;
    const fileArray = type === 'before' ? beforeFiles : afterFiles;
    const fileList = type === 'before' ? document.getElementById('before-file-list') : document.getElementById('after-file-list');
    const emptyTip = document.getElementById('empty-tip');
    if (!fileList) return;
    
    // 基于原生File对象的name匹配删除
    const fileIndex = fileArray.findIndex(f => f.name === file.name);
    if (fileIndex !== -1) {
        fileArray.splice(fileIndex, 1);
    }
    const fileItems = fileList.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        if (item.textContent.includes(file.name)) {
            item.remove();
        }
    });
    const previewItems = document.querySelectorAll('.preview-item');
    previewItems.forEach(item => {
        const label = item.querySelector('.preview-label')?.textContent || '';
        const imgAlt = item.querySelector('img')?.alt || '';
        const encodedFileName = removedItem.encodedName;
        if (label === (type === 'before' ? '施工前' : '施工后') && (imgAlt === encodedFileName || imgAlt === file.name)) {
            item.remove();
        }
    });
    renderPendingList();
    if (pendingFiles.length === 0 && emptyTip) {
        emptyTip.style.display = 'block';
    }
    updateCount();
}
// 更新图片数量统计
function updateCount() {
    const beforeCount = document.getElementById('before-count');
    const afterCount = document.getElementById('after-count');
    if (beforeCount) beforeCount.textContent = `(${beforeFiles.length})`;
    if (afterCount) afterCount.textContent = `(${afterFiles.length})`;
}
// 提交表单（修复：使用原生File对象+单独存储的编码名）
function submitForm() {
    const formData = new FormData();
    const username = document.getElementById('username')?.value.trim() || '';
    const userPhone = document.getElementById('user-phone')?.value.trim() || ''; 
    const workType = document.getElementById('work-type')?.value.trim() || '';
    const workLocation = document.getElementById('work-location')?.value.trim() || '';
    const completeTime = document.getElementById('complete-time')?.value.trim() || '';
    const workContent = document.getElementById('work-content')?.value.trim() || '';
    
    // 校验核心DOM元素
    const requiredElements = [
        {id: 'username', name: '用户名输入框'},
        {id: 'work-type', name: '工作类型选择框'},
        {id: 'complete-time', name: '完成时间输入框'},
        {id: 'work-content', name: '工作内容文本域'}
    ];
    const missingElements = requiredElements.filter(item => !document.getElementById(item.id));
    if (missingElements.length > 0) {
        alert(`以下核心元素缺失，请检查HTML配置：\n${missingElements.map(item => item.name).join('\n')}`);
        return;
    }
    
    // 校验必填项
    if (!username || !workType || !completeTime || !workContent) {
        alert('用户名、工作类型、完成时间、工作内容不能为空！');
        return;
    }
    
    // 电话格式校验
    if (userPhone!== '') {
        const phoneReg = /^[0-9\+\-\(\)\s]{1,20}$/;
        const hasNumber = /\d/.test(userPhone);
        if (!phoneReg.test(userPhone) || !hasNumber) {
            alert('请输入有效的联系电话（支持数字、+、-、(、)，至少1个数字）');
            return;
        }
    }
    
    // 表单数据（目录名用原始值，不编码）
    formData.append('username', username);
    formData.append('user_phone', userPhone);
    formData.append('work_type', workType);
    formData.append('work_location', workLocation);
    formData.append('complete_time', completeTime);
    formData.append('work_content', workContent);
    
    // 图片文件：使用原生File对象+单独的编码名
    pendingFiles.forEach(item => {
        const file = item.file; // 原生File对象
        const encodedFileName = item.encodedName; // 单独存储的编码名
        if (file.size > 0) {
            formData.append(`${item.type === 'before' ? 'before_files[]' : 'after_files[]'}`, file, encodedFileName || file.name);
        }
    });
    
    // 进度条处理
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (uploadProgress && progressBar && progressText) {
        uploadProgress.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '上传进度：0%';
    }
    
    // 发送请求
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'php/upload.php', true);
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable && uploadProgress && progressBar && progressText) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `上传进度：${percent}%`;
        }
    });
    xhr.addEventListener('load', function() {
        if (uploadProgress) uploadProgress.style.display = 'none';
        
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    showAlert('项目信息和图片保存成功！');
                    // 重置表单
                    const form = document.getElementById('construction-form');
                    if (form) form.reset();
                    initCurrentTime();
                    const phoneInput = document.getElementById('user-phone');
                    if (phoneInput) phoneInput.value = '';
                    
                    beforeFiles = [];
                    afterFiles = [];
                    pendingFiles = [];
                    
                    const beforeFileList = document.getElementById('before-file-list');
                    if (beforeFileList) beforeFileList.innerHTML = '';
                    const afterFileList = document.getElementById('after-file-list');
                    if (afterFileList) afterFileList.innerHTML = '';
                    const imagePreview = document.getElementById('image-preview');
                    if (imagePreview) imagePreview.innerHTML = '';
                    
                    renderPendingList();
                    const emptyTip = document.getElementById('empty-tip');
                    if (emptyTip) emptyTip.style.display = 'block';
                    updateCount();
                } else {
                    alert('保存失败：' + data.msg);
                }
            } catch (err) {
                alert('解析响应失败：' + err.message);
            }
        } else {
            alert('服务器响应失败，状态码：' + xhr.status);
        }
    });
    xhr.addEventListener('error', function() {
        if (uploadProgress) uploadProgress.style.display = 'none';
        alert('上传失败，请检查网络连接');
    });
    xhr.send(formData);
}
// 显示成功提示
function showAlert(msg) {
    const alertElement = document.getElementById('success-alert');
    if (!alertElement) {
        alert(msg);
        return;
    }
    alertElement.textContent = msg;
    alertElement.style.display = 'block';
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
}