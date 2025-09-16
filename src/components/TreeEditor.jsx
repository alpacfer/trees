import React, { useState, useEffect } from 'react'
import GraphView from './GraphView'

function uid(){
  return Math.random().toString(36).slice(2,9)
}

function PersonNode({person, onSelect, selectedId, onDelete}){
  const [open, setOpen] = useState(true)
  const isSelected = selectedId===person.id
  return (
    <div className={`person-node ${isSelected? 'selected': ''}`}>
      <div className="person-row">
        <button onClick={()=>setOpen(o=>!o)} className="toggle">{open?"-":"+"}</button>
        <div className="person-name" onClick={()=>onSelect(person.id)}>{person.name}</div>
        <div className="person-actions">
          <button onClick={()=>onDelete(person.id)}>Delete</button>
        </div>
      </div>
      {person.spouse && (
        <div className="spouse">Spouse: <span onClick={()=>onSelect(person.spouse.id)} className="person-name">{person.spouse.name}</span></div>
      )}
      {open && person.children && person.children.length>0 && (
        <div className="children">
          {person.children.map(child => (
            <PersonNode key={child.id} person={child} onSelect={onSelect} selectedId={selectedId} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TreeEditor(){
  const [tree, setTree] = useState(null)
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [newName, setNewName] = useState('')
  const [relation, setRelation] = useState('child') // child,parent,sibling,spouse
  const [useGraph] = useState(true)

  useEffect(()=>{
    const raw = localStorage.getItem('family-tree')
    if(raw){
      try{
        const parsed = JSON.parse(raw)
        if(parsed && typeof parsed === 'object'){
          setTree(parsed)
          return
        }
      }catch(e){/* ignore and fall through to init */}
    }
    // initialize a single, invisible root container (name empty)
    setTree({ id: uid(), name: '', children: [], spouse: null })
  },[])

  useEffect(()=>{
    localStorage.setItem('family-tree', JSON.stringify(tree))
  },[tree])

  function resetTree(){
    if(!confirm('This will delete the entire tree. Continue?')) return
    const empty = { id: uid(), name: '', children: [], spouse: null }
    setTree(empty)
    setSelectedPersonId(null)
    localStorage.setItem('family-tree', JSON.stringify(empty))
  }

  // no explicit create root; tree is always present with an invisible root

  // helpers to find and update nodes immutably
  function cloneTree(){
    return tree ? JSON.parse(JSON.stringify(tree)) : null
  }

  function findNodeById(id){
    if(!tree) return null
    const stack = [tree]
    while(stack.length){
      const n = stack.shift()
      if(n.id===id) return n
      if(n.children) stack.push(...n.children)
    }
    return null
  }

  function insertRelated(targetId, relationType, name){
    if(!tree) return
    const copied = cloneTree()

    function walk(node, parent=null){
      const isTargetNode = node.id===targetId || (node.spouse && node.spouse.id===targetId)
      if(isTargetNode){
        if(relationType==='child'){
          node.children = node.children || []
          node.children.push({ id: uid(), name, children: [], spouse: null })
        } else if(relationType==='parent'){
          const newParent = { id: uid(), name, children: [node], spouse: null }
          if(parent==null){
            // node was root
            return newParent // signal root replacement
          } else {
            const idx = parent.children.findIndex(c=>c.id===node.id)
            if(idx>=0) parent.children[idx] = newParent
          }
        } else if(relationType==='sibling'){
          if(parent==null){
            // add another top-level sibling -> convert to artificial root? For simplicity, add as child of root
            node.children = node.children || []
            // fallback: add as another child of root
            if(copied) copied.children = copied.children || []
            copied.children.push({ id: uid(), name, children: [], spouse: null })
          } else {
            parent.children = parent.children || []
            parent.children.push({ id: uid(), name, children: [], spouse: null })
          }
        } else if(relationType==='spouse'){
          if(!node.spouse){
            node.spouse = { id: uid(), name }
          }
        }
        return false
      }
      if(node.children) for(const c of node.children){
        const res = walk(c, node)
        if(res===true) return true
        if(res && res.id) return res
      }
      return false
    }

    const res = walk(copied, null)
    if(res && res.id){
      // root replaced
      setTree(res)
    } else {
      setTree(copied)
    }
  }

  function deletePerson(id){
    if(!tree) return
    if(tree && id===tree.id){
      setTree(null)
      if(selectedPersonId===id) setSelectedPersonId(null)
      return
    }
    function walk(node, parent=null){
      if(node.id===id){
        if(parent==null){
          // deleting root
          setTree(null)
          return true
        } else {
          const idx = parent.children.findIndex(c=>c.id===id)
          if(idx>=0){
            parent.children.splice(idx,1)
            return true
          }
        }
      }
      if(node.spouse && node.spouse.id===id){
        node.spouse = null
        return true
      }
      if(node.children) for(const c of node.children) if(walk(c, node)) return true
      return false
    }
    const copied = cloneTree()
    const changed = walk(copied, null)
    if(changed){
      setTree(copied)
    }
    if(selectedPersonId===id) setSelectedPersonId(null)
  }

  // render tree with selectable nodes
  function renderTree(){
    if(!tree) return <div>No tree yet — create one above.</div>
    if(useGraph){
      return (
        <div className="tree graph-view">
          <GraphView tree={tree} onSelect={setSelectedPersonId} selectedId={selectedPersonId} />
        </div>
      )
    } else {
      return (
        <div className="tree">
          <PersonNode person={tree} onSelect={setSelectedPersonId} selectedId={selectedPersonId} onDelete={deletePerson} />
        </div>
      )
    }
  }

  return (
    <div className="tree-editor">
      {/* no create tree UI; single tree exists by default */}

      <div className="controls">
        <button onClick={resetTree}>Start fresh</button>
        <select value={selectedPersonId || ''} onChange={e=>setSelectedPersonId(e.target.value || null)}>
          <option value="">-- select person --</option>
          {tree ? (function(){
            const list = []
            ;(function walk(n, prefix=''){
              if(n.name){
                list.push({ id: n.id, label: prefix + n.name })
              }
              if(n.children) for(const c of n.children) walk(c, prefix + '--')
              if(n.spouse) list.push({ id: n.spouse.id, label: prefix + n.spouse.name + ' (spouse)' })
            })(tree)
            return list
          })().map(p=> <option key={p.id} value={p.id}>{p.label}</option>) : null}
        </select>

        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="New person's name" />
        <select value={relation} onChange={e=>setRelation(e.target.value)}>
          <option value="child">Child</option>
          <option value="parent">Parent</option>
          <option value="sibling">Sibling</option>
          <option value="spouse">Spouse</option>
        </select>
        <button onClick={()=>{ if(relation && !selectedPersonId){ alert('Select a person first') ; return } if(!newName){ alert('Enter a name for the new person'); return } if(relation===''){
            // top-level add under invisible root; auto-init if tree missing
            setTree(t=> {
              const base = t && typeof t === 'object' ? t : { id: uid(), name: '', children: [], spouse: null }
              return { ...base, children: [...(base.children||[]), { id: uid(), name: newName, children: [], spouse: null }] }
            })
            setNewName('')
            return
          } insertRelated(selectedPersonId, relation, newName); setNewName('') }}>Add person</button>
        <button onClick={()=>{ setTree(t=> {
              const base = t && typeof t === 'object' ? t : { id: uid(), name: '', children: [], spouse: null }
              return { ...base, children: [...(base.children||[]), { id: uid(), name: newName || 'Person', children: [], spouse: null }] }
            }); setNewName('') }}>Add at top-level</button>
      </div>

      <div className="trees">
        {renderTree()}
      </div>
    </div>
  )
}
