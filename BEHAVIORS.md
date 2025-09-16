# Family Tree Application Behaviors

This document outlines the expected behaviors and implemented logic for the family tree application.

## 1. Data Structure

- The family tree is stored as a normalized data structure, consisting of a map of person nodes and a list of root node IDs. This structure is more flexible than a simple nested tree and allows for more complex relationships.
- Each person is represented as a "node" object with the following properties: `id`, `name`, `children` (an array of child IDs), `spouseId`, and `siblingIds` (for parent-less siblings).

## 2. Adding People

The user interface provides contextual buttons to add relatives to a selected person.

- **Child:** A child can be added to any person. If the selected person is married, the application treats the child as belonging to the couple, and the visual connection originates from the marriage symbol.
- **Spouse:** A person can have one spouse. Adding a spouse to a person who already has one is not permitted by the UI.
- **Parent:**
    - A person can have a maximum of two parents.
    - If a person has no parents, adding a parent will place the new parent node "above" them. If the person was a top-level node, the new parent becomes the new top-level node.
    - If a person has one parent, adding a second parent will make the new parent the spouse of the existing parent.
    - An attempt to add a third parent is not allowed and will trigger an alert.
- **Sibling:**
    - If a person has parents, adding a sibling will add the new person as another child of those same parents.
    - If a person has no parents (i.e., is a top-level node), adding a sibling creates a special "parent-less sibling" relationship. This is stored in the `siblingIds` array of both nodes.
- **Top-level Person:** New individuals can be added to the top level of the tree, making them new root nodes.

## 3. Visual Layout (Graph View)

The application visualizes the family tree as a graph with the following conventions:

- **Marriage:** Married couples are displayed side-by-side, connected by a small "marriage symbol" node between them.
- **Children:** The connection line for children originates from the marriage symbol of their parents.
- **Parent-less Siblings:** Siblings who do not share a common parent in the tree are connected directly to each other with a dotted line.

## 4. User Interface

- A dropdown menu lists all people in the tree, allowing the user to select a person to interact with.
- A text input field is always visible for entering the name of a new person.
- When a person is selected from the dropdown, a set of contextual buttons (e.g., "Add Child", "Add Parent", "Add Spouse", "Add Sibling") appears, enabling the user to intuitively create new relationships.

## 5. Data Persistence

- The entire family tree is automatically saved to the browser's local storage whenever a change is made.
- The application includes a migration mechanism to automatically convert tree data from the previous nested format to the current normalized format upon loading.

## 6. Deleting People

- Any person can be deleted from the tree.
- Deleting a person will also remove all relationships linked to them (e.g., remove them from a parent's `children` array, clear the `spouseId` of their spouse, and remove them from any `siblingIds` arrays).
