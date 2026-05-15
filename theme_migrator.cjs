const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace backgrounds
    content = content.replace(/bg-\[#0A0A0A\]/g, 'bg-[#f8fafc] dark:bg-[#0A0A0A]');
    // Replace text colors
    content = content.replace(/text-\[#F0F0F0\]/g, 'text-slate-900 dark:text-[#F0F0F0]');
    
    // Replace text-white to support dark mode
    // text-white -> text-black dark:text-white
    content = content.replace(/text-white/g, 'text-black dark:text-white');
    
    // Replace border-white
    content = content.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');
    content = content.replace(/border-white\/20/g, 'border-black/20 dark:border-white/20');
    content = content.replace(/border-white\/30/g, 'border-black/30 dark:border-white/30');

    // Replace background white
    content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
    content = content.replace(/bg-black\/50/g, 'bg-white/50 dark:bg-black/50');

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Done mapping tailwind classes explicitly!');
