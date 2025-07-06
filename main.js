let currentStep = 1;
let exportData = null;
let sections = [];
let errors = [];
let metadataIndex = null;
let selectedFramework = 'cf'; // default

document.addEventListener('DOMContentLoaded', () => {
    setupFrameworkSelect();
    setupPasteArea();
    setupGenerateButton();
    setupCopyButton();
    setupDownloadButton();
    updateProgress();
});

function setupFrameworkSelect() {
    const frameworkSelect = document.getElementById('frameworkSelect');
    frameworkSelect.addEventListener('change', (e) => {
        selectedFramework = e.target.value;
        metadataIndex = null; // force reload
        // If already on step 2, reload sections with new framework
        if (currentStep === 2) {
            handlePasteData(document.getElementById('pasteInput').value.trim());
        }
    });
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    progressFill.className = `progress-fill step-${currentStep}`;
}

function goToStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
}

function resetToStep1() {
    exportData = null;
    sections = [];
    errors = [];
    document.getElementById('pasteInput').value = '';
    document.getElementById('processBtn').disabled = true;
    clearErrors();
    goToStep(1);
}

function setupPasteArea() {
    const pasteInput = document.getElementById('pasteInput');
    const processBtn = document.getElementById('processBtn');
    pasteInput.addEventListener('input', (e) => {
        const hasContent = e.target.value.trim().length > 0;
        processBtn.disabled = !hasContent;
    });
    processBtn.addEventListener('click', () => {
        const data = pasteInput.value.trim();
        if (data) handlePasteData(data);
    });
    pasteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            processBtn.click();
        }
    });
    const pasteArea = document.getElementById('pasteArea');
    pasteArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pasteArea.classList.add('dragover');
    });
    pasteArea.addEventListener('dragleave', () => {
        pasteArea.classList.remove('dragover');
    });
    pasteArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pasteArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                pasteInput.value = e.target.result;
                processBtn.disabled = false;
            };
            reader.readAsText(file);
        }
    });
}

async function loadMetadataIndex() {
    if (metadataIndex) return metadataIndex;
    const url = 'local-metadata-index.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load metadata index');
    metadataIndex = await response.json();
    return metadataIndex;
}

function handlePasteData(data) {
    clearErrors();
    let sectionNames = [];
    try {
        if (data.trim().startsWith('[')) {
            sectionNames = JSON.parse(data);
        } else {
            sectionNames = data.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(sectionNames) || sectionNames.length === 0) throw new Error('No section names found');
    } catch (error) {
        addError(1, `Invalid section names: ${error.message}`);
        return;
    }
    loadMetadataIndex().then(async meta => {
        const fwMeta = meta.frameworks[selectedFramework];
        if (!fwMeta) {
            addError(1, `Framework "${selectedFramework}" not found in metadata index.`);
            return;
        }
        sections = sectionNames.map(name => {
            let found = null;
            for (const category in fwMeta) {
                if (fwMeta[category][name]) {
                    found = fwMeta[category][name];
                    return {
                        name,
                        category,
                        defaultClass: found.defaultClass,
                        customClass: '',
                        relativePath: found.relativePath,
                        originalClass: ''
                    };
                }
            }
            addError(1, `Section "${name}" not found in metadata index for framework "${selectedFramework}".`);
            return {
                name,
                category: '',
                defaultClass: '',
                customClass: '',
                relativePath: '',
                originalClass: ''
            };
        });
        await Promise.all(sections.map(async (section) => {
            if (section.relativePath) {
                try {
                    const resp = await fetch(section.relativePath);
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.globalClasses && data.globalClasses.length > 0) {
                            const match = data.globalClasses[0].name.match(/^([a-zA-Z0-9-]+)/);
                            section.originalClass = match ? match[1] : data.globalClasses[0].name;
                        }
                    }
                } catch (e) {
                    section.originalClass = section.defaultClass || '';
                }
            } else {
                section.originalClass = section.defaultClass || '';
            }
        }));
        showSections();
        goToStep(2);
    }).catch(err => {
        addError(1, `Failed to load metadata: ${err.message}`);
    });
}

function showSections() {
    document.getElementById('sectionsContainer').style.display = 'block';
    document.getElementById('generateBtn').disabled = false;
    const grid = document.getElementById('sectionsGrid');
    grid.innerHTML = sections.map((section, index) => createSectionCard(section, index)).join('');
    setupDragAndDrop();
}

function createSectionCard(section, index) {
    const categoryIcon = getCategoryIcon(section.category);
    return `
        <div class="section-card" data-index="${index}" draggable="true">
            <div class="section-order">${index + 1}</div>
            <div class="section-header">
                <div class="section-icon">${categoryIcon}</div>
                <div class="section-info">
                    <div class="section-name">${section.name}</div>
                    <div class="section-category">${section.category}</div>
                </div>
                <div class="drag-handle">⋮⋮</div>
            </div>
            <div class="section-input">
                <label class="input-label">Class Name (Original: ${section.originalClass || ''})</label>
                <input 
                    type="text" 
                    class="input-field" 
                    value="${section.customClass || section.originalClass || ''}"
                    onchange="updateSectionClass(${index}, this.value)"
                    placeholder="Enter new class name..."
                >
            </div>
        </div>
    `;
}

function getCategoryIcon(category) {
    const icons = {
        'banner': '🎪',
        'blog': '📝',
        'cart': '🛒',
        'category-filters': '🔎',
        'checkout': '💳',
        'coming-soon': '⏳',
        'content': '📄',
        'cta': '🎯',
        'dashboard': '📊',
        'error': '❌',
        'event': '🎫',
        'faq': '❓',
        'feature': '✨',
        'footer': '🔗',
        'gallery': '🖼️',
        'headers': '📋',
        'hero': '⭐',
        'intro': '🚀',
        'link': '🔗',
        'login': '🔐',
        'logo': '🖍️',
        'megamenu': '📚',
        'offcanvas': '🧾',
        'popup': '💬',
        'portfolio': '🎨',
        'pricing': '💰',
        'products': '📦',
        'single-portfolio': '🎭',
        'single-post': '📰',
        'single-post-hero': '🏆',
        'single-product': '🛍️',
        'team': '👥',
        'testimonial': '💬',
        'timeline': '⏱️',
    };
    return icons[category] || icons[category && category.toLowerCase()] || '📄';
}

function updateSectionClass(index, className) {
    sections[index].customClass = className;
}

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.section-card');
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.index);
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });
    const grid = document.getElementById('sectionsGrid');
    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingCard = document.querySelector('.dragging');
        const cards = [...grid.querySelectorAll('.section-card:not(.dragging)')];
        const afterCard = cards.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (afterCard == null) {
            grid.appendChild(draggingCard);
        } else {
            grid.insertBefore(draggingCard, afterCard);
        }
    });
    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        updateSectionOrder();
    });
}

function updateSectionOrder() {
    const cards = document.querySelectorAll('.section-card');
    const newSections = [];
    cards.forEach((card, index) => {
        const oldIndex = parseInt(card.dataset.index);
        newSections.push({ ...sections[oldIndex], order: index + 1 });
        card.dataset.index = index;
        card.querySelector('.section-order').textContent = index + 1;
    });
    sections = newSections;
}

function setupGenerateButton() {
    document.getElementById('generateBtn').addEventListener('click', generateBricksJSON);
}

async function generateBricksJSON() {
    clearErrors();
    try {
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span>⏳</span> Fetching sections...';
        const combinedSections = [];
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionData = await fetchSectionData(section);
            if (sectionData) {
                let originalClass = '';
                if (sectionData.globalClasses && sectionData.globalClasses.length > 0) {
                    const match = sectionData.globalClasses[0].name.match(/^([a-zA-Z0-9-]+)/);
                    originalClass = match ? match[1] : sectionData.globalClasses[0].name;
                }
                section.originalClass = originalClass;
                if (!section.customClass) section.customClass = originalClass;
                const updatedSectionData = replaceCSSClasses(sectionData, section.customClass, section.originalClass);
                combinedSections.push(updatedSectionData);
            }
            generateBtn.innerHTML = `<span>⏳</span> Processing ${i + 1}/${sections.length} sections...`;
        }
        let output;
        if (combinedSections.length === 1) {
            output = combinedSections[0];
        } else {
            const mergedOutput = {
                content: [],
                globalClasses: [],
                globalElements: [],
                source: "bricksCopiedElements",
                sourceUrl: "https://cf.brixies.co",
                version: "1.9.9"
            };
            combinedSections.forEach(section => {
                if (section.content) mergedOutput.content.push(...section.content);
                if (section.globalClasses) mergedOutput.globalClasses.push(...section.globalClasses);
                if (section.globalElements) mergedOutput.globalElements.push(...section.globalElements);
            });
            output = mergedOutput;
        }
        const outputJson = document.getElementById('outputJson');
        outputJson.textContent = JSON.stringify(output, null, 2);
        document.getElementById('outputSection').style.display = 'block';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>🎯</span> Generate Bricks JSON';
        goToStep(3);
    } catch (error) {
        console.error('Error generating JSON:', error);
        addError(2, `Failed to generate JSON: ${error.message}`);
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>🎯</span> Generate Bricks JSON';
    }
}

async function fetchSectionData(section) {
    try {
        if (!section.relativePath) {
            throw new Error(`No relativePath for section: ${section.name}`);
        }
        // Encode only the filename part, not the entire path
        const encodedPath = section.relativePath
            .split('/')
            .map((part, i, arr) => (i === arr.length - 1 ? encodeURIComponent(part) : part))
            .join('/');
        const response = await fetch(encodedPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${section.name}: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching section ${section.name}:`, error);
        addError(2, `Failed to fetch section \"${section.name}\": ${error.message}`);
        return null;
    }
}

// Helper: Map class names to IDs in globalClasses
function mapCssGlobalClassesToIds(content, globalClasses) {
    const nameToId = {};
    globalClasses.forEach(cls => {
        if (cls.name) nameToId[cls.name] = cls.id;
    });
    function remap(node) {
        if (node && typeof node === 'object') {
            if (node.settings && Array.isArray(node.settings._cssGlobalClasses)) {
                node.settings._cssGlobalClasses = node.settings._cssGlobalClasses
                    .map(name => nameToId[name] || name)
                    .filter(Boolean);
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(childId => {}); // No-op, handled by recursion
            }
            for (const key in node) {
                if (typeof node[key] === 'object' && node[key] !== null) {
                    remap(node[key]);
                }
            }
        }
    }
    content.forEach(remap);
}

// Helper: Extract root from a class name (e.g., 'feature-17' from 'feature-17__arrow-left')
function extractRoot(className) {
    const match = className.match(/^([a-zA-Z0-9-]+)/);
    return match ? match[1] : className;
}

// Helper: Replace root in a class name with a new prefix
function replaceRoot(className, newRoot) {
    const root = extractRoot(className);
    return className.replace(root, newRoot);
}

// Helper: Generate a unique ID for a class name
function generateClassId(className) {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
        hash = ((hash << 5) - hash) + className.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).slice(0, 6);
}

// Main function to rename classes and update IDs for Bricks export
function semanticRenameAndRemap(content, globalClasses, prefix) {
    // 1. Build mapping: old class name -> new class name (with prefix)
    const classNameMap = {};
    globalClasses.forEach(cls => {
        const newName = replaceRoot(cls.name, prefix);
        classNameMap[cls.name] = newName;
    });
    // 2. Build mapping: new class name -> new ID
    const newNameToId = {};
    Object.values(classNameMap).forEach(newName => {
        newNameToId[newName] = generateClassId(newName);
    });
    // 3. Build mapping: old class name -> new ID
    const classNameToId = {};
    Object.entries(classNameMap).forEach(([oldName, newName]) => {
        classNameToId[oldName] = newNameToId[newName];
    });
    // 4. Create new globalClasses array with renamed classes and new IDs
    const newGlobalClasses = globalClasses.map(cls => {
        const newName = classNameMap[cls.name];
        return {
            ...cls,
            id: newNameToId[newName],
            name: newName
        };
    });
    // 5. Remap _cssGlobalClasses in content to new IDs
    function remap(node) {
        if (node && typeof node === 'object') {
            if (node.settings && Array.isArray(node.settings._cssGlobalClasses)) {
                node.settings._cssGlobalClasses = node.settings._cssGlobalClasses
                    .map(name => classNameToId[name] || name)
                    .filter(Boolean);
            }
            if (Array.isArray(node.children)) {
                node.children.forEach(childId => {}); // No-op, handled by recursion
            }
            for (const key in node) {
                if (typeof node[key] === 'object' && node[key] !== null) {
                    remap(node[key]);
                }
            }
        }
    }
    content.forEach(remap);
    return { content, globalClasses: newGlobalClasses };
}

