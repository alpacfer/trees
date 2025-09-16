import React, { useState } from 'react';
import PropTypes from 'prop-types';

const PersonNode = ({ person, onSelect, selectedId, onDelete }) => {
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === person.id;

  return (
    <div className={`person-node ${isSelected ? 'selected' : ''}`}>
      <div className="person-row">
        <button onClick={() => setOpen(o => !o)} className="toggle">{open ? "-" : "+"}</button>
        <div className="person-name" onClick={() => onSelect(person.id)}>{person.name}</div>
        <div className="person-actions">
          <button onClick={() => onDelete(person.id)}>Delete</button>
        </div>
      </div>
      {person.spouse && (
        <div className="spouse">Spouse: <span onClick={() => onSelect(person.spouse.id)} className="person-name">{person.spouse.name}</span></div>
      )}
      {open && person.children && person.children.length > 0 && (
        <div className="children">
          {person.children.map(child => (
            <PersonNode key={child.id} person={child} onSelect={onSelect} selectedId={selectedId} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

PersonNode.propTypes = {
  person: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    spouse: PropTypes.object,
    children: PropTypes.array,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
  selectedId: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
};

export default PersonNode;