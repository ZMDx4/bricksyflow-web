const fs = require('fs');
const path = require('path');

// Function to generate local metadata index from the sections/cf/ directory structure
function generateLocalMetadataIndex() {
  const metadataIndex = {
    frameworks: {
      cf: {}
    },
    lastUpdated: new Date().toISOString()
  };

  const cfDir = path.join(__dirname, 'sections', 'cf');
  
  if (!fs.existsSync(cfDir)) {
    console.error('sections/cf/ directory not found. Please ensure it exists.');
    return;
  }

  try {
    // Read all category directories
    const categories = fs.readdirSync(cfDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`�� Found ${categories.length} categories:`, categories);

    for (const category of categories) {
      const categoryDir = path.join(cfDir, category);
      const files = fs.readdirSync(categoryDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      metadataIndex.frameworks.cf[category] = {};

      for (const fileName of files) {
        const relativePath = `sections/cf/${category}/${fileName}.json`;
        
        metadataIndex.frameworks.cf[category][fileName] = {
          id: fileName.toLowerCase().replace(/\s+/g, '-'),
          category: category,
          defaultClass: `brixies-${fileName.toLowerCase().replace(/\s+/g, '-')}`,
          relativePath: relativePath
        };
      }

      console.log(`  📂 ${category}: ${files.length} sections`);
    }

    // Write the local metadata index
    const outputPath = path.join(__dirname, 'local-metadata-index.json');
    fs.writeFileSync(outputPath, JSON.stringify(metadataIndex, null, 2));
    
    console.log('\n✅ Local metadata index generated successfully!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📊 Total categories: ${Object.keys(metadataIndex.frameworks.cf).length}`);
    
    let totalSections = 0;
    for (const category of Object.values(metadataIndex.frameworks.cf)) {
      totalSections += Object.keys(category).length;
    }
    console.log(`�� Total sections: ${totalSections}`);
    
    console.log('\n🚀 The web interface will now load sections from local files!');
    
  } catch (error) {
    console.error('❌ Error generating local metadata index:', error);
  }
}

// Run the generator
generateLocalMetadataIndex();
