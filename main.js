let currentStep = 1;
let exportData = null;
let sections = [];
let errors = [];
let metadataIndex = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupPasteArea();
    setupGenerateButton();
    setupCopyButton();
    setupDownloadButton();
    updateProgress();
});

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    progressFill.className = `progress-fill step-${currentStep}`;
}

function goToStep(step) {
    // Hide current step
    document.getElementById(`step${currentStep}`).classList.remove('active');
    
    // Show new step
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    
    updateProgress();
}

function resetToStep1() {
    // Reset all data
    exportData = null;
    sections = [];
    errors = [];
    
    // Clear inputs
    document.getElementById('pasteInput').value = '';
    document.getElementById('processBtn').disabled = true;
    
    // Clear errors
    clearErrors();
    
    // Go to step 1
    goToStep(1);
}

function setupPasteArea() {
    const pasteInput = document.getElementById('pasteInput');
    const processBtn = document.getElementById('processBtn');

    // Handle textarea input to enable/disable process button
    pasteInput.addEventListener('input', (e) => {
        const hasContent = e.target.value.trim().length > 0;
        processBtn.disabled = !hasContent;
    });

    // Handle process button click
    processBtn.addEventListener('click', () => {
        const data = pasteInput.value.trim();
        if (data) {
            handlePasteData(data);
        }
    });

    // Handle Enter key in textarea
    pasteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            processBtn.click();
        }
    });

    // Handle drag and drop
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
    const url = 'https://raw.githubusercontent.com/ZMDx4/brixies-sections-data-cf/main/metadata-index.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load metadata index from GitHub');
    metadataIndex = await response.json();
    return metadataIndex;
}

function handlePasteData(data) {
    clearErrors();
    // Accept either JSON array or newline-separated list
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
    // Load metadata and map names
    loadMetadataIndex().then(async meta => {
        sections = sectionNames.map(name => {
            let found = null;
            for (const category in meta.sections) {
                if (meta.sections[category][name]) {
                    found = meta.sections[category][name];
                    return {
                        name,
                        category,
                        defaultClass: found.defaultClass,
                        customClass: '',
                        remoteUrl: found.remoteUrl,
                        originalClass: '' // will be set after fetch
                    };
                }
            }
            addError(1, `Section "${name}" not found in metadata index.`);
            return {
                name,
                category: '',
                defaultClass: '',
                customClass: '',
                remoteUrl: '',
                originalClass: ''
            };
        });
        // Fetch all section data and set originalClass
        await Promise.all(sections.map(async (section) => {
            if (section.remoteUrl) {
                try {
                    const resp = await fetch(section.remoteUrl);
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.globalClasses && data.globalClasses.length > 0) {
                            const match = data.globalClasses[0].name.match(/^([a-zA-Z0-9-]+)/);
                            section.originalClass = match ? match[1] : data.globalClasses[0].name;
                        }
                    }
                } catch (e) {
                    // If fetch fails, fallback to defaultClass
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
        'Header': '📋',
        'Hero': '⭐',
        'Portfolio': '🎨',
        'Contact': '📞',
        'About': 'ℹ️',
        'Testimonial': '💬',
        'Pricing': '💰',
        'Footer': '🔗',
        'Feature': '✨',
        'CTA': '🎯',
        'Banner Section': '🎪',
        'Blog Sections': '📝',
        'Other': '📄'
    };
    return icons[category] || '📄';
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
                // Extract the true original class name from the section data
                let originalClass = '';
                if (sectionData.globalClasses && sectionData.globalClasses.length > 0) {
                    const match = sectionData.globalClasses[0].name.match(/^([a-zA-Z0-9-]+)/);
                    originalClass = match ? match[1] : sectionData.globalClasses[0].name;
                }
                section.originalClass = originalClass;
                // If the user hasn't changed the class, set the input to the original
                if (!section.customClass) section.customClass = originalClass;
                // Replace CSS classes using the true original class
                const updatedSectionData = replaceCSSClasses(sectionData, section.customClass, section.originalClass);
                combinedSections.push(updatedSectionData);
            }
            generateBtn.innerHTML = `<span>⏳</span> Processing ${i + 1}/${sections.length} sections...`;
        }
        let output;
        if (combinedSections.length === 1) {
            output = combinedSections[0]; // single object for single section
        } else {
            output = combinedSections; // array for multiple sections
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
        if (!section.remoteUrl) {
            throw new Error(`No remoteUrl for section: ${section.name}`);
        }
        const url = section.remoteUrl;
        console.log(`Fetching: ${url}`);
        console.log(`Section: ${section.name}, Category: ${section.category}, Custom Class: ${section.customClass || section.suggestedClass}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${section.name}: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching section ${section.name}:`, error);
        addError(2, `Failed to fetch section "${section.name}": ${error.message}`);
        return null;
    }
}

function mapSectionNameToFilename(sectionName, category) {
    // Convert section name to the actual filename format used in the repository
    let filename = sectionName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    
    // Add category-specific prefixes if needed
    switch (category.toLowerCase()) {
        case 'header':
            if (!filename.startsWith('header-')) {
                filename = `header-${filename}`;
            }
            break;
        case 'hero':
            if (!filename.startsWith('hero-')) {
                filename = `hero-${filename}`;
            }
            break;
        case 'feature':
            if (!filename.startsWith('feature-')) {
                filename = `feature-${filename}`;
            }
            break;
        case 'portfolio':
            if (!filename.startsWith('portfolio-')) {
                filename = `portfolio-${filename}`;
            }
            break;
        case 'cta':
            if (!filename.startsWith('cta-')) {
                filename = `cta-${filename}`;
            }
            break;
        case 'footer':
            if (!filename.startsWith('footer-')) {
                filename = `footer-${filename}`;
            }
            break;
        case 'testimonial':
            if (!filename.startsWith('testimonial-')) {
                filename = `testimonial-${filename}`;
            }
            break;
        case 'pricing':
            if (!filename.startsWith('pricing-')) {
                filename = `pricing-${filename}`;
            }
            break;
        case 'contact':
            if (!filename.startsWith('contact-')) {
                filename = `contact-${filename}`;
            }
            break;
        case 'about':
            if (!filename.startsWith('about-')) {
                filename = `about-${filename}`;
            }
            break;
    }
    
    return filename;
}

function mapCategoryToFolder(category) {
    // Map category names to actual folder names in the repository
    const categoryMap = {
        'header': 'headers',
        'hero': 'heroes',
        'feature': 'features',
        'portfolio': 'portfolios',
        'cta': 'ctas',
        'footer': 'footers',
        'testimonial': 'testimonials',
        'pricing': 'pricing',
        'contact': 'contacts',
        'about': 'abouts',
        'blog sections': 'blogs',
        'content': 'content',
        'gallery': 'galleries',
        'faq': 'faqs',
        'event': 'events',
        'logo': 'logos',
        'megamenu': 'megamenus',
        'offcanvas': 'offcanvas',
        'popup': 'popups',
        'single portfolio': 'single-portfolios',
        'single post': 'single-posts',
        'single product': 'single-products',
        'product': 'products',
        'team': 'teams',
        'timeline': 'timelines',
        'banner section': 'banners',
        'cart page': 'cart-pages',
        'checkout page': 'checkout-pages',
        'coming soon': 'coming-soon',
        'dashboard page': 'dashboard-pages',
        'error page': 'error-pages',
        'link page': 'link-pages',
        'login page': 'login-pages',
        'category filter': 'category-filters'
    };
    
    return categoryMap[category.toLowerCase()] || category.toLowerCase().replace(/\s+/g, '-');
}

function replaceCSSClasses(sectionData, newClassName, originalClass) {
    const updatedData = JSON.parse(JSON.stringify(sectionData));
    function generateUniqueId(className) {
        let hash = 0;
        for (let i = 0; i < className.length; i++) {
            hash = ((hash << 5) - hash) + className.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36).slice(0, 6);
    }
    // Create mapping from old IDs to new IDs
    const idMapping = {};
    // Replace CSS classes in globalClasses array and generate new IDs
    if (updatedData.globalClasses && Array.isArray(updatedData.globalClasses)) {
        updatedData.globalClasses.forEach(globalClass => {
            if (globalClass.name) {
                const oldId = globalClass.id;
                const oldName = globalClass.name;
                // Replace only the root class (originalClass) with newClassName
                let newName = oldName;
                if (oldName.startsWith(originalClass)) {
                    const suffix = oldName.substring(originalClass.length);
                    newName = newClassName + suffix;
                }
                // Handle prefixed classes (e.g., card-feature-17)
                const prefixMatch = oldName.match(new RegExp(`^([a-zA-Z]+)-${originalClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
                if (prefixMatch) {
                    const prefix = prefixMatch[1];
                    const suffix = oldName.substring(prefixMatch[0].length);
                    newName = `${prefix}-${newClassName}${suffix}`;
                }
                globalClass.name = newName;
                const newId = generateUniqueId(newName);
                globalClass.id = newId;
                idMapping[oldId] = newId;
            }
        });
    }
    // Replace CSS classes in content array and update IDs
    if (updatedData.content && Array.isArray(updatedData.content)) {
        updatedData.content.forEach(item => {
            if (item.settings && item.settings._cssGlobalClasses) {
                item.settings._cssGlobalClasses = item.settings._cssGlobalClasses.map(oldId => {
                    return idMapping[oldId] || oldId;
                });
            }
        });
    }
    // Update JavaScript code and CSS custom code if they contain class references
    if (updatedData.content) {
        updatedData.content.forEach(item => {
            if (item.settings) {
                if (item.settings.javascriptCode) {
                    item.settings.javascriptCode = item.settings.javascriptCode.replace(
                        new RegExp(`\\.${originalClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                        `.${newClassName}`
                    );
                }
                if (item.settings._cssCustom) {
                    item.settings._cssCustom = item.settings._cssCustom.replace(
                        new RegExp(`\\.${originalClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                        `.${newClassName}`
                    );
                }
            }
        });
    }
    // Also update CSS custom code in globalClasses
    if (updatedData.globalClasses && Array.isArray(updatedData.globalClasses)) {
        updatedData.globalClasses.forEach(globalClass => {
            if (globalClass.settings && globalClass.settings._cssCustom) {
                globalClass.settings._cssCustom = globalClass.settings._cssCustom.replace(
                    new RegExp(`\\.${originalClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                    `.${newClassName}`
                );
            }
        });
    }
    return updatedData;
}

function setupCopyButton() {
    document.getElementById('copyBtn').addEventListener('click', () => {
        const jsonText = document.getElementById('outputJson').textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(jsonText).then(() => {
                showSuccess('JSON copied to clipboard!');
            }).catch(() => {
                fallbackCopyTextToClipboard(jsonText);
            });
        } else {
            fallbackCopyTextToClipboard(jsonText);
        }
    });
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showSuccess('JSON copied to clipboard!');
    } catch (err) {
        addError(3, 'Failed to copy to clipboard. Please select and copy manually.');
    }
    
    document.body.removeChild(textArea);
}

function setupDownloadButton() {
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const jsonText = document.getElementById('outputJson').textContent;
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `brixies-export-${exportData.exportId}.json`; // exportData might be null here
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('JSON file downloaded!');
    });
}

function addError(step, message) {
    const errorContainer = document.getElementById(`step${step}Errors`);
    const errorId = Date.now() + Math.random();
    
    const errorHtml = `
        <div class="error-item" id="error-${errorId}">
            <div class="error-message">${message}</div>
            <button class="error-close" onclick="removeError('${errorId}')">×</button>
        </div>
    `;
    
    errorContainer.insertAdjacentHTML('beforeend', errorHtml);
    errors.push({ id: errorId, step, message });
}

function removeError(errorId) {
    const errorElement = document.getElementById(`error-${errorId}`);
    if (errorElement) {
        errorElement.remove();
        errors = errors.filter(error => error.id !== errorId);
    }
}

function clearErrors() {
    document.querySelectorAll('.error-item').forEach(item => item.remove());
    errors = [];
}

function showSuccess(message) {
    // For now, just log success messages
    console.log('Success:', message);
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

// In generateBricksJSON, after merging allContent and allGlobalClasses, before output:
const prefix = classPrefix || (sections[0] && sections[0].customClass ? extractRoot(sections[0].customClass) : 'brixies-section');
const renamed = semanticRenameAndRemap(allContent, allGlobalClasses, prefix);
// Use renamed.content and renamed.globalClasses in the final export
const finalExport = {
    content: renamed.content,
    globalClasses: renamed.globalClasses,
    globalElements: allGlobalElements
};
document.getElementById('outputJson').textContent = JSON.stringify(finalExport, null, 2);
goToStep(3);
generateBtn.disabled = false;
generateBtn.innerHTML = '<span>🎯</span> Generate Bricks JSON';
