import React, { useState, useEffect } from 'react';
import GraphView from './GraphView';
import PersonNode from './PersonNode';
import TreeControls from './TreeControls';
import { uid, insertRelated, deletePerson as deletePersonUtil } from '../lib/treeUtils';

const TreeEditor = () => {
  const [tree, setTree] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [newName, setNewName] = useState('');
  const [relation, setRelation] = useState('child'); // child,parent,sibling,spouse
  const [useGraph] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('family-tree');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setTree(parsed);
          return;
        }
      } catch (e) { /* ignore and fall through to init */ }
    }
    // initialize a single, invisible root container (name empty)
    setTree({ id: uid(), name: '', children: [], spouse: null });
  }, []);

  useEffect(() => {
    localStorage.setItem('family-tree', JSON.stringify(tree));
  }, [tree]);

  const resetTree = () => {
    if (!confirm('This will delete the entire tree. Continue?')) return;
    const empty = { id: uid(), name: '', children: [], spouse: null };
    setTree(empty);
    setSelectedPersonId(null);
    localStorage.setItem('family-tree', JSON.stringify(empty));
  }

  const handleAddPerson = () => {
    if (relation && !selectedPersonId) {
      alert('Select a person first');
      return;
    }
    if (relation === '') {
      // top-level add under invisible root; auto-init if tree missing
      setTree(t => {
        const base = t && typeof t === 'object' ? t : { id: uid(), name: '', children: [], spouse: null };
        return { ...base, children: [...(base.children || []), { id: uid(), name: newName, children: [], spouse: null }] };
      });
      setNewName('');
      return;
    }
    const newTree = insertRelated(tree, selectedPersonId, relation, newName);
    setTree(newTree);
    setNewName('');
  }

  const handleAddTopLevel = () => {
    setTree(t => {
      const base = t && typeof t === 'object' ? t : { id: uid(), name: '', children: [], spouse: null };
      return { ...base, children: [...(base.children || []), { id: uid(), name: newName, children: [], spouse: null }] };
    });
    setNewName('');
  }

  const handleDeletePerson = (id) => {
      const newTree = deletePersonUtil(tree, id);
      setTree(newTree);
      if (selectedPersonId === id) {
          setSelectedPersonId(null);
      }
  }

  const renderTree = () => {
    if (!tree) return <div>No tree yet — create one above.</div>;
    if (useGraph) {
      return (
        <div className="tree graph-view">
          <GraphView tree={tree} onSelect={setSelectedPersonId} selectedId={selectedPersonId} />
        </div>
      );
    } else {
      return (
        <div className="tree">
          <PersonNode person={tree} onSelect={setSelectedPersonId} selectedId={selectedPersonId} onDelete={handleDeletePerson} />
        </div>
      );
    }
  }

  return (
    <div className="tree-editor">
      <TreeControls
        tree={tree}
        selectedPersonId={selectedPersonId}
        newName={newName}
        relation={relation}
        onSelectPerson={setSelectedPersonId}
        onNewNameChange={setNewName}
        onRelationChange={setRelation}
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
