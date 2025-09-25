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

  // First pass: compute subtree width in grid columns
  function measure(node) {
    const childWidths = (node.children || []).map(c => measure(c));
    // Combine child subtree widths with one grid-gap column between siblings
    // Grid approach: each occupied cell is a node or a marriage symbol.
    // Siblings should be adjacent with no extra blank columns between them.
    const childrenCols = childWidths.length
      ? childWidths.reduce((a, b) => a + b, 0)
      : 0;

    const ownCols = node.spouse ? SPOUSE_SPAN : 1; // couple spans 3 columns, single spans 1
    const cols = Math.max(ownCols, childrenCols || ownCols);
    node.__cols = cols;
    node.__childCols = childWidths;
    return cols;
  }

  // Second pass: assign concrete coordinates per grid column/row
  function place(node, leftCol, depth) {
    if (placedNodes.has(node.id)) {
      const pos = nodePositions.get(node.id);
      return [pos.x + NODE_WIDTH / 2, pos.y];
    }

    const widthCols = node.__cols;
    const anchorCol = leftCol + Math.floor((widthCols - 1) / 2); // center column for this subtree
    const y = depth * ROW_H;

    let parentTopConnectorX, parentTopConnectorY; // where children edges originate

    if (node.spouse) {
      // Couple occupies [anchor-1] (person), [anchor] (marriage), [anchor+1] (spouse)
      const personCol = anchorCol - 1;
      const spouseCol = anchorCol + 1;

      const px = personCol * COL_W;
      const sx = spouseCol * COL_W;

      // Place person
      nodes.push({ id: node.id, name: node.name, x: px, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      placedNodes.add(node.id);
      nodePositions.set(node.id, { x: px, y });

      // Place spouse (avoid duplicates if already placed from the other side)
      if (!placedNodes.has(node.spouse.id)) {
        nodes.push({ id: node.spouse.id, name: node.spouse.name, x: sx, y, width: NODE_WIDTH, height: NODE_HEIGHT, isSpouse: true, partnerId: node.id });
        placedNodes.add(node.spouse.id);
        nodePositions.set(node.spouse.id, { x: sx, y });
      } else {
        const existingSpouse = nodes.find(n => n.id === node.spouse.id);
        if (existingSpouse) existingSpouse.y = y;
        nodePositions.set(node.spouse.id, { x: nodePositions.get(node.spouse.id).x, y });
      }

      // Marriage node inside the anchor cell, centered
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

        // Couple edges to marriage symbol
        edges.push({ from: { x: px + NODE_WIDTH, y: y + NODE_HEIGHT / 2 }, to: { x: marriageNodeX, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
        edges.push({ from: { x: (spouseCol * COL_W), y: y + NODE_HEIGHT / 2 }, to: { x: marriageNodeX + MARRIAGE_NODE_WIDTH, y: marriageNodeY + MARRIAGE_NODE_HEIGHT / 2 } });
      }

      parentTopConnectorX = anchorCol * COL_W + NODE_WIDTH / 2; // center of the anchor cell
      parentTopConnectorY = marriageNodeY + MARRIAGE_NODE_HEIGHT; // bottom of marriage node
    } else {
      // Single parent occupies the anchor column
      const nx = anchorCol * COL_W;
      nodes.push({ id: node.id, name: node.name, x: nx, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      placedNodes.add(node.id);
      nodePositions.set(node.id, { x: nx, y });

      parentTopConnectorX = nx + NODE_WIDTH / 2;
      parentTopConnectorY = y + NODE_HEIGHT;
    }

    // Place children subtrees centered beneath parent anchor, with 1 grid column between siblings
    const children = node.children || [];
    if (children.length) {
      const childCols = children.map(c => c.__cols);
      const totalChildrenCols = childCols.reduce((a, b) => a + b, 0);
      let curLeftCol = anchorCol - Math.floor(totalChildrenCols / 2);

      children.forEach((child, idx) => {
        const childWidth = childCols[idx];
        const childConnectorPoint = place(child, curLeftCol, depth + 1);

        const childCenterX = childConnectorPoint[0];
        const childTopY = childConnectorPoint[1];

        // Orthogonal edge: down from marriage (or node), across, then down
        const midY = parentTopConnectorY + V_GAP / 2;
        edges.push({
          poly: [
            { x: parentTopConnectorX, y: parentTopConnectorY },
            { x: parentTopConnectorX, y: midY },
            { x: childCenterX, y: midY },
            { x: childCenterX, y: childTopY }
          ]
        });

        // Move to the next child immediately; no extra gap column
        curLeftCol += childWidth;
      });
    }

    // Return the top connector of this node (for parent's edge routing)
    if (node.spouse) {
      const marriageNodeX = anchorCol * COL_W + (NODE_WIDTH - MARRIAGE_NODE_WIDTH) / 2;
      const marriageNodeY = y + NODE_HEIGHT / 2 - MARRIAGE_NODE_HEIGHT / 2;
      return [marriageNodeX + MARRIAGE_NODE_WIDTH / 2, y];
    }
    return [anchorCol * COL_W + NODE_WIDTH / 2, y];
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

  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x + n.width)) : 0;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y + n.height)) : 0;
  const safeWidth = Math.max(400, Math.ceil(maxX + H_GAP));
  const safeHeight = Math.max(240, Math.ceil(maxY + V_GAP));

  return { nodes, edges, width: safeWidth, height: safeHeight };
}function denormalizeTree(tree) {
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



