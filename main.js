// State
let dirHandle = null;
const openFiles = new Map(); // path -> { handle, content, originalContent, modified }
let activeFilePath = null;
let stackedit = null;

// DOM Elements
const fileTreeEl = document.getElementById('fileTree');
const tabsEl = document.getElementById('tabs');
const editorContainer = document.getElementById('editorContainer');
const emptyState = document.getElementById('emptyState');
const folderNameEl = document.getElementById('folderName');
const statusText = document.getElementById('statusText');
const toastEl = document.getElementById('toast');

// Event Listeners
document.getElementById('openDir').onclick = openDirectory;
document.getElementById('openDirBtn').onclick = openDirectory;
document.getElementById('newFile').onclick = createNewFile;

// Open Directory
async function openDirectory() {
  try {
    dirHandle = await window.showDirectoryPicker();
    folderNameEl.textContent = dirHandle.name;
    await renderFileTree();
    showToast('目录已打开');
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
}

// Render File Tree
async function renderFileTree() {
  fileTreeEl.innerHTML = '';
  await renderDirectory(dirHandle, fileTreeEl, '');
}

async function renderDirectory(handle, parentEl, path) {
  const entries = [];
  for await (const entry of handle.values()) {
    entries.push(entry);
  }
  // Sort: folders first, then alphabetically
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    
    if (entry.kind === 'directory') {
      // Skip hidden folders
      if (entry.name.startsWith('.')) continue;
      
      const folderEl = document.createElement('div');
      folderEl.className = 'folder-item file-item';
      folderEl.innerHTML = `<span class="icon">📁</span><span class="name">${entry.name}</span>`;
      
      const childrenEl = document.createElement('div');
      childrenEl.className = 'folder-children';
      
      folderEl.onclick = (e) => {
        e.stopPropagation();
        childrenEl.classList.toggle('collapsed');
        folderEl.querySelector('.icon').textContent = 
          childrenEl.classList.contains('collapsed') ? '📁' : '📂';
      };
      
      parentEl.appendChild(folderEl);
      parentEl.appendChild(childrenEl);
      await renderDirectory(entry, childrenEl, fullPath);
    } else if (entry.name.endsWith('.md')) {
      const fileEl = document.createElement('div');
      fileEl.className = 'file-item';
      fileEl.dataset.path = fullPath;
      fileEl.innerHTML = `<span class="icon">📄</span><span class="name">${entry.name}</span>`;
      fileEl.onclick = () => openFile(entry, fullPath);
      parentEl.appendChild(fileEl);
    }
  }
}

// Open File
async function openFile(handle, path) {
  // Check if already open
  if (openFiles.has(path)) {
    switchToTab(path);
    return;
  }

  try {
    const file = await handle.getFile();
    const content = await file.text();
    
    openFiles.set(path, {
      handle,
      content,
      originalContent: content,
      modified: false
    });
    
    renderTabs();
    switchToTab(path);
    updateStatus(`已打开: ${handle.name}`);
  } catch (e) {
    console.error(e);
    showToast('打开文件失败');
  }
}

// Render Tabs
function renderTabs() {
  tabsEl.innerHTML = '';
  
  for (const [path, fileData] of openFiles) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === activeFilePath ? ' active' : '');
    tab.dataset.path = path;
    
    const name = path.split('/').pop();
    const modifiedDot = fileData.modified ? '<span class="modified">●</span>' : '';
    
    tab.innerHTML = `
      ${modifiedDot}
      <span class="name">${name}</span>
      <span class="close" title="关闭">×</span>
    `;
    
    tab.querySelector('.name').onclick = () => switchToTab(path);
    tab.querySelector('.close').onclick = (e) => {
      e.stopPropagation();
      closeTab(path);
    };
    
    tabsEl.appendChild(tab);
  }
}

// Switch Tab
function switchToTab(path) {
  activeFilePath = path;
  renderTabs();
  updateFileTreeSelection();
  
  emptyState.style.display = 'none';
  
  const fileData = openFiles.get(path);
  if (fileData) {
    openEditor(fileData.content, path);
  }
}

// Update file tree selection
function updateFileTreeSelection() {
  document.querySelectorAll('.file-tree .file-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === activeFilePath);
  });
}

// Close Tab
async function closeTab(path) {
  const fileData = openFiles.get(path);
  
  if (fileData?.modified) {
    if (!confirm('文件有未保存的更改，确定关闭？')) return;
  }
  
  openFiles.delete(path);
  
  if (activeFilePath === path) {
    const remaining = [...openFiles.keys()];
    if (remaining.length > 0) {
      switchToTab(remaining[remaining.length - 1]);
    } else {
      activeFilePath = null;
      emptyState.style.display = 'flex';
      if (stackedit) {
        stackedit.close();
        stackedit = null;
      }
    }
  }
  
  renderTabs();
  updateFileTreeSelection();
}

// Open Editor
function openEditor(content, path) {
  if (stackedit) {
    stackedit.close();
  }
  
  stackedit = new Stackedit();
  const name = path.split('/').pop();
  
  stackedit.openFile({
    name,
    content: { text: content }
  });
  
  stackedit.on('fileChange', (file) => {
    const fileData = openFiles.get(path);
    if (fileData) {
      fileData.content = file.content.text;
      fileData.modified = fileData.content !== fileData.originalContent;
      renderTabs();
    }
  });
  
  stackedit.on('close', () => {
    // Editor was closed by user
  });
}

// Save File
async function saveFile(path) {
  const fileData = openFiles.get(path);
  if (!fileData || !fileData.modified) return false;
  
  try {
    const writable = await fileData.handle.createWritable();
    await writable.write(fileData.content);
    await writable.close();
    
    fileData.originalContent = fileData.content;
    fileData.modified = false;
    renderTabs();
    
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Save All Modified Files
async function saveAll() {
  let saved = 0;
  for (const path of openFiles.keys()) {
    if (await saveFile(path)) saved++;
  }
  if (saved > 0) {
    showToast(`已保存 ${saved} 个文件`);
    updateStatus('已保存');
  }
}

// Auto-save
setInterval(saveAll, 5000);

// Create New File (supports paths like temp/sub/note.md)
async function createNewFile() {
  if (!dirHandle) {
    showToast('请先打开目录');
    return;
  }
  
  // Request write permission while we still have user activation
  const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    showToast('需要写入权限');
    return;
  }
  
  const input = prompt('文件路径 (例如: note.md 或 temp/sub/note.md)');
  if (!input) return;
  
  // Normalize path and ensure .md extension
  const fullPath = input.replace(/\\/g, '/');
  const parts = fullPath.split('/').filter(p => p);
  const fileName = parts.pop();
  const finalName = fileName.endsWith('.md') ? fileName : fileName + '.md';
  
  try {
    // Navigate/create directories
    let currentDir = dirHandle;
    for (const dir of parts) {
      currentDir = await currentDir.getDirectoryHandle(dir, { create: true });
    }
    
    // Create file in target directory
    const handle = await currentDir.getFileHandle(finalName, { create: true });
    const writable = await handle.createWritable();
    await writable.write('# ' + finalName.replace('.md', '') + '\n');
    await writable.close();
    
    // Build full path for opening
    const filePath = parts.length > 0 
      ? parts.join('/') + '/' + finalName 
      : finalName;
    
    await renderFileTree();
    await openFile(handle, filePath);
    showToast('文件已创建💯');
  } catch (e) {
    console.error(e);
    showToast('创建文件失败💔');
  }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveAll();
  }
});

// Toast Notification
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// Update Status
function updateStatus(text) {
  statusText.textContent = text;
}
