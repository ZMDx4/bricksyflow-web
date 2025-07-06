const fs = require('fs');
const path = require('path');

const SECTIONS_ROOT = path.join(__dirname, 'sections');
const OUTPUT_FILE = path.join(__dirname, 'local-metadata-index.json');

function getSectionMetadata(framework, category, sectionFile) {
    const filePath = path.join(SECTIONS_ROOT, framework, category, sectionFile);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let defaultClass = '';
    if (data.globalClasses && data.globalClasses[0] && data.globalClasses[0].name) {
        defaultClass = data.globalClasses[0].name;
    } else {
        defaultClass = path.basename(sectionFile, '.json').toLowerCase().replace(/\s+/g, '-');
    }
    return {
        id: path.basename(sectionFile, '.json'),
        category,
        defaultClass,
        relativePath: `/sections/${framework}/${category}/${sectionFile}`
    };
}

function buildMetadata() {
    const frameworks = fs.readdirSync(SECTIONS_ROOT).filter(f => fs.statSync(path.join(SECTIONS_ROOT, f)).isDirectory());
    const metadata = { frameworks: {} };
    frameworks.forEach(framework => {
        const categories = fs.readdirSync(path.join(SECTIONS_ROOT, framework)).filter(f => fs.statSync(path.join(SECTIONS_ROOT, framework, f)).isDirectory());
        metadata.frameworks[framework] = {};
        categories.forEach(category => {
            const sectionFiles = fs.readdirSync(path.join(SECTIONS_ROOT, framework, category)).filter(f => f.endsWith('.json'));
            metadata.frameworks[framework][category] = {};
            sectionFiles.forEach(sectionFile => {
                const meta = getSectionMetadata(framework, category, sectionFile);
                metadata.frameworks[framework][category][path.basename(sectionFile, '.json')] = meta;
            });
        });
    });
    metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
    console.log('Metadata index generated:', OUTPUT_FILE);
}

buildMetadata();
