export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree));
}

function pushUnique(array, value) {
  if (!array) return;
  if (!array.includes(value)) {
    array.push(value);
  }
}

function removeValue(array, value) {
  if (!array) return;
  const index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function syncChildrenBetweenPartners(tree, personId, spouseId) {
  if (!spouseId) return;
  const person = tree.nodes[personId];
  const spouse = tree.nodes[spouseId];
  if (!person || !spouse) return;
  const combined = [...new Set([...(person.children || []), ...(spouse.children || [])])];
  person.children = [...combined];
  spouse.children = [...combined];
}

export function migrateTree(oldTree) {
  const newTree = { nodes: {}, rootIds: [] };
  function walk(node) {
    if (!node || !node.id) return;
    const newNode = { id: node.id, name: node.name, children: [], spouseId: null, siblingIds: [] };
    newTree.nodes[node.id] = newNode;

    if (node.spouse) {
      const spouseNode = { id: node.spouse.id, name: node.spouse.name, children: [], spouseId: node.id, siblingIds: [] };
      newTree.nodes[node.spouse.id] = spouseNode;
      newNode.spouseId = node.spouse.id;
    }

    if (node.children) {
      node.children.forEach(child => {
        pushUnique(newNode.children, child.id);
        const maybeSpouse = newNode.spouseId ? newTree.nodes[newNode.spouseId] : null;
        if (maybeSpouse) {
          pushUnique(maybeSpouse.children, child.id);
        }
        walk(child);
      });
    }
  }

  if (oldTree.children) {
    oldTree.children.forEach(child => {
      pushUnique(newTree.rootIds, child.id);
      walk(child);
    });
  }

  return newTree;
}

function findParent(tree, nodeId) {
  for (const node of Object.values(tree.nodes)) {
    const children = node.children || [];
    if (children.includes(nodeId)) {
      return node.id;
    }
  }
  return null;
}

export function insertRelated(tree, targetId, relationType, name) {
  const newTree = cloneTree(tree);
  const newId = uid();
  const newNode = { id: newId, name, children: [], spouseId: null, siblingIds: [] };

  switch (relationType) {
    case 'child': {
      const targetNode = newTree.nodes[targetId];
      pushUnique(targetNode.children, newId);
      newTree.nodes[newId] = newNode;
      if (targetNode.spouseId) {
        syncChildrenBetweenPartners(newTree, targetId, targetNode.spouseId);
      }
      break;
    }
    case 'spouse': {
      const targetNode = newTree.nodes[targetId];
      newNode.spouseId = targetId;
      newTree.nodes[newId] = newNode;
      targetNode.spouseId = newId;
      syncChildrenBetweenPartners(newTree, targetId, newId);
      break;
    }
    case 'sibling': {
      const parentId = findParent(newTree, targetId);
      if (parentId) {
        const parentNode = newTree.nodes[parentId];
        pushUnique(parentNode.children, newId);
        newTree.nodes[newId] = newNode;
        if (parentNode.spouseId) {
          syncChildrenBetweenPartners(newTree, parentId, parentNode.spouseId);
        }
      } else {
        newNode.siblingIds = [targetId];
        newTree.nodes[newId] = newNode;
        if (!newTree.nodes[targetId].siblingIds) {
          newTree.nodes[targetId].siblingIds = [];
        }
        pushUnique(newTree.nodes[targetId].siblingIds, newId);
        pushUnique(newTree.rootIds, newId);
      }
      break;
    }
    case 'parent': {
      const oldParentId = findParent(newTree, targetId);

      if (oldParentId) {
        const oldParent = newTree.nodes[oldParentId];
        if (!oldParent.spouseId) {
          newNode.spouseId = oldParentId;
          newTree.nodes[newId] = newNode;
          oldParent.spouseId = newId;
          syncChildrenBetweenPartners(newTree, oldParentId, newId);
        } else {
          alert('This person already has two parents.');
        }
      } else {
        pushUnique(newNode.children, targetId);
        newTree.nodes[newId] = newNode;

        const oldRootIndex = newTree.rootIds.indexOf(targetId);
        if (oldRootIndex !== -1) {
          newTree.rootIds.splice(oldRootIndex, 1, newId);
        } else {
          pushUnique(newTree.rootIds, newId);
        }
      }
      break;
    }
    default:
      break;
  }

  return newTree;
}

export function deletePerson(tree, id) {
  const newTree = cloneTree(tree);

  const nodeToDelete = newTree.nodes[id];
  if (!nodeToDelete) return newTree;

  const childIds = [...(nodeToDelete.children || [])];
  const spouseId = nodeToDelete.spouseId;

  delete newTree.nodes[id];

  removeValue(newTree.rootIds, id);

  const parentId = findParent(newTree, id);
  if (parentId) {
    const parent = newTree.nodes[parentId];
    if (parent && parent.children) {
      removeValue(parent.children, id);
      if (parent.spouseId) {
        const otherParent = newTree.nodes[parent.spouseId];
        if (otherParent && otherParent.children) {
          removeValue(otherParent.children, id);
        }
        syncChildrenBetweenPartners(newTree, parentId, parent.spouseId);
      }
    }
  }

  if (spouseId) {
    const spouse = newTree.nodes[spouseId];
    if (spouse) {
      if (spouse.spouseId === id) {
        spouse.spouseId = null;
      }
      childIds.forEach(childId => {
        pushUnique(spouse.children, childId);
        removeValue(newTree.rootIds, childId);
      });
      if (!findParent(newTree, spouseId)) {
        pushUnique(newTree.rootIds, spouseId);
      }
    }
  } else {
    childIds.forEach(childId => {
      const currentParentId = findParent(newTree, childId);
      if (!currentParentId) {
        pushUnique(newTree.rootIds, childId);
      }
    });
  }

  if (nodeToDelete.siblingIds) {
    nodeToDelete.siblingIds.forEach(sibId => {
      const sibling = newTree.nodes[sibId];
      if (sibling && sibling.siblingIds) {
        removeValue(sibling.siblingIds, id);
      }
    });
  }

  return newTree;
}
