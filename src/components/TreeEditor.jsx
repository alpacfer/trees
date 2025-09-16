import React, { useState, useEffect } from 'react';
import TreeControls from './TreeControls';
import GraphView from './GraphView';
import { insertRelated, deletePerson, migrateTree } from '../lib/treeUtils';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const TreeEditor = () => {
  const [tree, setTree] = useState({ nodes: {}, rootIds: [] });
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [useGraphView] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('family-tree');
    if (stored) {
      try {
        let parsed = JSON.parse(stored);
        
        // Handle legacy format
        if (parsed && typeof parsed === 'object') {
          // If it's the old nested format, migrate it
          if (parsed.id && parsed.children) {
            parsed = migrateTree(parsed);
          }
          setTree(parsed);
          return;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save to localStorage whenever tree changes
  useEffect(() => {
    localStorage.setItem('family-tree', JSON.stringify(tree));
  }, [tree]);

  const handleResetTree = () => {
    if (!confirm('This will delete the entire tree. Continue?')) return;
    const emptyTree = { nodes: {}, rootIds: [] };
    setTree(emptyTree);
    setSelectedPersonId(null);
    localStorage.setItem('family-tree', JSON.stringify(emptyTree));
  };

  const handleAddPerson = (relation, name) => {
    if (!selectedPersonId) {
      alert('Select a person first');
      return;
    }
    
    const newTree = insertRelated(tree, selectedPersonId, relation, name);
    setTree(newTree);
  };

  const handleAddTopLevel = (name) => {
    if (!name) return;
    
    const id = uid();
    const newPerson = {
      id,
      name,
      children: [],
      spouseId: null,
      siblingIds: []
    };
    
    setTree(prevTree => ({
      ...prevTree,
      nodes: {
        ...prevTree.nodes,
        [id]: newPerson
      },
      rootIds: [...prevTree.rootIds, id]
    }));
  };

  const handleDeletePerson = () => {
    if (!selectedPersonId) {
      alert('Select a person first');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this person?')) {
      return;
    }
    
    const newTree = deletePerson(tree, selectedPersonId);
    setTree(newTree);
    setSelectedPersonId(null);
  };

  const renderTree = () => {
    if (Object.keys(tree.nodes).length === 0) {
      return <div>No tree yet — create one above.</div>;
    }
    
    if (useGraphView) {
      return (
        <div className="tree graph-view">
          <GraphView
            tree={tree}
            onSelect={setSelectedPersonId}
            selectedId={selectedPersonId}
          />
        </div>
      );
    }
    
    return <div>Tree view not supported with new data structure yet.</div>;
  };

  return (
    <div className="tree-editor">
      <TreeControls
        tree={tree}
        selectedPersonId={selectedPersonId}
        onSelectPerson={setSelectedPersonId}
        onAddPerson={handleAddPerson}
        onAddTopLevel={handleAddTopLevel}
        onResetTree={handleResetTree}
        onDeletePerson={handleDeletePerson}
      />
      <div className="trees">
        {renderTree()}
      </div>
    </div>
  );
};

export default TreeEditor;