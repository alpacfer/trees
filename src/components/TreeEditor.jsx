import React, { useState, useEffect } from 'react';
import GraphView from './GraphView';
import PersonNode from './PersonNode';
import TreeControls from './TreeControls';
import { uid, insertRelated, deletePerson as deletePersonUtil, migrateTree } from '../lib/treeUtils';

const TreeEditor = () => {
  const [tree, setTree] = useState({ nodes: {}, rootIds: [] });
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [useGraph] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('family-tree');
    if (raw) {
      try {
        let parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Migration from old format
          if (parsed.id && parsed.children) {
            parsed = migrateTree(parsed);
          }
          setTree(parsed);
          return;
        }
      } catch (e) { /* ignore and fall through to init */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('family-tree', JSON.stringify(tree));
  }, [tree]);

  const resetTree = () => {
    if (!confirm('This will delete the entire tree. Continue?')) return;
    const empty = { nodes: {}, rootIds: [] };
    setTree(empty);
    setSelectedPersonId(null);
    localStorage.setItem('family-tree', JSON.stringify(empty));
  }

  const handleAddPerson = (relation, newName) => {
    if (!selectedPersonId) {
      alert('Select a person first');
      return;
    }
    const newTree = insertRelated(tree, selectedPersonId, relation, newName);
    setTree(newTree);
  }

  const handleAddTopLevel = (newName) => {
    if (!newName) return;
    const newId = uid();
    const newNode = { id: newId, name: newName, children: [], spouseId: null };
    setTree(t => ({
      ...t,
      nodes: { ...t.nodes, [newId]: newNode },
      rootIds: [...t.rootIds, newId],
    }));
  }

  const handleDeletePerson = (id) => {
      const newTree = deletePersonUtil(tree, id);
      setTree(newTree);
      if (selectedPersonId === id) {
          setSelectedPersonId(null);
      }
  }

  const renderTree = () => {
    if (Object.keys(tree.nodes).length === 0) return <div>No tree yet — create one above.</div>;
    if (useGraph) {
      return (
        <div className="tree graph-view">
          <GraphView tree={tree} onSelect={setSelectedPersonId} selectedId={selectedPersonId} />
        </div>
      );
    } else {
      // PersonNode will need to be refactored to work with the new tree structure
      return <div>Tree view not supported with new data structure yet.</div>;
    }
  }

  return (
    <div className="tree-editor">
      <TreeControls
        tree={tree}
        selectedPersonId={selectedPersonId}
        onSelectPerson={setSelectedPersonId}
        onAddPerson={handleAddPerson}
        onAddTopLevel={handleAddTopLevel}
        onResetTree={resetTree}
      />

      <div className="trees">
        {renderTree()}
      </div>
    </div>
  );
};

export default TreeEditor;
