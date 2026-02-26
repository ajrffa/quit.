const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dirs = ['app', 'components', 'services', 'stores', 'types', 'utils', 'constants', 'hooks'];
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (extensions.some(ext => file.endsWith(ext))) {
                results.push(file);
            }
        }
    });
    return results;
}

let allFiles = [];
dirs.forEach(d => {
    const fullPath = path.join(rootDir, d);
    if (fs.existsSync(fullPath)) {
        allFiles = allFiles.concat(walk(fullPath));
    }
});

let modCount = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    const regex = /(from\s+|import\s+|require\(\s*)(['"])@\/(.*?)\2/g;
    content = content.replace(regex, (match, p1, p2, p3) => {
        const fileDir = path.dirname(file);
        const relativeToRoot = path.relative(fileDir, rootDir);
        let replacementPath = path.posix.join(relativeToRoot.replace(/\\/g, '/'), p3.replace(/\\/g, '/'));
        if (!replacementPath.startsWith('.')) {
            replacementPath = './' + replacementPath;
        }
        return `${p1}${p2}${replacementPath}${p2}`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.relative(rootDir, file)}`);
        modCount++;
    }
});

console.log(`Done. Modified ${modCount} files.`);
