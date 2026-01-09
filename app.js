// ==================== 配置 ====================
const CONFIG = {
    defaultBaseUrl: '逆向程序:端口',
    defaultApiUrl: 'https://逆向程序:端口/v1/chat/completions',
    defaultModel: 'grok-4.1'
};

// ==================== 状态管理 ====================
let promptHistory = JSON.parse(localStorage.getItem('grokPromptHistory') || '[]');

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    updateHistoryUI();
    
    // 绑定快捷键
    document.getElementById('prompt').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            generateImage();
        }
    });
    
    // 从 localStorage 恢复 API Key
    const savedApiKey = localStorage.getItem('grokApiKey');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    // 保存 API Key
    document.getElementById('apiKey').addEventListener('change', function() {
        localStorage.setItem('grokApiKey', this.value);
    });
});

// ==================== UI 控制函数 ====================
function toggleSettings() {
    const settings = document.getElementById('advancedSettings');
    settings.classList.toggle('show');
}

function toggleDebug() {
    const content = document.getElementById('debugContent');
    const text = document.getElementById('debugToggleText');
    content.classList.toggle('show');
    text.textContent = content.classList.contains('show') ? '隐藏调试信息' : '显示调试信息';
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    const icons = {
        loading: '⏳',
        error: '❌',
        success: '✅'
    };
    status.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    status.className = type;
    status.style.display = 'flex';
}

function hideStatus() {
    document.getElementById('status').style.display = 'none';
}

function setButtonLoading(loading) {
    const btn = document.getElementById('generateBtn');
    const btnIcon = document.getElementById('btnIcon');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    btn.disabled = loading;
    btnIcon.style.display = loading ? 'none' : 'inline';
    btnText.textContent = loading ? '生成中' : '生成图像';
    btnSpinner.style.display = loading ? 'inline-block' : 'none';
}

function showLoadingState() {
    document.getElementById('outputContent').innerHTML = `
        <div class="empty-state">
            <div class="spinner large-spinner"></div>
            <div class="empty-state-text pulse" style="margin-top: 30px; color: #00d4ff;">正在生成图像...</div>
            <div class="empty-state-hint">这可能需要 10-30 秒</div>
        </div>
    `;
    document.getElementById('imageCount').style.display = 'none';
}

function showErrorState(message) {
    document.getElementById('outputContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">😞</div>
            <div class="empty-state-text" style="color: #ff4757;">生成失败</div>
            <div class="empty-state-hint">${escapeHtml(message)}</div>
        </div>
    `;
}

// ==================== 历史记录 ====================
function addToHistory(prompt) {
    promptHistory = promptHistory.filter(p => p !== prompt);
    promptHistory.unshift(prompt);
    promptHistory = promptHistory.slice(0, 5);
    localStorage.setItem('grokPromptHistory', JSON.stringify(promptHistory));
    updateHistoryUI();
}

function updateHistoryUI() {
    const section = document.getElementById('historySection');
    const container = document.getElementById('historyPrompts');
    
    if (promptHistory.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = promptHistory.map(p => 
        `<div class="history-prompt" onclick="usePrompt(this)" data-prompt="${escapeAttr(p)}" title="${escapeAttr(p)}">${truncate(p, 30)}</div>`
    ).join('');
}

function usePrompt(element) {
    document.getElementById('prompt').value = element.dataset.prompt;
}

// ==================== 工具函数 ====================
function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, ' ');
}

// ==================== 图片操作 ====================
function downloadImage(url, filename) {
    // 尝试通过 fetch 下载以处理跨域
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        })
        .catch(error => {
            console.error('Download error:', error);
            // 降级：直接在新窗口打开
            window.open(url, '_blank');
        });
}

function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('图片链接已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        try {
            document.execCommand('copy');
            showToast('图片链接已复制到剪贴板');
        } catch (e) {
            showToast('复制失败，请手动复制');
        }
        document.body.removeChild(input);
    });
}

function openInNewTab(url) {
    window.open(url, '_blank');
}

function showToast(message) {
    // 创建 toast 提示
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 212, 255, 0.9);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 2000);
}

// 添加 toast 动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(toastStyle);

// ==================== 主要功能：生成图像 ====================
async function generateImage() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const prompt = document.getElementById('prompt').value.trim();
    const baseUrl = document.getElementById('baseUrl').value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const model = document.getElementById('model').value.trim();
    
    // 验证输入
    if (!apiKey) {
        showStatus('请输入 API Key', 'error');
        document.getElementById('apiKey').focus();
        return;
    }
    
    if (!prompt) {
        showStatus('请输入图像描述', 'error');
        document.getElementById('prompt').focus();
        return;
    }
    
    // 保存到历史
    addToHistory(prompt);
    
    // 更新 UI 状态
    setButtonLoading(true);
    showStatus('正在连接 Grok 生成图像，请稍候...', 'loading');
    showLoadingState();
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                stream: false
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // 显示调试信息
        document.getElementById('debugContent').textContent = JSON.stringify(data, null, 2);
        
        // 解析并显示图像
        parseAndDisplayImages(data, baseUrl);
        
    } catch (error) {
        console.error('Error:', error);
        showStatus(`生成失败: ${error.message}`, 'error');
        showErrorState(error.message);
    } finally {
        setButtonLoading(false);
    }
}

// ==================== 解析和显示图像 ====================
function parseAndDisplayImages(data, baseUrl) {
    const container = document.getElementById('outputContent');
    const countEl = document.getElementById('imageCount');
    
    let content = '';
    
    // 提取内容
    if (data.choices && data.choices[0]) {
        if (data.choices[0].message) {
            content = data.choices[0].message.content;
        } else if (data.choices[0].text) {
            content = data.choices[0].text;
        }
    }
    
    if (!content) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🤔</div>
                <div class="empty-state-text">未能获取响应内容</div>
            </div>
        `;
        showStatus('未能从响应中提取内容', 'error');
        return;
    }
    
    console.log('Response content:', content);
    
    // 收集所有图片 URL
    let images = [];
    
    // 1. 解析 Markdown 图片格式: ![alt](url)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(content)) !== null) {
        let url = match[2].trim();
        // 处理相对路径
        if (url.startsWith('/')) {
            url = baseUrl.replace(/\/$/, '') + url;
        }
        images.push({
            alt: match[1] || 'Generated Image',
            url: url
        });
    }
    
    // 2. 如果没找到 Markdown 格式，尝试匹配纯 URL
    if (images.length === 0) {
        // 匹配常见图片 URL
        const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`\[\]]+?\.(?:png|jpg|jpeg|gif|webp|PNG|JPG|JPEG|GIF|WEBP))(?:\?[^\s<>"']*)?/gi;
        while ((match = urlRegex.exec(content)) !== null) {
            images.push({
                alt: 'Generated Image',
                url: match[0]
            });
        }
    }
    
    // 3. 检查缓存的图片路径 (如 /images/xxx.png)
    if (images.length === 0) {
        const cachedPathRegex = /(?:["'\s]|^)(\/(?:images|cache|files|uploads|static)\/[^\s<>"'{}|\\^`\[\]]+\.(?:png|jpg|jpeg|gif|webp))(?:["'\s]|$)/gi;
        while ((match = cachedPathRegex.exec(content)) !== null) {
            const fullUrl = baseUrl.replace(/\/$/, '') + match[1];
            images.push({
                alt: 'Cached Image',
                url: fullUrl
            });
        }
    }
    
    // 4. 尝试匹配任何看起来像图片路径的内容
    if (images.length === 0) {
        const anyPathRegex = /(?:https?:\/\/[^\s]+|\/[^\s]+)\.(?:png|jpg|jpeg|gif|webp)/gi;
        while ((match = anyPathRegex.exec(content)) !== null) {
            let url = match[0];
            if (url.startsWith('/')) {
                url = baseUrl.replace(/\/$/, '') + url;
            }
            if (!images.find(img => img.url === url)) {
                images.push({
                    alt: 'Image',
                    url: url
                });
            }
        }
    }
    
    // 去重
    images = images.filter((img, index, self) => 
        index === self.findIndex(t => t.url === img.url)
    );
    
    console.log('Found images:', images);
    
    // 如果没有找到图片
    if (images.length === 0) {
        container.innerHTML = `
            <div class="text-response">
                <div class="text-response-header">
                    <span style="font-size: 24px;">📝</span>
                    <span>未检测到图片，以下是文本响应：</span>
                </div>
                <div class="text-response-content">${formatTextContent(content)}</div>
            </div>
        `;
        showStatus('响应中未包含图片', 'error');
        return;
    }
    
    // 显示图片数量
    countEl.textContent = `${images.length} 张图片`;
    countEl.style.display = 'block';
    
    // 创建图片网格
    container.innerHTML = `<div class="image-grid" id="imageGrid"></div>`;
    const grid = document.getElementById('imageGrid');
    
    // 渲染每张图片
    images.forEach((img, index) => {
        const card = createImageCard(img, index);
        grid.appendChild(card);
    });
    
    showStatus(`成功生成 ${images.length} 张图片！`, 'success');
}

// ==================== 创建图片卡片 ====================
function createImageCard(img, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    const safeUrl = escapeAttr(img.url);
    const filename = `grok_image_${index + 1}_${Date.now()}`;
    
    card.innerHTML = `
        <div class="image-wrapper">
            <div class="image-loading" id="loading-${index}">
                <div class="spinner large-spinner"></div>
                <div>加载中...</div>
            </div>
            <div class="image-number">#${index + 1}</div>
            <img 
                src="${safeUrl}" 
                alt="${escapeAttr(img.alt)}"
                onload="handleImageLoad(this, ${index})"
                onerror="handleImageError(this, ${index})"
            >
        </div>
        <div class="image-actions">
            <button onclick="downloadImage('${safeUrl}', '${filename}')">
                💾 下载
            </button>
            <button onclick="copyImageUrl('${safeUrl}')">
                📋 复制链接
            </button>
            <button onclick="openInNewTab('${safeUrl}')">
                🔍 查看原图
            </button>
        </div>
    `;
    
    return card;
}

// ==================== 图片加载处理 ====================
function handleImageLoad(imgElement, index) {
    // 隐藏加载动画
    const loading = document.getElementById(`loading-${index}`);
    if (loading) {
        loading.style.display = 'none';
    }
    // 显示图片
    imgElement.classList.add('loaded');
}

function handleImageError(imgElement, index) {
    const loading = document.getElementById(`loading-${index}`);
    if (loading) {
        loading.innerHTML = `
            <div style="color: #ff4757; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
                <div>图片加载失败</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">点击下方按钮查看原图</div>
            </div>
        `;
    }
}

// ==================== 格式化文本内容 ====================
function formatTextContent(content) {
    // 转义 HTML
    let formatted = escapeHtml(content);
    
    // 转换 Markdown 链接为可点击链接
    formatted = formatted.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g, 
        '<a href="$2" target="_blank" style="color: #00d4ff;">$1</a>'
    );
    
    // 转换纯 URL 为可点击链接
    formatted = formatted.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" style="color: #00d4ff; word-break: break-all;">$1</a>'
    );
    
    // 转换换行
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// ==================== 清除历史 ====================
function clearHistory() {
    promptHistory = [];
    localStorage.removeItem('grokPromptHistory');
    updateHistoryUI();
    showToast('历史记录已清除');
}

// ==================== 导出功能（可选）====================
function exportImages() {
    const images = document.querySelectorAll('.image-card img.loaded');
    if (images.length === 0) {
        showToast('没有可导出的图片');
        return;
    }
    
    images.forEach((img, index) => {
        setTimeout(() => {
            downloadImage(img.src, `grok_export_${index + 1}`);
        }, index * 500); // 间隔下载避免浏览器阻止
    });
}
