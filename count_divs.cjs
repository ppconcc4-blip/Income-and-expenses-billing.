const fs = require('fs');
const code = fs.readFileSync('src/components/ConstructionPlanner.tsx', 'utf8');

const mainStart = code.indexOf('<main');
const mainEnd = code.indexOf('</main>');

if (mainStart === -1 || mainEnd === -1) {
    console.log("Could not find main tags");
    process.exit(1);
}

const mainContent = code.substring(mainStart, mainEnd);

let openDivs = (mainContent.match(/<div(\s|>)/g) || []).length;
let closeDivs = (mainContent.match(/<\/div>/g) || []).length;

console.log("Open divs inside main:", openDivs);
console.log("Close divs inside main:", closeDivs);
