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
    loadMetadataIndex().then(meta => {
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
                        remoteUrl: found.remoteUrl
                    };
                }
            }
            addError(1, `Section "${name}" not found in metadata index.`);
            return {
                name,
                category: '',
                defaultClass: '',
                customClass: '',
                remoteUrl: ''
            };
        });
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
                <label class="input-label">Class Name (Original: ${section.defaultClass})</label>
                <input 
                    type="text" 
                    class="input-field" 
                    value="${section.customClass || section.defaultClass || ''}"
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

        // Fetch all section data from GitHub
        const combinedSections = [];
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const sectionData = await fetchSectionData(section);
            
            if (sectionData) {
                // Replace CSS classes in the section data
                const updatedSectionData = replaceCSSClasses(sectionData, section.customClass || section.defaultClass);
                combinedSections.push(updatedSectionData);
            }
            
            // Update progress
            generateBtn.innerHTML = `<span>⏳</span> Processing ${i + 1}/${sections.length} sections...`;
        }

        // Create the final export - just the section data array
        const finalExport = combinedSections;

        // Display the JSON - each section as a separate object in the array
        const outputJson = document.getElementById('outputJson');
        outputJson.textContent = JSON.stringify(finalExport, null, 2);
        
        document.getElementById('outputSection').style.display = 'block';
        
        // Reset button
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>🎯</span> Generate Bricks JSON';
        
        // Go to step 3
        goToStep(3);
        
    } catch (error) {
        console.error('Error generating JSON:', error);
        addError(2, `Failed to generate JSON: ${error.message}`);
        
        // Reset button
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

function replaceCSSClasses(sectionData, newClassName) {
    // Deep clone the section data
    const updatedData = JSON.parse(JSON.stringify(sectionData));
    
    // Generate unique ID for a class name
    function generateUniqueId(className) {
        let hash = 0;
        for (let i = 0; i < className.length; i++) {
            hash = ((hash << 5) - hash) + className.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36).slice(0, 6);
    }
    
    // Find the original base class from the section data
    let originalBaseClass = null;
    if (sectionData.globalClasses && sectionData.globalClasses.length > 0) {
        // Get the first class name and extract the base class
        const firstClassName = sectionData.globalClasses[0].name;
        const match = firstClassName.match(/^([a-zA-Z0-9-]+)/);
        originalBaseClass = match ? match[1] : firstClassName;
    }
    
    if (!originalBaseClass) {
        console.warn('Could not find original base class, using default');
        originalBaseClass = 'feature-17'; // fallback
    }
    
    // Extract the new base class name
    const newBaseClass = newClassName;
    
    console.log(`Replacing base class: ${originalBaseClass} -> ${newBaseClass}`);
    
    // Function to replace class names while preserving BEM structure
    function replaceClassName(className) {
        if (!className || typeof className !== 'string') return className;
        
        // If the class starts with the original base class, replace it
        if (className.startsWith(originalBaseClass)) {
            const suffix = className.substring(originalBaseClass.length);
            return newBaseClass + suffix;
        }
        
        // Handle prefixed classes (e.g., card-feature-17 -> card-prozy-features-section)
        const prefixMatch = className.match(new RegExp(`^([a-zA-Z]+)-${originalBaseClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        if (prefixMatch) {
            const prefix = prefixMatch[1];
            const suffix = className.substring(prefixMatch[0].length);
            return `${prefix}-${newBaseClass}${suffix}`;
        }
        
        return className;
    }
    
    // Function to recursively replace CSS classes in the data
    function replaceClasses(obj) {
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    // Replace CSS classes in string values
                    if (key === 'cssClasses' || key === 'className' || key === 'class') {
                        obj[key] = replaceClassName(obj[key]);
                    } else if (key === 'content' && typeof obj[key] === 'string') {
                        // Replace CSS classes in content strings
                        obj[key] = obj[key].replace(/class="([^"]*)"/g, (match, classNames) => {
                            const newClassNames = classNames.split(' ').map(cls => replaceClassName(cls)).join(' ');
                            return `class="${newClassNames}"`;
                        });
                        obj[key] = obj[key].replace(/class='([^']*)'/g, (match, classNames) => {
                            const newClassNames = classNames.split(' ').map(cls => replaceClassName(cls)).join(' ');
                            return `class='${newClassNames}'`;
                        });
                    }
                } else if (typeof obj[key] === 'object') {
                    replaceClasses(obj[key]);
                }
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(item => replaceClasses(item));
        }
    }
    
    // Replace CSS classes in the main structure
    replaceClasses(updatedData);
    
    // Create mapping from old IDs to new IDs
    const idMapping = {};
    
    // Replace CSS classes in globalClasses array and generate new IDs
    if (updatedData.globalClasses && Array.isArray(updatedData.globalClasses)) {
        updatedData.globalClasses.forEach(globalClass => {
            if (globalClass.name) {
                const oldId = globalClass.id;
                const oldName = globalClass.name;
                const newName = replaceClassName(globalClass.name);
                globalClass.name = newName;
                
                // Generate a new unique ID for the class
                const newId = generateUniqueId(newName);
                globalClass.id = newId;
                
                // Store the mapping
                idMapping[oldId] = newId;
            }
        });
    }
    
    // Replace CSS classes in content array and update IDs
    if (updatedData.content && Array.isArray(updatedData.content)) {
        updatedData.content.forEach(item => {
            if (item.settings && item.settings._cssGlobalClasses) {
                item.settings._cssGlobalClasses = item.settings._cssGlobalClasses.map(oldId => {
                    // Map the old ID to the new ID
                    return idMapping[oldId] || oldId;
                });
            }
        });
    }
    
    // Update JavaScript code and CSS custom code if they contain class references
    if (updatedData.content) {
        updatedData.content.forEach(item => {
            if (item.settings) {
                // Update JavaScript code
                if (item.settings.javascriptCode) {
                    // Replace class references in JavaScript code
                    item.settings.javascriptCode = item.settings.javascriptCode.replace(
                        new RegExp(`\\.${originalBaseClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                        `.${newBaseClass}`
                    );
                }
                
                // Update CSS custom code
                if (item.settings._cssCustom) {
                    item.settings._cssCustom = item.settings._cssCustom.replace(
                        new RegExp(`\\.${originalBaseClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                        `.${newBaseClass}`
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
                    new RegExp(`\\.${originalBaseClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
                    `.${newBaseClass}`
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
