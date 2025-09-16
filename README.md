# Family Trees App (Vite + React)

Basic local-only React app to create a single family tree and persist it in localStorage.

Setup (PowerShell):

```powershell
# 1. Ensure Node.js (>=16) and npm are installed
node --version; npm --version

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev
```

Build:

```powershell
npm run build
npm run preview
```

Notes:
- Single tree: the app now manages a single family tree. Create a root (Progenitor) and then add people.
- Add person without relation: use the "Add at top-level" button to add someone without specifying a relationship.
- Relation-based add: select a person, choose relation (Child/Parent/Sibling/Spouse), enter a name and click "Add person".

Next steps: edit-in-place, import/export (JSON), backend storage, prettier graph visualization (dagre/cytoscape), authentication.
