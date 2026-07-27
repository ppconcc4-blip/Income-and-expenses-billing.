const fs = require('fs');
let code = fs.readFileSync('src/components/ConstructionPlanner.tsx', 'utf8');

// I will just let a proper formatter like `prettier` or standard html parser fix it?
// No, prettier throws a SyntaxError and fails.

// Let's just find the missing closing divs.
