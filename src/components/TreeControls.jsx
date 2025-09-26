import React, { useState } from 'react';
import PropTypes from 'prop-types';

const TreeControls = ({ tree, selectedPersonId, onAddPerson, onAddTopLevel, onResetTree, onDeletePerson }) => {
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
      <div className="controls__header">
        <div>
          <h2>Build your tree</h2>
          <p className="controls__hint">Changes are saved automatically in this browser.</p>
        </div>
        <button type="button" className="button button--ghost" onClick={onResetTree}>Start fresh</button>
      </div>

      <div className="controls__grid">
        <label className="field controls__field">
          <span className="field__label">Focus on a person</span>
          <select className="field__input" value={selectedPersonId || ''} onChange={e => onSelectPerson(e.target.value || null)}>
            <option value="">-- select person --</option>
            {tree && Object.values(tree.nodes).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="field controls__field controls__field--name">
          <span className="field__label">New person's name</span>
          <input
            className="field__input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Alex Garcia"
          />
        </label>

        <div className="controls__actions">
          {selectedPersonId ? (
            <>
              <div className="controls__actions-title">Add relative</div>
              <div className="controls__button-grid">
                <button type="button" disabled={!newName} onClick={() => handleAdd('child')} className="button">Child</button>
                <button type="button" disabled={!newName} onClick={() => handleAdd('parent')} className="button">Parent</button>
                <button type="button" disabled={!newName} onClick={() => handleAdd('spouse')} className="button">Spouse</button>
                <button type="button" disabled={!newName} onClick={() => handleAdd('sibling')} className="button">Sibling</button>
              </div>
              <button type="button" className="button button--danger" onClick={onDeletePerson}>Delete selected person</button>
            </>
          ) : (
            <p className="controls__hint">Select someone above to add relatives around them.</p>
          )}
        </div>
      ) : (
        <p className="controls__hint controls__hint--compact">Select someone above to add relatives around them.</p>
      )}
    </div>
  );
};

TreeControls.propTypes = {
  tree: PropTypes.shape({
      nodes: PropTypes.object.isRequired,
      rootIds: PropTypes.array.isRequired,
  }).isRequired,
  selectedPersonId: PropTypes.string,
  onAddPerson: PropTypes.func.isRequired,
  onAddTopLevel: PropTypes.func.isRequired,
  onResetTree: PropTypes.func.isRequired,
  onDeletePerson: PropTypes.func.isRequired,
};

export default TreeControls;
