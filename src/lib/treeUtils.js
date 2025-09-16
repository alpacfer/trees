export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function cloneTree(tree) {
  return tree ? JSON.parse(JSON.stringify(tree)) : null;
}

function findNodeAndParent(tree, nodeId) {
  let found = null;
  let parent = null;

  function walk(node, p) {
    if (found) return;
    if (node.id === nodeId) {
      found = node;
      parent = p;
      return;
    }
    if (node.spouse && node.spouse.id === nodeId) {
      found = node.spouse;
      parent = p;
      return;
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, node);
      }
    }
  }

  walk(tree, null);
  return { found, parent };
}

export function insertRelated(tree, targetId, relationType, name) {
  if (!tree) return null;
  const newTree = cloneTree(tree);

  const { found: targetNode, parent } = findNodeAndParent(newTree, targetId);

  if (!targetNode) {
    // If no target, and we are adding a child to the root
    if (relationType === 'child') {
        newTree.children.push({ id: uid(), name, children: [], spouse: null });
        return newTree;
    }
    return newTree; // Or handle error
  }


  switch (relationType) {
    case 'child':
      targetNode.children = targetNode.children || [];
      targetNode.children.push({ id: uid(), name, children: [], spouse: null });
      break;
    case 'parent':
      const newParent = { id: uid(), name, children: [targetNode], spouse: null };
      if (parent === null) {
        // The target was the root
        return newParent;
      } else {
        const index = parent.children.findIndex(c => c.id === targetNode.id);
        if (index !== -1) {
          parent.children[index] = newParent;
        }
      }
      break;
    case 'sibling':
      if (parent === null) {
        // Cannot add a sibling to the root
        // Fallback: add as another child of root
        newTree.children = newTree.children || [];
        newTree.children.push({ id: uid(), name, children: [], spouse: null });
      } else {
        parent.children.push({ id: uid(), name, children: [], spouse: null });
      }
      break;
    case 'spouse':
      if (!targetNode.spouse) {
        targetNode.spouse = { id: uid(), name };
      }
      break;
    default:
      break;
  }

  return newTree;
}

export function deletePerson(tree, id) {
  if (!tree) return null;
  if (tree.id === id) {
    return null; // Deleting the root
  }

  const newTree = cloneTree(tree);
  const { found, parent } = findNodeAndParent(newTree, id);

  if (found && parent) {
    if (parent.children) {
      const index = parent.children.findIndex(c => c.id === id);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }
    }
  } else if (found) {
    // It might be a spouse
    const { found: nodeWithSpouse } = findNodeAndParent(newTree, found.id) // bit of a hack
    if(nodeWithSpouse && nodeWithSpouse.spouse && nodeWithSpouse.spouse.id === id){
        nodeWithSpouse.spouse = null;
    }
  }


  return newTree;
}
