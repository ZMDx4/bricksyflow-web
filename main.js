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
    document.getElementById('sectionsContainer').style.display = 'none';
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('generateBtn').disabled = true;
    
    // Re-enable framework selection
    const frameworkSelect = document.getElementById('frameworkSelect');
    frameworkSelect.disabled = false;
    frameworkSelect.parentElement.style.opacity = '1';
    
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
                    // Decode the relative path to handle any URL encoding, then build the raw GitHub URL
                    const decodedPath = decodeURIComponent(section.relativePath);
                    const rawUrl = `https://raw.githubusercontent.com/ZMDx4/brixies-exporter-web/main/${decodedPath}`;
                    const resp = await fetch(rawUrl);
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
        
        // Disable framework selection after processing
        const frameworkSelect = document.getElementById('frameworkSelect');
        frameworkSelect.disabled = true;
        frameworkSelect.parentElement.style.opacity = '0.6';
        
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
}

function createSectionCard(section, index) {
    const categoryIcon = getCategoryIcon(section.category);
    const totalSections = sections.length;
    
    // Determine which arrows to show
    let leftArrow = '';
    let rightArrow = '';
    
    if (index === 0) {
        // First section: only right arrow
        rightArrow = `<button class="order-btn right-btn" onclick="moveSection(${index}, 'right')" title="Move down">→</button>`;
    } else if (index === totalSections - 1) {
        // Last section: only left arrow
        leftArrow = `<button class="order-btn left-btn" onclick="moveSection(${index}, 'left')" title="Move up">←</button>`;
    } else {
        // Middle sections: both arrows
        leftArrow = `<button class="order-btn left-btn" onclick="moveSection(${index}, 'left')" title="Move up">←</button>`;
        rightArrow = `<button class="order-btn right-btn" onclick="moveSection(${index}, 'right')" title="Move down">→</button>`;
    }
    
    return `
        <div class="section-card" data-index="${index}">
            <div class="section-order">${index + 1}</div>
            <div class="section-header">
                <div class="section-icon">${categoryIcon}</div>
                <div class="section-info">
                    <div class="section-name">${section.name}</div>
                    <div class="section-category">${section.category}</div>
                </div>
                <div class="order-controls">
                    ${leftArrow}
                    ${rightArrow}
                </div>
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

function moveSection(index, direction) {
    if (direction === 'left' && index > 0) {
        // Move section up (swap with previous)
        [sections[index], sections[index - 1]] = [sections[index - 1], sections[index]];
    } else if (direction === 'right' && index < sections.length - 1) {
        // Move section down (swap with next)
        [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
    }
    
    // Re-render the sections grid with updated order
    const grid = document.getElementById('sectionsGrid');
    grid.innerHTML = sections.map((section, idx) => createSectionCard(section, idx)).join('');
}

// Drag and drop functionality removed - replaced with arrow controls

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
                const { content: updatedContent, globalClasses: updatedGlobalClasses } = semanticRenameAndRemap(sectionData.content, sectionData.globalClasses, section.customClass);
                const updatedSectionData = {
                    ...sectionData,
                    content: updatedContent,
                    globalClasses: updatedGlobalClasses
                };
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
            combinedSections.forEach((section, index) => {
                        console.log(`Section ${index + 1}: ${section.globalClasses ? section.globalClasses.length : 0} global classes`);
        if (section.content) mergedOutput.content.push(...section.content);
        if (section.globalClasses) {
            console.log(`Section ${index + 1} global classes with settings:`, section.globalClasses.filter(cls => cls.settings).length);
            mergedOutput.globalClasses.push(...section.globalClasses);
        }
        if (section.globalElements) mergedOutput.globalElements.push(...section.globalElements);
            });
            console.log(`Total merged: ${mergedOutput.globalClasses.length} global classes`);
            output = mergedOutput;
        }
        const outputJson = document.getElementById('outputJson');
        const jsonString = JSON.stringify(output, null, 2);
        console.log('Generated JSON length:', jsonString.length);
        console.log('Global classes count:', output.globalClasses ? output.globalClasses.length : 0);
        
        // Debug: Check the structure of the first few global classes
        if (output.globalClasses && output.globalClasses.length > 0) {
            console.log('First global class structure:', JSON.stringify(output.globalClasses[0], null, 2));
            console.log('Global classes with settings:', output.globalClasses.filter(cls => cls.settings).length);
            console.log('Global classes without settings:', output.globalClasses.filter(cls => !cls.settings).length);
        }
        
        outputJson.textContent = jsonString;
        document.getElementById('outputSection').style.display = 'block';
        
        // Add download functionality
        const downloadBtn = document.getElementById('downloadJson');
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'bricks-export.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
            downloadBtn.style.display = 'inline-block';
        }
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
        // Decode the relative path to handle any URL encoding, then build the raw GitHub URL
        const decodedPath = decodeURIComponent(section.relativePath);
        const rawUrl = `https://raw.githubusercontent.com/ZMDx4/brixies-exporter-web/main/${decodedPath}`;
        console.log(`Fetching: ${rawUrl}`);
        console.log(`Section: ${section.name}, Category: ${section.category}, Custom Class: ${section.customClass || section.suggestedClass}`);
        const response = await fetch(rawUrl);
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
        const newClass = {
            ...cls,
            id: newNameToId[newName],
            name: newName
        };
        console.log(`Renamed class: ${cls.name} -> ${newName}, ID: ${cls.id} -> ${newNameToId[newName]}, has settings: ${!!cls.settings}`);
        return newClass;
    });

    // 5. Update content to reference new class IDs
    const updatedContent = content.map(item => {
        if (item.settings && item.settings._cssGlobalClasses) {
            const updatedItem = { ...item };
            updatedItem.settings = { ...item.settings };
            updatedItem.settings._cssGlobalClasses = item.settings._cssGlobalClasses.map(oldId => {
                // Find the original class by ID
                const originalClass = globalClasses.find(cls => cls.id === oldId);
                if (originalClass) {
                    const newName = classNameMap[originalClass.name];
                    return newNameToId[newName];
                }
                return oldId; // Fallback if not found
            });
            console.log(`Updated content item ${item.id}: ${item.settings._cssGlobalClasses.join(',')} -> ${updatedItem.settings._cssGlobalClasses.join(',')}`);
            return updatedItem;
        }
        return item;
    });
    return { content: updatedContent, globalClasses: newGlobalClasses };
}

function setupCopyButton() {
    document.getElementById('copyBtn').addEventListener('click', () => {
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.innerHTML;
        const jsonText = document.getElementById('outputJson').textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(jsonText).then(() => {
                // Change button text to show success
                copyBtn.innerHTML = '<span>✅</span> JSON Copied!';
                copyBtn.style.background = '#48bb78';
                copyBtn.style.cursor = 'default';
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '#667eea';
                    copyBtn.style.cursor = 'pointer';
                }, 2000);
            }).catch(() => {
                fallbackCopyTextToClipboard(jsonText, copyBtn, originalText);
            });
        } else {
            fallbackCopyTextToClipboard(jsonText, copyBtn, originalText);
        }
    });
}

function setupDownloadButton() {
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const jsonText = document.getElementById('outputJson').textContent;
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bricks-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess('Download started!');
    });
}

function clearErrors() {
    const errorBox = document.getElementById('errorBox');
    if (errorBox) errorBox.innerHTML = '';
    errors = [];
}

function addError(level, message) {
    errors.push({ level, message });
    const errorBox = document.getElementById('errorBox');
    if (errorBox) {
        const color = level === 1 ? '#e57373' : '#ffb300';
        const icon = level === 1 ? '❌' : '⚠️';
        const div = document.createElement('div');
        div.className = 'error-message';
        div.style.color = color;
        div.innerHTML = `${icon} ${message}`;
        errorBox.appendChild(div);
    }
}

function showSuccess(message) {
    const successBox = document.getElementById('successBox');
    if (!successBox) return;
    successBox.textContent = message;
    successBox.style.display = 'block';
    setTimeout(() => {
        successBox.style.display = 'none';
    }, 2000);
}

function fallbackCopyTextToClipboard(text, copyBtn, originalText) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        // Change button text to show success
        copyBtn.innerHTML = '<span>✅</span> JSON Copied!';
        copyBtn.style.background = '#48bb78';
        copyBtn.style.cursor = 'default';
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '#667eea';
            copyBtn.style.cursor = 'pointer';
        }, 2000);
    } catch (err) {
        alert('Failed to copy JSON');
    }
    document.body.removeChild(textArea);
}
