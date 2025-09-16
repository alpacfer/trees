import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

// Very simple tree layout: positions nodes in layers by depth and spreads siblings horizontally.
// It treats spouse as a paired node rendered next to the person and connected with a short line.

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;
const H_GAP = 40;
const V_GAP = 80;
const MARRIAGE_NODE_WIDTH = 20;
const MARRIAGE_NODE_HEIGHT = 20;

function computeLayout(root, allNodes) {
  if (!root) return { nodes: [], edges: [], width: 0, height: 0 };

  const nodes = [];
  const edges = [];
  const placedNodes = new Set();
  const nodePositions = new Map();

  // First pass: compute subtree widths for simple tidy layout
  function measure(node) {
    const childWidths = (node.children || []).map(c => measure(c));
    let totalChildrenWidth = 0;
    for (const w of childWidths) totalChildrenWidth += w;
    const selfWidth = NODE_WIDTH + (node.spouse ? NODE_WIDTH + H_GAP : 0);
    const width = Math.max(selfWidth, childWidths.length ? totalChildrenWidth + H_GAP * (childWidths.length - 1) : selfWidth);
    node.__measure = { width };
    return width;
  }

  measure(root);

  // Second pass: assign positions
  function place(node, left, depth) {
    // If already placed, return existing position
    if (placedNodes.has(node.id)) {
      const pos = nodePositions.get(node.id);
      return [pos.x + NODE_WIDTH / 2, pos.y];
    }

    const width = node.__measure.width;
    const centerX = left + width / 2;
    const x = centerX - (node.spouse ? (NODE_WIDTH * 2 + H_GAP) / 2 : NODE_WIDTH / 2);
    
    // Adjust depth for parents based on their children's positions
    let actualDepth = depth;
    if (node.children && node.children.length > 0) {
      for (let child of node.children) {
        if (placedNodes.has(child.id)) {
          const childPos = nodePositions.get(child.id);
          const childDepth = Math.floor(childPos.y / (NODE_HEIGHT + V_GAP));
          actualDepth = childDepth - 1;
          break;
        }
      }
    }
    
    const y = actualDepth * (NODE_HEIGHT + V_GAP);

    nodes.push({ id: node.id, name: node.name, x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    placedNodes.add(node.id);
    nodePositions.set(node.id, { x, y });

    const parentConnectorPoint = [x + NODE_WIDTH / 2, y];
    let marriageNodeX, marriageNodeY;

    if (node.spouse) {
      let sx, sy;
      if (placedNodes.has(node.spouse.id)) {
        const spousePos = nodePositions.get(node.spouse.id);
        sx = spousePos.x;
        sy = actualDepth * (NODE_HEIGHT + V_GAP);
        
        const existingSpouse = nodes.find(n => n.id === node.spouse.id);
        if (existingSpouse) existingSpouse.y = sy;
        nodePositions.set(node.spouse.id, { x: sx, y: sy });
      } else {
        sx = x + NODE_WIDTH + H_GAP;
        sy = y;
        nodes.push({ id: node.spouse.id, name: node.spouse.name, x: sx, y: sy, width: NODE_WIDTH, height: NODE_HEIGHT, isSpouse: true, partnerId: node.id });
        placedNodes.add(node.spouse.id);
        nodePositions.set(node.spouse.id, { x: sx, y: sy });
      }
      
      marriageNodeX = x + NODE_WIDTH + H_GAP / 2 - MARRIAGE_NODE_WIDTH / 2;
      marriageNodeY = y + NODE_HEIGHT / 2 - MARRIAGE_NODE_HEIGHT / 2;

      const marriageNodeId = `${node.id}-marriage`;
      if (!nodes.find(n => n.id === marriageNodeId)) {
        nodes.push({
          id: marriageNodeId,
          type: 'marriage',
          x: marriageNodeX,
          y: marriageNodeY,
          width: MARRIAGE_NODE_WIDTH,
          height: MARRIAGE_NODE_HEIGHT,
        });

        edges.push({ from: { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 }, to: { x: marriageNodeX, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
        edges.push({ from: { x: sx, y: sy + NODE_HEIGHT / 2 }, to: { x: marriageNodeX + MARRIAGE_NODE_WIDTH, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
      }
    }

    // children
    const children = node.children || [];
    if (children.length) {
      const childWidths = children.map(c => c.__measure.width);
      const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
      let curLeft = centerX - totalChildrenWidth / 2;

      const parentTopConnectorX = node.spouse ? marriageNodeX + MARRIAGE_NODE_WIDTH / 2 : x + NODE_WIDTH / 2;
      const parentTopConnectorY = node.spouse ? marriageNodeY + MARRIAGE_NODE_HEIGHT : y + NODE_HEIGHT;

      children.forEach((child, idx) => {
        const cw = child.__measure.width;
        const childLeft = curLeft;
        const childConnectorPoint = place(child, childLeft, actualDepth + 1);

        const childCenterX = childConnectorPoint[0];
        const childTopY = childConnectorPoint[1];

        const midY = parentTopConnectorY + V_GAP / 2;
        edges.push(
          { poly: [
            { x: parentTopConnectorX, y: parentTopConnectorY },
            { x: parentTopConnectorX, y: midY },
            { x: childCenterX, y: midY },
            { x: childCenterX, y: childTopY }
          ] }
        );

        curLeft += cw + H_GAP;
      });
    }
    return parentConnectorPoint;
  }

  if (root.name === '' && (root.children || []).length) {
    const pseudoRoot = { __measure: { width: (root.children || []).reduce((a, c) => a + (c.__measure.width), 0) + H_GAP * Math.max(0, (root.children || []).length - 1) } };
    let curLeft = 0;
    (root.children || []).forEach(child => {
      const cw = child.__measure.width;
      place(child, curLeft, 0);
      curLeft += cw + H_GAP;
    });
  } else {
    place(root, 0, 0);
  }

  // Add sibling edges
  allNodes.forEach(node => {
      if (node.siblingIds) {
          node.siblingIds.forEach(siblingId => {
              if (node.id < siblingId) { // Avoid duplicate edges
                  const siblingNode = nodes.find(n => n.id === siblingId);
                  const currentNode = nodes.find(n => n.id === node.id);
                  if (siblingNode && currentNode) {
                      edges.push({ 
                          from: { x: currentNode.x + NODE_WIDTH / 2, y: currentNode.y + NODE_HEIGHT / 2 }, 
                          to: { x: siblingNode.x + NODE_WIDTH / 2, y: siblingNode.y + NODE_HEIGHT / 2 },
                          type: 'sibling'
                      });
                  }
              }
          });
      }
  });

  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x + n.width)) : 0;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y + n.height)) : 0;
  const safeWidth = Math.max(400, Math.ceil(maxX + 40));
  const safeHeight = Math.max(240, Math.ceil(maxY + 40));

  return { nodes, edges, width: safeWidth, height: safeHeight };
}

function denormalizeTree(tree) {
  if (!tree || !tree.nodes || !tree.rootIds) {
    return { id: 'root', name: '', children: [] };
  }

  const { nodes, rootIds } = tree;
  const denormalizedNodes = {};

  function buildNode(id) {
    if (denormalizedNodes[id]) return denormalizedNodes[id];

    const sourceNode = nodes[id];
    if (!sourceNode) return null;

    const targetNode = { ...sourceNode, children: [], spouse: null };
    denormalizedNodes[id] = targetNode;

    if (sourceNode.spouseId) {
      const spouseSource = nodes[sourceNode.spouseId];
      if (spouseSource) {
        targetNode.spouse = { ...spouseSource, children: [], spouse: null }; // simplified spouse
        const spouseChildren = spouseSource.children || [];
        const allChildrenIds = [...new Set([...sourceNode.children, ...spouseChildren])];
        targetNode.children = allChildrenIds.map(buildNode).filter(Boolean);
      } else {
        if (sourceNode.children) {
          targetNode.children = sourceNode.children.map(buildNode).filter(Boolean);
        }
      }
    } else {
        if (sourceNode.children) {
            targetNode.children = sourceNode.children.map(buildNode).filter(Boolean);
        }
    }

    return targetNode;
  }

  const invisibleRoot = {
    id: 'root',
    name: '',
    children: rootIds.map(buildNode).filter(Boolean),
  };

  return invisibleRoot;
}

const GraphView = ({ tree, onSelect, selectedId }) => {
  const nestedTree = useMemo(() => denormalizeTree(tree), [tree]);

  const layout = useMemo(() => {
    try {
      return computeLayout(nestedTree, Object.values(tree.nodes));
    } catch (err) {
      console.error('Graph layout error', err);
      return { nodes: [], edges: [], width: 600, height: 400 };
    }
  }, [nestedTree, tree.nodes]);

  if (Object.keys(tree.nodes).length === 0) {
    return <div>No people yet — add someone at top level to begin.</div>;
  }

  return (
    <div className="graph-container">
      <svg width={layout.width} height={layout.height}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#64748b" />
          </marker>
        </defs>

        {layout.edges.map((e, i) => {
          if (e.poly) {
            const d = e.poly.map((p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
            return <path key={i} d={d} className="edge" />;
          }
          return <line key={i} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} className={`edge ${e.type === 'sibling' ? 'sibling-edge' : ''}`} />;
        })}

        {layout.nodes.map(n => {
          if (n.type === 'marriage') {
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <rect className="marriage-node-box" width={n.width} height={n.height} rx="4" ry="4" />
              </g>
            );
          }
          return (
          <g key={n.id} className={`node ${selectedId === n.id ? 'selected' : ''}`} transform={`translate(${n.x},${n.y})`} onClick={() => onSelect && onSelect(n.id)}>
            <rect className="node-box" width={n.width} height={n.height} rx="8" ry="8" />
            <text x={n.width / 2} y={n.height / 2} dominantBaseline="middle" textAnchor="middle" className="node-label">{n.name}</text>
          </g>
        )})
}
      </svg>
    </div>
  );
};

GraphView.propTypes = {
    tree: PropTypes.shape({
        nodes: PropTypes.object.isRequired,
        rootIds: PropTypes.array.isRequired,
    }).isRequired,
    onSelect: PropTypes.func,
    selectedId: PropTypes.string,
};

export default GraphView;
