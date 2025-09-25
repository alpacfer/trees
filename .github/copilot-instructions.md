# Family Trees App - AI Coding Agent Instructions

## Project Overview
React-based family tree visualization and editing tool using a **normalized data structure** (not nested trees). Built with Vite, focused on local storage persistence and intuitive graph-based visualization.

## Core Architecture

### Data Structure (Critical!)
- **NOT a nested tree** - uses normalized format: `{ nodes: {}, rootIds: [] }`
- Each person is a flat object: `{ id, name, children: [ids], spouseId, siblingIds: [ids] }`
- Multiple root nodes supported via `rootIds` array
- Legacy migration from nested format exists in `treeUtils.migrateTree()`

### Key Components
- **TreeEditor**: Main container, handles localStorage persistence and state management
- **TreeControls**: Form inputs and relationship buttons (child/parent/spouse/sibling)
- **GraphView**: SVG-based visualization with custom layout algorithm
- **treeUtils**: Core relationship logic - study `insertRelated()` and `deletePerson()` carefully

## Development Workflow
```bash
npm run dev     # Development with hot reload (primary)
npm run build   # Production build to dist/
npm run preview # Preview production build
```
- Uses Vite with default config (no custom vite.config.js)
- Entry point: `index.html` → `/src/main.jsx` → `App.jsx` → `TreeEditor`
- No tests currently configured

## Project-Specific Patterns

### Relationship Logic (src/lib/treeUtils.js)
- **Parent addition**: Creates spouse relationships or promotes to root depending on existing structure  
- **Sibling handling**: Uses `findParent()` - if no parent exists, creates "parent-less siblings" with `siblingIds`
- **Tree cloning**: Always `cloneTree()` before mutations for immutability
- **IDs**: Simple `uid()` using Math.random() - not cryptographically secure

### State Management
- Single tree state in TreeEditor with localStorage auto-sync
- Selection state for current person (enables contextual relationship buttons)
- No external state management - pure React hooks

### Visual Conventions
- **Marriage nodes**: Small connector between spouses in SVG
- **Sibling edges**: Dotted lines for parent-less siblings  
- **Layout**: Custom depth-based positioning in GraphView with collision avoidance
- **Selection**: Blue highlighting for selected nodes

## Critical Implementation Notes
- **Always use normalized data structure** - never create nested tree objects
- **Test relationship edge cases**: parent-less siblings, spouse limits, root node promotions
- **localStorage format migration**: Check existing data format in TreeEditor useEffect
- **UI enables specific workflows**: Select person → contextual buttons appear → add relationship
- **Graph layout is performance-sensitive**: Large trees may need optimization

## Files to Reference for Patterns
- `src/lib/treeUtils.js` - Relationship manipulation logic
- `src/components/TreeEditor.jsx` - State management and persistence patterns  
- `BEHAVIORS.md` - Detailed specification of relationship rules and UI behaviors
- `src/components/GraphView.jsx` - SVG layout algorithm and visual styling

## Common Tasks
- Adding relationships: Always go through `insertRelated()` in treeUtils
- UI changes: Check TreeControls for form patterns, GraphView for visualization
- Data migrations: Follow pattern in TreeEditor's localStorage loading logic
- Styling: CSS classes follow BEM-like conventions, graph styles use SVG-specific properties