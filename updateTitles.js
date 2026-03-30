const fs = require('fs');
const path = require('path');

const pagesDir = path.join('client', 'src', 'pages');
const pages = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const page of pages) {
  const filePath = path.join(pagesDir, page);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already imported
  if (content.includes('useDocumentTitle')) continue;

  // 1. Add import
  const importStatement = `import useDocumentTitle from '../hooks/useDocumentTitle';\n`;
  
  // Find last import statement to insert after
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const nextNewline = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextNewline + 1) + importStatement + content.slice(nextNewline + 1);
  } else {
    content = importStatement + '\n' + content;
  }

  // 2. Add hook call inside component
  const componentNameMatch = content.match(/const\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)\s*=>|=>)|function\s+([A-Z]\w*)\s*\(/);
  
  if (componentNameMatch) {
    const componentName = componentNameMatch[1] || componentNameMatch[2];
    
    // Human readable title
    const humanTitle = componentName.replace(/([A-Z])/g, ' $1').trim();
    
    // Find the opening brace of the component
    // We'll just look for the first `{` after the component declaration
    const componentRegexStr = `(?:const\\s+${componentName}\\s*=\\s*(?:\\([^)]*\\)\\s*=>|=>)|function\\s+${componentName}\\s*\\([^)]*\\)\\s*)`;
    const componentRegex = new RegExp(componentRegexStr);
    
    const match = content.match(componentRegex);
    if (match) {
      const remainingContent = content.slice(match.index);
      const openBraceMatch = remainingContent.match(/\{/);
      
      if (openBraceMatch) {
          const index = match.index + openBraceMatch.index + 1;
          content = content.slice(0, index) + `\n  useDocumentTitle('${humanTitle}');` + content.slice(index);
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('Updated ' + page);
      }
    }
  }
}
console.log('Done');
