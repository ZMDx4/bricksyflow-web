# BricksyFlow Web Interface

A modern web interface for editing, renaming, and downloading Bricks Builder section exports from the Figma plugin. Designed for scalability, multi-framework support, and easy section management.

---

## 🚀 Live Demo

Try it here: [https://zmdx4.github.io/brixies-exporter-web/](https://zmdx4.github.io/brixies-exporter-web/)

---

## 📖 Usage

### From Figma Plugin

1. Install the **BricksyFlow** plugin in Figma.
2. Select the sections or pages you want to export.
3. Click **"Generate Export"** in the plugin.
4. The plugin will open this web interface automatically.
5. Review, rename, and download or copy the combined JSON for Bricks Builder.

### Direct Access

- Visit:  
  `https://zmdx4.github.io/brixies-exporter-web/`

---

## 🛠️ Features

- **Beautiful UI:** Modern, responsive design with gradient backgrounds.
- **Section Editing:** Review and rename root CSS classes for each section.
- **Framework Support:** Easily extendable for multiple frameworks (e.g., `cf`, `acss`, `at`).
- **Export Management:** View and reorder all sections in your export.
- **Copy to Clipboard:** One-click copy of the entire JSON.
- **Download JSON:** Download the file directly to your computer.
- **Error Handling:** Graceful error messages for missing or malformed sections.
- **Mobile Responsive:** Works perfectly on all devices.

---

## 🔧 Technical Details

- **Static HTML/JS:** No backend required, hosted on GitHub Pages.
- **Single Repository:** All section data and the web interface are in one repo for easy management.
- **Section Data:** All section JSON files are organized under `/sections/{framework}/{category}/Section Name.json`.
- **Metadata Index:** Auto-generated metadata index for fast section lookup and framework support.
- **Modern JavaScript:** Uses async/await and modern browser APIs.
- **Progressive Enhancement:** Works even if JavaScript fails.

---

## 📁 Repository Structure

brixies-exporter-web/
├── index.html # Main web interface
├── main.js # Application logic
├── style.css # Styles
├── sections/ # All section JSONs, organized by framework/category
│ ├── cf/
│ │ ├── banner/
│ │ └── intro/
│ └── acss/
│ └── ...
├── local-metadata-index.json # Auto-generated metadata for all sections
└── README.md # This file

---

## 🔗 Related Projects

- **BricksyFlow Plugin:** Figma plugin for exporting sections.
- **Section Data:** All section templates are now part of this repository.

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for the Bricks Builder community
