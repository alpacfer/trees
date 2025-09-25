import test from 'node:test';
import assert from 'node:assert/strict';

import { cloneTree, insertRelated, deletePerson, migrateTree } from './treeUtils.js';

globalThis.alert = globalThis.alert || (() => {});

function baseTree() {
  return {
    nodes: {
      parent: {
        id: 'parent',
        name: 'Parent',
        children: [],
        spouseId: null,
        siblingIds: []
      }
    },
    rootIds: ['parent']
  };
}

function getNewNodeId(before, after) {
  return Object.keys(after.nodes).find(id => !(id in before.nodes));
}

test('cloneTree returns a deep copy', () => {
  const tree = baseTree();
  const cloned = cloneTree(tree);
  assert.notEqual(cloned, tree);
  assert.deepEqual(cloned, tree);

  cloned.nodes.parent.name = 'Changed';
  assert.equal(tree.nodes.parent.name, 'Parent');
});

test('insertRelated adds a child and syncs between partners', () => {
  const tree = baseTree();
  tree.nodes.spouse = {
    id: 'spouse',
    name: 'Spouse',
    children: [],
    spouseId: 'parent',
    siblingIds: []
  };
  tree.nodes.parent.spouseId = 'spouse';

  const updated = insertRelated(tree, 'parent', 'child', 'Child');
  const newChildId = Object.keys(updated.nodes).find(id => !(id in tree.nodes));
  assert.ok(newChildId, 'child id should exist');

  assert.deepEqual(updated.nodes[newChildId], {
    id: newChildId,
    name: 'Child',
    children: [],
    spouseId: null,
    siblingIds: []
  });
  assert.ok(updated.nodes.parent.children.includes(newChildId));
  assert.ok(updated.nodes.spouse.children.includes(newChildId));
});

test('insertRelated merges partner children and avoids duplicates when adding a child', () => {
  const tree = {
    nodes: {
      parent: { id: 'parent', name: 'Parent', children: [], spouseId: 'spouse', siblingIds: [] },
      spouse: { id: 'spouse', name: 'Spouse', children: ['existing'], spouseId: 'parent', siblingIds: [] },
      existing: { id: 'existing', name: 'Existing Child', children: [], spouseId: null, siblingIds: [] }
    },
    rootIds: ['parent']
  };

  const updated = insertRelated(tree, 'parent', 'child', 'New Child');
  const newChildId = getNewNodeId(tree, updated);

  assert.ok(newChildId, 'new child should be generated');
  const parentChildren = updated.nodes.parent.children;
  const spouseChildren = updated.nodes.spouse.children;

  assert.ok(parentChildren.includes('existing'));
  assert.ok(parentChildren.includes(newChildId));
  assert.ok(spouseChildren.includes('existing'));
  assert.ok(spouseChildren.includes(newChildId));
  assert.equal(parentChildren.length, new Set(parentChildren).size, 'parent children should be unique');
  assert.equal(spouseChildren.length, new Set(spouseChildren).size, 'spouse children should be unique');
});

test('insertRelated adds a spouse with bidirectional relationship', () => {
  const tree = baseTree();
  const updated = insertRelated(tree, 'parent', 'spouse', 'Spouse');
  const newSpouseId = Object.keys(updated.nodes).find(id => !(id in tree.nodes));
  assert.ok(newSpouseId, 'spouse id should exist');

  assert.equal(updated.nodes[newSpouseId].spouseId, 'parent');
  assert.equal(updated.nodes.parent.spouseId, newSpouseId);
  assert.equal(updated.nodes[newSpouseId].name, 'Spouse');
});

test('insertRelated adds sibling under a shared parent and keeps family roots intact', () => {
  const tree = {
    nodes: {
      parent: { id: 'parent', name: 'Parent', children: ['child'], spouseId: 'coParent', siblingIds: [] },
      coParent: { id: 'coParent', name: 'Co Parent', children: ['child'], spouseId: 'parent', siblingIds: [] },
      child: { id: 'child', name: 'Child', children: [], spouseId: null, siblingIds: [] }
    },
    rootIds: ['parent']
  };

  const updated = insertRelated(tree, 'child', 'sibling', 'Sibling');
  const siblingId = getNewNodeId(tree, updated);

  assert.ok(updated.nodes.parent.children.includes(siblingId));
  assert.ok(updated.nodes.coParent.children.includes(siblingId));
  assert.ok(updated.nodes[siblingId], 'sibling should exist in nodes map');
  assert.deepEqual(updated.nodes[siblingId].siblingIds, [], 'new sibling should not be manually linked');
  assert.ok(!updated.rootIds.includes(siblingId), 'sibling added under parents should not become a root');
});

test('insertRelated adds a new parent and updates root ids when no parent exists', () => {
  const tree = baseTree();
  const updated = insertRelated(tree, 'parent', 'parent', 'New Parent');
  const newParentId = Object.keys(updated.nodes).find(id => !(id in tree.nodes));
  assert.ok(newParentId, 'parent id should exist');

  assert.ok(updated.nodes[newParentId].children.includes('parent'));
  assert.ok(updated.rootIds.includes(newParentId));
  assert.ok(!updated.rootIds.includes('parent'));
});

test('insertRelated moves partnered child to the end when spouse gains a parent', () => {
  const tree = {
    nodes: {
      parent: { id: 'parent', name: 'Parent', children: ['leftSibling', 'partneredChild', 'rightSibling'], spouseId: 'coParent', siblingIds: [] },
      coParent: { id: 'coParent', name: 'Co Parent', children: ['leftSibling', 'partneredChild', 'rightSibling'], spouseId: 'parent', siblingIds: [] },
      leftSibling: { id: 'leftSibling', name: 'Left', children: [], spouseId: null, siblingIds: [] },
      partneredChild: { id: 'partneredChild', name: 'Partnered', children: [], spouseId: 'spouse', siblingIds: [] },
      rightSibling: { id: 'rightSibling', name: 'Right', children: [], spouseId: null, siblingIds: [] },
      spouse: { id: 'spouse', name: 'Spouse', children: [], spouseId: 'partneredChild', siblingIds: [] }
    },
    rootIds: ['parent']
  };

  const updated = insertRelated(tree, 'spouse', 'parent', 'Spouse Parent');
  const newParentId = getNewNodeId(tree, updated);

  assert.ok(newParentId, 'new parent should be generated');
  const parentChildren = updated.nodes.parent.children;

  assert.deepEqual(parentChildren, ['leftSibling', 'rightSibling', 'partneredChild']);
  assert.deepEqual(parentChildren, updated.nodes.coParent.children);
  assert.deepEqual(updated.nodes[newParentId].children, ['spouse']);
});
test('insertRelated links a missing co-parent to an existing single parent', () => {
  const tree = {
    nodes: {
      child: { id: 'child', name: 'Child', children: [], spouseId: null, siblingIds: [] },
      parent: { id: 'parent', name: 'Parent', children: ['child'], spouseId: null, siblingIds: [] }
    },
    rootIds: ['parent']
  };

  const updated = insertRelated(tree, 'child', 'parent', 'Second Parent');
  const secondParentId = getNewNodeId(tree, updated);

  assert.ok(secondParentId, 'second parent should be generated');
  assert.equal(updated.nodes.parent.spouseId, secondParentId);
  assert.equal(updated.nodes[secondParentId].spouseId, 'parent');
  assert.deepEqual(
    [...updated.nodes.parent.children].sort(),
    [...updated.nodes[secondParentId].children].sort()
  );
  assert.deepEqual(updated.rootIds, ['parent'], 'root ids should remain stable');
});

test('insertRelated warns and leaves tree unchanged when adding a third parent', () => {
  let warning = null;
  const originalAlert = globalThis.alert;
  globalThis.alert = message => {
    warning = message;
  };

  const tree = {
    nodes: {
      child: { id: 'child', name: 'Child', children: [], spouseId: null, siblingIds: [] },
      parentA: { id: 'parentA', name: 'Parent A', children: ['child'], spouseId: 'parentB', siblingIds: [] },
      parentB: { id: 'parentB', name: 'Parent B', children: ['child'], spouseId: 'parentA', siblingIds: [] }
    },
    rootIds: ['parentA']
  };

  const updated = insertRelated(tree, 'child', 'parent', 'Extra Parent');

  assert.equal(warning, 'This person already has two parents.');
  assert.deepEqual(updated, tree, 'tree should remain unchanged when alerting');

  globalThis.alert = originalAlert;
});

test('deletePerson removes a node and updates spouse and children', () => {
  const tree = {
    nodes: {
      parent: { id: 'parent', name: 'Parent', children: ['child'], spouseId: 'spouse', siblingIds: [] },
      spouse: { id: 'spouse', name: 'Spouse', children: ['child'], spouseId: 'parent', siblingIds: [] },
      child: { id: 'child', name: 'Child', children: [], spouseId: null, siblingIds: [] }
    },
    rootIds: ['parent']
  };

  const updated = deletePerson(tree, 'parent');

  assert.equal(updated.nodes.parent, undefined);
  assert.equal(updated.nodes.spouse.spouseId, null);
  assert.ok(updated.nodes.spouse.children.includes('child'));
  assert.ok(updated.rootIds.includes('spouse'));
  assert.ok(!updated.rootIds.includes('parent'));
});

test('deletePerson removes sibling references and promotes orphaned children', () => {
  const tree = {
    nodes: {
      target: { id: 'target', name: 'Target', children: ['child'], spouseId: null, siblingIds: ['sibling'] },
      child: { id: 'child', name: 'Child', children: [], spouseId: null, siblingIds: [] },
      sibling: { id: 'sibling', name: 'Sibling', children: [], spouseId: null, siblingIds: ['target'] }
    },
    rootIds: ['target']
  };

  const updated = deletePerson(tree, 'target');

  assert.ok(!updated.nodes.sibling.siblingIds.includes('target'));
  assert.ok(updated.rootIds.includes('child'), 'orphaned child should become a root');
  assert.ok(!updated.rootIds.includes('target'));
});

test('migrateTree converts legacy nested structure into new format', () => {
  const legacyTree = {
    children: [
      {
        id: 'root',
        name: 'Root',
        spouse: { id: 'spouse', name: 'Spouse' },
        children: [
          { id: 'child', name: 'Child', children: [] }
        ]
      }
    ]
  };

  const migrated = migrateTree(legacyTree);

  assert.deepEqual(migrated.rootIds, ['root']);
  assert.deepEqual(migrated.nodes.root.children, ['child']);
  assert.equal(migrated.nodes.spouse.spouseId, 'root');
  assert.deepEqual(migrated.nodes.child.children, []);
});

test('migrateTree handles multiple roots and nested spouses', () => {
  const legacyTree = {
    children: [
      {
        id: 'alpha',
        name: 'Alpha',
        spouse: { id: 'beta', name: 'Beta', children: [{ id: 'gamma', name: 'Gamma', children: [] }] },
        children: [
          { id: 'gamma', name: 'Gamma', children: [] },
          { id: 'delta', name: 'Delta', children: [] }
        ]
      },
      {
        id: 'solo',
        name: 'Solo',
        children: []
      }
    ]
  };

  const migrated = migrateTree(legacyTree);

  assert.deepEqual(new Set(migrated.rootIds), new Set(['alpha', 'solo']));
  assert.deepEqual(new Set(migrated.nodes.alpha.children), new Set(['gamma', 'delta']));
  assert.deepEqual(new Set(migrated.nodes.beta.children), new Set(['gamma', 'delta']));
  assert.equal(migrated.nodes.beta.spouseId, 'alpha');
  assert.equal(migrated.nodes.gamma.spouseId, null);
  assert.deepEqual(migrated.nodes.delta.children, []);
  assert.equal(legacyTree.children[0].spouse.children.length, 1, 'legacy data should remain untouched');
});

test('insertRelated handles convoluted spouse sibling and parent expansions', () => {
  let tree = {
    nodes: {
      alex: { id: 'alex', name: 'Alex', children: [], spouseId: null, siblingIds: [] }
    },
    rootIds: ['alex']
  };

  const originalRootOrder = [...tree.rootIds];

  const beforeSpouse = tree;
  tree = insertRelated(tree, 'alex', 'spouse', 'Jamie');
  const jamieId = getNewNodeId(beforeSpouse, tree);
  assert.ok(jamieId, 'spouse should get a generated id');
  assert.equal(tree.nodes[jamieId].spouseId, 'alex');
  assert.equal(tree.nodes['alex'].spouseId, jamieId);

  const beforeChild = tree;
  tree = insertRelated(tree, 'alex', 'child', 'Casey');
  const childId = getNewNodeId(beforeChild, tree);
  assert.ok(childId, 'child should get a generated id');
  assert.ok(tree.nodes['alex'].children.includes(childId));
  assert.ok(tree.nodes[jamieId].children.includes(childId));

  const beforeFirstSibling = tree;
  tree = insertRelated(tree, jamieId, 'sibling', 'Unaffiliated Sibling');
  const preParentSiblingId = getNewNodeId(beforeFirstSibling, tree);
  assert.ok(preParentSiblingId, 'pre-parent sibling should get generated id');
  assert.ok(tree.nodes[jamieId].siblingIds.includes(preParentSiblingId));
  assert.ok(tree.nodes[preParentSiblingId].siblingIds.includes(jamieId));
  assert.ok(tree.rootIds.includes(preParentSiblingId));

  const beforeParent = tree;
  tree = insertRelated(tree, jamieId, 'parent', 'Morgan');
  const morganId = getNewNodeId(beforeParent, tree);
  assert.ok(morganId, 'parent should get generated id');
  assert.ok(tree.nodes[morganId].children.includes(jamieId));
  assert.ok(tree.rootIds.includes(morganId));
  assert.ok(!tree.rootIds.includes(jamieId));
  assert.ok(tree.rootIds.includes(preParentSiblingId));

  const beforeSecondSibling = tree;
  tree = insertRelated(tree, jamieId, 'sibling', 'Taylor');
  const postParentSiblingId = getNewNodeId(beforeSecondSibling, tree);
  assert.ok(postParentSiblingId, 'post-parent sibling should get generated id');
  assert.ok(tree.nodes[morganId].children.includes(postParentSiblingId));
  assert.ok(!tree.rootIds.includes(postParentSiblingId));

  const beforePreSiblingParent = tree;
  tree = insertRelated(tree, preParentSiblingId, 'parent', 'Riley');
  const preSiblingParentId = getNewNodeId(beforePreSiblingParent, tree);
  assert.ok(preSiblingParentId, 'parent for pre-parent sibling should get generated id');
  assert.ok(tree.nodes[preSiblingParentId].children.includes(preParentSiblingId));
  assert.ok(!tree.rootIds.includes(preParentSiblingId));
  assert.ok(tree.rootIds.includes(preSiblingParentId));

  const beforeSecondParent = tree;
  tree = insertRelated(tree, postParentSiblingId, 'parent', 'Quinn');
  const secondParentId = getNewNodeId(beforeSecondParent, tree);
  assert.ok(secondParentId, 'second parent should get generated id');
  assert.equal(tree.nodes[morganId].spouseId, secondParentId);
  assert.equal(tree.nodes[secondParentId].spouseId, morganId);
  assert.deepEqual(
    [...tree.nodes[morganId].children].sort(),
    [...tree.nodes[secondParentId].children].sort()
  );
  assert.ok(tree.nodes[morganId].children.includes(jamieId));
  assert.ok(tree.nodes[morganId].children.includes(postParentSiblingId));
  assert.ok(!tree.nodes[morganId].children.includes(preParentSiblingId));

  const expectedRootIds = [...new Set([...originalRootOrder, preSiblingParentId, morganId])].sort();
  assert.deepEqual([...tree.rootIds].sort(), expectedRootIds);
});

