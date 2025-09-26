import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

// Very simple tree layout: positions nodes in layers by depth and spreads siblings horizontally.
// It treats spouse as a paired node rendered next to the person and connected with a short line.

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;
const H_GAP = 40; // base horizontal gap inside each grid cell
const V_GAP = 80; // vertical spacing between generations
const MARRIAGE_NODE_WIDTH = 20;
const MARRIAGE_NODE_HEIGHT = 20;

function computeLayout(root, allNodes) {
  if (!root) return { nodes: [], edges: [], width: 0, height: 0 };

  const nodes = [];
  const edges = [];
  const placedNodes = new Set();
  const nodePositions = new Map();

  // Grid config
  const COL_W = NODE_WIDTH + H_GAP; // each grid column width (node + horizontal margin)
  const ROW_H = NODE_HEIGHT + V_GAP; // each grid row height (node + vertical margin)
  const SPOUSE_SPAN = 3; // spouse left, marriage anchor, spouse right

  const rowOccupancy = new Map();

  function isSlotFree(row, start, span) {
    const occupied = rowOccupancy.get(row);
    if (!occupied) return true;
    for (let col = start; col < start + span; col += 1) {
      if (occupied.has(col)) {
        return false;
      }
    }
    return true;
  }

  function reserveSlot(row, start, span) {
    let occupied = rowOccupancy.get(row);
    if (!occupied) {
      occupied = new Set();
      rowOccupancy.set(row, occupied);
    }
    for (let col = start; col < start + span; col += 1) {
      occupied.add(col);
    }
  }

  function allocateSlot(row, preferredStart, span) {
    let start = Math.max(0, preferredStart);
    while (!isSlotFree(row, start, span)) {
      start += 1;
    }
    reserveSlot(row, start, span);
    return start;
  }

  // First pass: compute subtree width in grid columns
  function measure(node) {
    const childWidths = (node.children || []).map(c => measure(c));
    const childrenCols = childWidths.length
      ? childWidths.reduce((a, b) => a + b, 0)
      : 0;

    const ownCols = node.spouse ? SPOUSE_SPAN : 1; // couple spans 3 columns, single spans 1
    const cols = Math.max(ownCols, childrenCols || ownCols);
    node.__cols = cols;
    node.__childCols = childWidths;
    return cols;
  }

  function place(node, leftCol, depth) {
    if (!node || !node.id) {
      return [leftCol * COL_W + NODE_WIDTH / 2, depth * ROW_H];
    }

    if (placedNodes.has(node.id)) {
      const pos = nodePositions.get(node.id);
      return [pos.x + NODE_WIDTH / 2, pos.y];
    }

    const widthCols = node.__cols;
    const childWidths = node.__childCols || [];
    const children = node.children || [];

    const totalChildCols = childWidths.reduce((acc, w) => acc + w, 0);
    const initialAnchorCol = leftCol + Math.floor((widthCols - 1) / 2);

    const childInfos = [];
    if (children.length) {
      let childLeftCol = initialAnchorCol - Math.floor(totalChildCols / 2);
      children.forEach((child, idx) => {
        const [childCenterX, childTopY] = place(child, childLeftCol, depth + 1);
        const approxStart = Math.round((childCenterX - NODE_WIDTH / 2) / COL_W);
        childInfos.push({
          centerX: childCenterX,
          topY: childTopY,
          startCol: Math.max(0, approxStart),
        });
        childLeftCol += (childWidths[idx] || 0);
      });
    }

    const span = node.spouse ? SPOUSE_SPAN : 1;
    let preferredStartCol = node.spouse ? initialAnchorCol - 1 : initialAnchorCol;

    if (!node.spouse && childInfos.length) {
      const avgStart = Math.round(childInfos.reduce((sum, info) => sum + info.startCol, 0) / childInfos.length);
      preferredStartCol = Math.max(0, avgStart);
    }

    preferredStartCol = Math.max(0, preferredStartCol);

    const startCol = allocateSlot(depth, preferredStartCol, span);
    const anchorCol = node.spouse ? startCol + 1 : startCol;
    const y = depth * ROW_H;

    let parentTopConnectorX;
    let parentTopConnectorY;
    let parentConnectorReturnX;

    if (node.spouse) {
      const personCol = startCol;
      const spouseCol = startCol + 2;

      const px = personCol * COL_W;
      const sx = spouseCol * COL_W;

      nodes.push({ id: node.id, name: node.name, x: px, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      placedNodes.add(node.id);
      nodePositions.set(node.id, { x: px, y, col: personCol });

      if (!placedNodes.has(node.spouse.id)) {
        nodes.push({ id: node.spouse.id, name: node.spouse.name, x: sx, y, width: NODE_WIDTH, height: NODE_HEIGHT, isSpouse: true, partnerId: node.id });
        placedNodes.add(node.spouse.id);
        nodePositions.set(node.spouse.id, { x: sx, y, col: spouseCol });
      } else {
        const existingSpouse = nodes.find(n => n.id === node.spouse.id);
        if (existingSpouse) {
          existingSpouse.x = sx;
          existingSpouse.y = y;
        }
        const existingPos = nodePositions.get(node.spouse.id) || {};
        existingPos.x = sx;
        existingPos.y = y;
        existingPos.col = spouseCol;
        nodePositions.set(node.spouse.id, existingPos);
      }

      const marriageNodeX = anchorCol * COL_W + (NODE_WIDTH - MARRIAGE_NODE_WIDTH) / 2;
      const marriageNodeY = y + NODE_HEIGHT / 2 - MARRIAGE_NODE_HEIGHT / 2;
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

        edges.push({ from: { x: px + NODE_WIDTH, y: y + NODE_HEIGHT / 2 }, to: { x: marriageNodeX, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
        edges.push({ from: { x: spouseCol * COL_W, y: y + NODE_HEIGHT / 2 }, to: { x: marriageNodeX + MARRIAGE_NODE_WIDTH, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
      }

      parentTopConnectorX = anchorCol * COL_W + NODE_WIDTH / 2;
      parentTopConnectorY = marriageNodeY + MARRIAGE_NODE_HEIGHT;
      parentConnectorReturnX = px + NODE_WIDTH / 2;
    } else {
      const nx = startCol * COL_W;
      nodes.push({ id: node.id, name: node.name, x: nx, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      placedNodes.add(node.id);
      nodePositions.set(node.id, { x: nx, y, col: startCol });

      parentTopConnectorX = nx + NODE_WIDTH / 2;
      parentTopConnectorY = y + NODE_HEIGHT;
      parentConnectorReturnX = parentTopConnectorX;
    }

    if (childInfos.length) {
      childInfos.forEach(info => {
        const midY = parentTopConnectorY + V_GAP / 2;
        edges.push({
          poly: [
            { x: parentTopConnectorX, y: parentTopConnectorY },
            { x: parentTopConnectorX, y: midY },
            { x: info.centerX, y: midY },
            { x: info.centerX, y: info.topY },
          ],
        });
      });
    }

    return [parentConnectorReturnX, y];
  }

  // Place all root nodes on row 0, left to right with no extra spacing
  if (root.name === '' && (root.children || []).length) {
    (root.children || []).forEach(child => measure(child));
    let curLeftCol = 0;
    (root.children || []).forEach(child => {
      const w = child.__cols || measure(child);
      place(child, curLeftCol, 0);
      curLeftCol += w; // adjacent placement; each cell already has inner gap
    });
  } else {
    measure(root);
    place(root, 0, 0);
  }

  // Add sibling edges between placed node centers (dotted)
  allNodes.forEach(node => {
    if (node.siblingIds) {
      node.siblingIds.forEach(siblingId => {
        if (node.id < siblingId) { // Avoid duplicate edges
          const a = nodes.find(n => n.id === node.id);
          const b = nodes.find(n => n.id === siblingId);
          if (a && b) {
            edges.push({
              from: { x: a.x + NODE_WIDTH / 2, y: a.y + NODE_HEIGHT / 2 },
              to: { x: b.x + NODE_WIDTH / 2, y: b.y + NODE_HEIGHT / 2 },
              type: 'sibling'
            });
          }
        }
      });
    }
  });

  // Shift the entire layout right if any node lands in negative space so everything stays visible
  if (nodes.length) {
    const minNodeX = Math.min(...nodes.map(n => n.x));
    if (minNodeX < 0) {
      const offsetX = -minNodeX + H_GAP;
      nodes.forEach(n => {
        n.x += offsetX;
      });
      edges.forEach(edge => {
        if (edge.poly) {
          edge.poly.forEach(point => {
            point.x += offsetX;
          });
        } else {
          edge.from.x += offsetX;
          edge.to.x += offsetX;
        }
      });
    }
  }

  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x + n.width)) : 0;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y + n.height)) : 0;
  const safeWidth = Math.max(400, Math.ceil(maxX + H_GAP));
  const safeHeight = Math.max(240, Math.ceil(maxY + V_GAP));

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
    return <div>No people yet - add someone at top level to begin.</div>;
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

