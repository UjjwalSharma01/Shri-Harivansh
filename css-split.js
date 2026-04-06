const fs = require('fs');
const path = require('path');

const cssText = fs.readFileSync(path.join(__dirname, 'app/globals.css'), 'utf8');
const lines = cssText.split('\n');

const stylesDir = path.join(__dirname, 'app/styles');
if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir);
}

// 1. Group lines by looking for big comment blocks `/* ====` or `/* ━━━`
let groups = [];
let currentGroup = { name: 'reset-and-vars', lines: [] };

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a major separator
    if (line.trim().match(/^\/\*\s*[═=─-]{5,}/)) {
        // Find the title
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        
        if (j < lines.length && !lines[j].trim().match(/^\/\*\s*[═=─-]{5,}/) && !lines[j].includes('*/')) {
            const title = lines[j].trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
            if (title) {
                if (currentGroup.lines.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = { name: title, lines: [line] };
                continue;
            }
        }
    }
    
    currentGroup.lines.push(line);
}

if (currentGroup.lines.length > 0) {
    groups.push(currentGroup);
}

console.log('Found groups:', groups.map(g => g.name).join(', '));

// Write all groups to /app/styles/ 
let importStatements = [];

groups.forEach(group => {
    let filename = group.name + '.css';
    if (filename === 'reset-and-vars.css') filename = '01-base.css';
    else if (filename.includes('typography')) filename = '02-typography.css';
    else if (filename.includes('layout')) filename = '03-layout.css';
    else if (filename.includes('buttons') || filename.includes('components')) filename = '04-components.css';
    
    const filePath = path.join(stylesDir, filename);
    fs.writeFileSync(filePath, group.lines.join('\n'));
    importStatements.push(`@import './styles/${filename}';`);
});

// Update globals.css with imports
fs.writeFileSync(path.join(__dirname, 'app/globals.css'), importStatements.join('\n') + '\n');
console.log('Done splitting CSS!');
