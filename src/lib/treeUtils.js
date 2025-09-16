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
    const newNode = { id: node.id, name: node.name, children: [], spouseId: null, siblingIds: [] };
    newTree.nodes[node.id] = newNode;

    if (node.spouse) {
      const spouseNode = { id: node.spouse.id, name: node.spouse.name, children: [], spouseId: node.id, siblingIds: [] };
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
  const newNode = { id: newId, name, children: [], spouseId: null, siblingIds: [] };

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
        newNode.siblingIds = [targetId];
        newTree.nodes[newId] = newNode;
        if (!newTree.nodes[targetId].siblingIds) {
            newTree.nodes[targetId].siblingIds = [];
        }
        newTree.nodes[targetId].siblingIds.push(newId);
        newTree.rootIds.push(newId);
      }
      break;
    case 'parent':
      const oldParentId = findParent(newTree, targetId);

      if (oldParentId) {
          const oldParent = newTree.nodes[oldParentId];
          if (!oldParent.spouseId) {
              newNode.spouseId = oldParentId;
              newTree.nodes[newId] = newNode;
              oldParent.spouseId = newId;
          } else {
              alert("This person already has two parents.");
          }
      } else {
          newNode.children.push(targetId);
          newTree.nodes[newId] = newNode;

          const oldRootIndex = newTree.rootIds.indexOf(targetId);
          if (oldRootIndex !== -1) {
              newTree.rootIds.splice(oldRootIndex, 1, newId);
          } else {
              newTree.rootIds.push(newId);
          }
      }
      break;
  }

  return newTree;
}

export function deletePerson(tree, id) {
    const newTree = cloneTree(tree);

    const nodeToDelete = newTree.nodes[id];
    if (!nodeToDelete) return newTree;
    delete newTree.nodes[id];

    const rootIndex = newTree.rootIds.indexOf(id);
    if (rootIndex !== -1) {
        newTree.rootIds.splice(rootIndex, 1);
    }

    const parentId = findParent(newTree, id);
    if (parentId) {
        const parent = newTree.nodes[parentId];
        const childIndex = parent.children.indexOf(id);
        if (childIndex !== -1) {
            parent.children.splice(childIndex, 1);
        }
    }

    if (nodeToDelete.spouseId) {
        const spouse = newTree.nodes[nodeToDelete.spouseId];
        if (spouse) {
            spouse.spouseId = null;
        }
    }

    if (nodeToDelete.siblingIds) {
        nodeToDelete.siblingIds.forEach(sibId => {
            const sibling = newTree.nodes[sibId];
            if (sibling && sibling.siblingIds) {
                const a = sibling.siblingIds.indexOf(id);
                if (a !== -1) {
                    sibling.siblingIds.splice(a, 1);
                }
            }
        });
    }

    return newTree;
}
