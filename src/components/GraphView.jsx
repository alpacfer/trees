import React, { useMemo } from 'react'

// Very simple tree layout: positions nodes in layers by depth and spreads siblings horizontally.
// It treats spouse as a paired node rendered next to the person and connected with a short line.

const NODE_WIDTH = 140
const NODE_HEIGHT = 48
const H_GAP = 40
const V_GAP = 80

function computeLayout(root){
  if(!root) return { nodes: [], edges: [], width: 0, height: 0 }

  const nodes = []
  const edges = []

  // First pass: compute subtree widths for simple tidy layout
  function measure(node){
    const childWidths = (node.children||[]).map(measure)
    const totalChildrenWidth = childWidths.reduce((a,b)=>a+b, 0)
    const selfWidth = NODE_WIDTH + (node.spouse ? NODE_WIDTH + H_GAP/2 : 0)
    const width = Math.max(selfWidth, childWidths.length ? totalChildrenWidth + H_GAP*(childWidths.length-1) : selfWidth)
    node.__measure = { width }
    return width
  }

  const totalWidth = measure(root)

  // Second pass: assign positions
  function place(node, left, depth){
    const width = node.__measure.width
    const centerX = left + width/2
    const x = centerX - NODE_WIDTH/2
    const y = depth * (NODE_HEIGHT + V_GAP)

    nodes.push({ id: node.id, name: node.name, x, y, width: NODE_WIDTH, height: NODE_HEIGHT })

    if(node.spouse){
      const sx = x + NODE_WIDTH + H_GAP/2
      const sy = y
      nodes.push({ id: node.spouse.id, name: node.spouse.name, x: sx, y: sy, width: NODE_WIDTH, height: NODE_HEIGHT, isSpouse: true, partnerId: node.id })
      // spouse edge
      edges.push({ from: { x: x+NODE_WIDTH, y: y+NODE_HEIGHT/2 }, to: { x: sx, y: sy+NODE_HEIGHT/2 } })
    }

    // children
    const children = node.children || []
    if(children.length){
      // compute total width occupied by children
      const childWidths = children.map(c=>c.__measure.width)
      const totalChildrenWidth = childWidths.reduce((a,b)=>a+b, 0) + H_GAP*(children.length-1)
      let curLeft = centerX - totalChildrenWidth/2

      // vertical connector from parent bottom to children level
      const parentTopConnectorX = x + NODE_WIDTH/2
      const parentTopConnectorY = y + NODE_HEIGHT

      children.forEach((child, idx)=>{
        const cw = child.__measure.width
        const childLeft = curLeft
        place(child, childLeft, depth+1)

        // find child node center after placement
        const childCenterX = childLeft + cw/2
        const childTopY = (depth+1)*(NODE_HEIGHT+V_GAP)

        // draw from parent center-bottom to child center-top as orthogonal polyline via mid level
        const midY = parentTopConnectorY + V_GAP/2
        edges.push(
          { poly: [
            { x: parentTopConnectorX, y: parentTopConnectorY },
            { x: parentTopConnectorX, y: midY },
            { x: childCenterX, y: midY },
            { x: childCenterX, y: childTopY }
          ] }
        )

        curLeft += cw + H_GAP
      })
    }
  }

  // If root has no name, treat its children as top-level and skip rendering the root box
  if(root.name==='' && (root.children||[]).length){
    const pseudoRoot = { __measure: { width: (root.children||[]).reduce((a,c)=> a + (c.__measure.width), 0) + H_GAP*Math.max(0,(root.children||[]).length-1) } }
    const width = pseudoRoot.__measure.width
    let curLeft = 0
    (root.children||[]).forEach(child =>{
      const cw = child.__measure.width
      place(child, curLeft, 0)
      curLeft += cw + H_GAP
    })
  } else {
    place(root, 0, 0)
  }

  // compute overall bounds
  const maxX = nodes.length ? Math.max(...nodes.map(n=>n.x + n.width)) : 0
  const maxY = nodes.length ? Math.max(...nodes.map(n=>n.y + n.height)) : 0
  const safeWidth = Math.max(400, Math.ceil(maxX + 40))
  const safeHeight = Math.max(240, Math.ceil(maxY + 40))

  return { nodes, edges, width: safeWidth, height: safeHeight }
}

export default function GraphView({ tree, onSelect, selectedId }){
  // If the tree is the invisible root with no people, render an empty state
  if(!tree){
    return <div>No tree yet — create one above.</div>
  }
  if(tree.name==='' && (!tree.children || tree.children.length===0)){
    return <div>No people yet — add someone at top level to begin.</div>
  }
  function normalize(node){
    if(!node || typeof node !== 'object') return null
    const normalized = {
      id: node.id,
      name: typeof node.name === 'string' ? node.name : '',
      spouse: (node.spouse && typeof node.spouse === 'object') ? {
        id: node.spouse.id,
        name: typeof node.spouse.name === 'string' ? node.spouse.name : ''
      } : null,
      children: Array.isArray(node.children) ? node.children : []
    }
    normalized.children = normalized.children.map(c=> normalize(c)).filter(Boolean)
    return normalized
  }
  const safeTree = useMemo(()=> normalize(tree), [tree])
  const layout = useMemo(()=>{
    try{
      return computeLayout(safeTree)
    } catch(err){
      console.error('Graph layout error', err)
      return { nodes: [], edges: [], width: 600, height: 400 }
    }
  }, [safeTree])
  return (
    <div className="graph-container">
      <svg width={layout.width} height={layout.height}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#64748b" />
          </marker>
        </defs>

        {layout.edges.map((e, i)=>{
          if(e.poly){
            const d = e.poly.map((p, idx)=> idx===0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')
            return <path key={i} d={d} className="edge" />
          }
          return <line key={i} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} className="edge" />
        })}

        {layout.nodes.map(n=> (
          <g key={n.id} className={`node ${selectedId===n.id? 'selected': ''}`} transform={`translate(${n.x},${n.y})`} onClick={()=> onSelect && onSelect(n.id)}>
            <rect className="node-box" width={n.width} height={n.height} rx="8" ry="8" />
            <text x={n.width/2} y={n.height/2} dominantBaseline="middle" textAnchor="middle" className="node-label">{n.name}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}


