export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree));
}

export function migrateTree(oldTree) {
  const newTree = { nodes: {}, rootIds: [] };
  function walk(node) {
    if (!node || !node.id) return;
    const newNode = { id: node.id, name: node.name, children: [], spouseId: null };
    newTree.nodes[node.id] = newNode;

    if (node.spouse) {
      const spouseNode = { id: node.spouse.id, name: node.spouse.name, children: [], spouseId: node.id };
      newTree.nodes[node.spouse.id] = spouseNode;
      newNode.spouseId = node.spouse.id;
    }

    if (node.children) {
      node.children.forEach(child => {
        newNode.children.push(child.id);
        walk(child);
      });
    }
  }

  // The old tree had an invisible root, so we start with its children
  if (oldTree.children) {
      oldTree.children.forEach(child => {
          newTree.rootIds.push(child.id);
          walk(child);
      });
  }

  return newTree;
}

function findParent(tree, nodeId) {
    for (const node of Object.values(tree.nodes)) {
        if (node.children.includes(nodeId)) {
            return node.id;
        }
    }
    return null;
}

export function insertRelated(tree, targetId, relationType, name) {
  const newTree = cloneTree(tree);
  const newId = uid();
  const newNode = { id: newId, name, children: [], spouseId: null };

  switch (relationType) {
    case 'child':
      newTree.nodes[targetId].children.push(newId);
      newTree.nodes[newId] = newNode;
      break;
    case 'spouse':
      newNode.spouseId = targetId;
      newTree.nodes[newId] = newNode;
      newTree.nodes[targetId].spouseId = newId;
      break;
    case 'sibling':
      const parentId = findParent(newTree, targetId);
      if (parentId) {
        newTree.nodes[parentId].children.push(newId);
        newTree.nodes[newId] = newNode;
      } else {
        // If no parent, add as a root node
        newTree.rootIds.push(newId);
        newTree.nodes[newId] = newNode;
      }
      break;
    case 'parent':
      const oldParentId = findParent(newTree, targetId);
      const oldRootIndex = newTree.rootIds.indexOf(targetId);

      if (oldParentId) {
          const grandParentId = findParent(newTree, oldParentId);
          if(grandParentId){
            newTree.nodes[grandParentId].children.push(newId);
          } else {
            newTree.rootIds.push(newId);
          }
      } else if (oldRootIndex !== -1) {
          newTree.rootIds.splice(oldRootIndex, 1, newId);
      } else {
          newTree.rootIds.push(newId);
      }

      newNode.children.push(targetId);
      newTree.nodes[newId] = newNode;
      break;
  }

  return newTree;
}

export function deletePerson(tree, id) {
    const newTree = cloneTree(tree);

    // Remove from nodes map
    const nodeToDelete = newTree.nodes[id];
    if (!nodeToDelete) return newTree;
    delete newTree.nodes[id];

    // Remove from rootIds
    const rootIndex = newTree.rootIds.indexOf(id);
    if (rootIndex !== -1) {
        newTree.rootIds.splice(rootIndex, 1);
    }

    // Remove from parent's children array
    const parentId = findParent(newTree, id);
    if (parentId) {
        const parent = newTree.nodes[parentId];
        const childIndex = parent.children.indexOf(id);
        if (childIndex !== -1) {
            parent.children.splice(childIndex, 1);
        }
    }

    // Remove spouse link
    if (nodeToDelete.spouseId) {
        const spouse = newTree.nodes[nodeToDelete.spouseId];
        if (spouse) {
            spouse.spouseId = null;
        }
    }

    // Delete children of the deleted node
    if (nodeToDelete.children) {
        nodeToDelete.children.forEach(childId => {
            deletePerson(newTree, childId); // This is recursive and might not be what the user wants. Let's just delete the node itself for now.
        });
    }

    return newTree;
}