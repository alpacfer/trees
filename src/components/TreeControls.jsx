import React, { useState } from 'react';
import PropTypes from 'prop-types';

const TreeControls = ({ tree, selectedPersonId, onSelectPerson, onAddPerson, onAddTopLevel, onResetTree, onDeletePerson }) => {
  const [newName, setNewName] = useState('');

  const handleAdd = (relation) => {
    if (!newName) return;
    onAddPerson(relation, newName);
    setNewName('');
  };

  const handleAddTopLevel = () => {
    if (!newName) return;
    onAddTopLevel(newName);
    setNewName('');
  };

  return (
    <div className="controls">
      <button onClick={onResetTree}>Start fresh</button>
      <select value={selectedPersonId || ''} onChange={e => onSelectPerson(e.target.value || null)}>
        <option value="">-- select person --</option>
        {tree && Object.values(tree.nodes).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
        }
      </select>

      <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New person's name" />

      {selectedPersonId && (
        <div className="add-buttons">
          <button disabled={!newName} onClick={() => handleAdd('child')}>Add Child</button>
          <button disabled={!newName} onClick={() => handleAdd('parent')}>Add Parent</button>
          <button disabled={!newName} onClick={() => handleAdd('spouse')}>Add Spouse</button>
          <button disabled={!newName} onClick={() => handleAdd('sibling')}>Add Sibling</button>
          <button onClick={onDeletePerson} style={{ marginLeft: '10px', backgroundColor: '#ef4444', color: 'white' }}>Delete Person</button>
        </div>
      )}

      <button disabled={!newName} onClick={handleAddTopLevel}>Add at top-level</button>
    </div>
  );
};

TreeControls.propTypes = {
  tree: PropTypes.shape({
      nodes: PropTypes.object.isRequired,
      rootIds: PropTypes.array.isRequired,
  }).isRequired,
  selectedPersonId: PropTypes.string,
  onSelectPerson: PropTypes.func.isRequired,
  onAddPerson: PropTypes.func.isRequired,
  onAddTopLevel: PropTypes.func.isRequired,
  onResetTree: PropTypes.func.isRequired,
  onDeletePerson: PropTypes.func.isRequired,
};

export default TreeControls;
