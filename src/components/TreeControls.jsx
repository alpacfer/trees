import React from 'react';
import PropTypes from 'prop-types';

const TreeControls = ({ tree, selectedPersonId, newName, relation, onSelectPerson, onNewNameChange, onRelationChange, onAddPerson, onAddTopLevel, onResetTree }) => {
  return (
    <div className="controls">
      <button onClick={onResetTree}>Start fresh</button>
      <select value={selectedPersonId || ''} onChange={e => onSelectPerson(e.target.value || null)}>
        <option value="">-- select person --</option>
        {tree ? (function() {
          const list = [];
          (function walk(n, prefix = '') {
            if (n.name) {
              list.push({ id: n.id, label: prefix + n.name });
            }
            if (n.children) for (const c of n.children) walk(c, prefix + '--');
            if (n.spouse) list.push({ id: n.spouse.id, label: prefix + n.spouse.name + ' (spouse)' });
          })(tree);
          return list;
        })().map(p => <option key={p.id} value={p.id}>{p.label}</option>) : null}
      </select>

      <input value={newName} onChange={e => onNewNameChange(e.target.value)} placeholder="New person's name" />
      <select value={relation} onChange={e => onRelationChange(e.target.value)}>
        <option value="child">Child</option>
        <option value="parent">Parent</option>
        <option value="sibling">Sibling</option>
        <option value="spouse">Spouse</option>
      </select>
      <button disabled={!newName} onClick={onAddPerson}>Add person</button>
      <button disabled={!newName} onClick={onAddTopLevel}>Add at top-level</button>
    </div>
  );
};

TreeControls.propTypes = {
  tree: PropTypes.object,
  selectedPersonId: PropTypes.string,
  newName: PropTypes.string.isRequired,
  relation: PropTypes.string.isRequired,
  onSelectPerson: PropTypes.func.isRequired,
  onNewNameChange: PropTypes.func.isRequired,
  onRelationChange: PropTypes.func.isRequired,
  onAddPerson: PropTypes.func.isRequired,
  onAddTopLevel: PropTypes.func.isRequired,
  onResetTree: PropTypes.func.isRequired,
};

export default TreeControls;