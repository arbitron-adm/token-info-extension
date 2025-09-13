let PANEL_STYLES = '';
let COMPONENT_STYLES = {};

async function loadCSSFile(filename) {
    try {
        const response = await fetch(chrome.runtime.getURL(`css/${filename}`));
        return await response.text();
    } catch (error) {
        console.error(`Failed to load ${filename}:`, error);
        return '';
    }
}

async function loadPanelStyles() {
    if (PANEL_STYLES) return PANEL_STYLES;
    
    const styleFiles = [
        'panel-styles.css',
        'common-styles.css',
        'cex-styles.css',
        'futures-styles.css',
        'networks-styles.css',
        'dex-styles.css'
    ];
    
    const allStyles = await Promise.all(
        styleFiles.map(file => loadCSSFile(file))
    );
    
    PANEL_STYLES = allStyles.join('\n');
    return PANEL_STYLES;
}

async function loadComponentStyles(component) {
    if (COMPONENT_STYLES[component]) return COMPONENT_STYLES[component];
    
    const filename = `${component}-styles.css`;
    COMPONENT_STYLES[component] = await loadCSSFile(filename);
    return COMPONENT_STYLES[component];
}