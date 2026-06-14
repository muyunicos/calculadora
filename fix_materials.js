const fs = require('fs');

try {
    const filePath = 'src/App.tsx';
    let content = fs.readFileSync(filePath, 'utf8');

    const lines = content.split('\n');

    // Find the line with materials.map
    let mapStartLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('materials && materials.map((m, idx) => {')) {
            mapStartLine = i;
            break;
        }
    }

    if (mapStartLine === -1) {
        console.error('Could not find materials.map');
        process.exit(1);
    }

    console.error(`Found map at line ${mapStartLine}`);
    console.error(`Line content: ${lines[mapStartLine]}`);

    // Count braces to find the end
    let balance = 0;
    let mapEndLine = -1;

    for (let i = mapStartLine; i < lines.length; i++) {
        const line = lines[i];
        for (let char of line) {
            if (char === '{') balance++;
            if (char === '}') balance--;
        }
        if (balance === 0 && i > mapStartLine + 10) {
            mapEndLine = i;
            break;
        }
    }

    if (mapEndLine === -1) {
        console.error('Could not find end of map');
        console.error(`Final balance: ${balance}`);
        process.exit(1);
    }

    console.error(`Map ends at line ${mapEndLine}`);

    // New implementation
    const newMapBlock = `                  {materials && materials.map((m, idx) => {
                    const selected = order.materialId === m.id;
                    return (
                      <div key={m.id} className={\`relative \${idx >= materialsShowMoreIndex ? 'opacity-40' : ''}\`}>
                        {/* Línea divisoria "Ver más" */}
                        {idx === materialsShowMoreIndex && materialsShowMoreIndex < materials.length && (
                          <div className="col-span-1 sm:col-span-2 -mt-2 mb-2">
                            <button
                              onClick={() => setMaterialsShowMoreIndex(materials.length)}
                              className="w-full text-xs font-bold text-slate-500 text-center border-t-2 border-dashed border-slate-300 pt-2 pb-1 hover:text-blue-600 hover:border-blue-400 transition-colors"
                            >
                              ← Ver más ({materials.length - materialsShowMoreIndex} materiales más) →
                            </button>
                          </div>
                        )}
                        <button onClick={() => selectMaterial(m.id)}
                          className={\`w-full h-full cl-option-card \${selected ? 'cl-option-card-selected' : ''}\`}>
                          <div className="flex items-start gap-2 pr-8">
                            {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                            <span className="font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{m.name}</span>
                          </div>
                        </button>
                        {(m.description || m.image) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedMaterialId((prev) => (prev === m.id ? null : m.id)); }}
                            className={infoBtnClass(expandedMaterialId === m.id)}
                            title="Más info"
                            aria-label={\`Más info sobre \${m.name}\`}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}`;

    // Replace the section
    const before = lines.slice(0, mapStartLine).join('\n');
    const after = lines.slice(mapEndLine + 1).join('\n');
    const newContent = before + '\n' + newMapBlock + '\n' + after;

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.error('File updated successfully');
} catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
}
