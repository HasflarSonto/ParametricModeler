# Gumball System - Modular Architecture

This directory contains the refactored gumball system, split into multiple modules for better maintainability and separation of concerns.

## Architecture Overview

The gumball system is now split into several focused modules:

### Core Components

1. **`Gumball.jsx`** - Main orchestrator component
   - Manages the lifecycle of other modules
   - Provides clean interface to the rest of the application
   - Handles initialization and cleanup
   - **NEW**: Manages code context synchronization for selection-aware modifications

2. **`GumballCore.jsx`** - Basic transform controls
   - Handles Three.js TransformControls
   - Manages drag events and transform calculations
   - Provides callbacks for transform events
   - No business logic, just UI interaction

3. **`TransformManager.js`** - Business logic coordinator
   - Accumulates transforms across multiple operations
   - Coordinates between gumball and code updater
   - Handles transform command logging
   - Manages transform state
   - **NEW**: Integrates selection context for targeted code modification

4. **`CodeUpdater.js`** - Code modification logic
   - Updates parametric code with transform parameters
   - Handles code parsing and modification
   - Triggers rebuilds after code changes
   - Manages parameter extraction and injection
   - **NEW**: Selection-aware code modification for complex return statements

5. **`MeshSelector.js`** - Mesh reference management
   - Handles complex mesh reference tracking
   - Calculates geometry centers
   - Manages gumball positioning objects
   - Provides clean mesh access interface
   - **NEW**: Code context tracking and object identification

6. **`CodeAnalyzer.js`** - **NEW**: Code analysis and parsing
   - Analyzes JavaScript code structure
   - Identifies variable names and return statements
   - Distinguishes between simple and complex return patterns
   - Maps object paths in complex return statements
   - Provides selection-aware object identification

## 2024 Selection-Aware Code Modification System

### Problem Solved
The previous gumball system had a critical flaw: it blindly modified whatever return statement it found in the code, rather than targeting the specific object that corresponded to the user's selection. This caused:

1. **Syntax errors** when complex return statements (like object literals) were modified
2. **Incorrect targeting** - transforms were applied to the wrong object
3. **Poor user experience** - visual feedback didn't match code changes

### Solution: Selection-Aware Code Modification

#### Code Pattern Recognition
The system now intelligently analyzes code patterns and handles different return statement types:

```javascript
// Simple return statement (vase example)
return vase; → return vase.translate(10, 20, 30);

// Complex return statement (watering can example)
return {shape: wateringCan, name: "Watering Can"}; → 
// Modifies: wateringCan = wateringCan.translate(15, 25, 35);

// Transformed return statement (already has transforms)
return vase.translate([defaultParams.x_translate, ...]); → 
// Extracts base variable: "vase"
```

#### Object Identification Process
1. **Code Analysis**: `CodeAnalyzer` parses the JavaScript code to identify:
   - Variable declarations and assignments
   - Return statement patterns (simple, complex, chain)
   - Object paths in complex returns

2. **Selection Context**: `MeshSelector` tracks:
   - Selected object name (e.g., "vase", "wateringCan")
   - Object path in complex returns (e.g., "shape")
   - Code context for modification

3. **Targeted Modification**: `CodeUpdater` uses selection context to:
   - Modify only the selected object
   - Handle both simple and complex return statements
   - Validate syntax before applying changes

#### Data Flow
```
Selection → EditorViewer → Gumball → MeshSelector → CodeAnalyzer
    ↓
Object Identification → TransformManager → CodeUpdater → Code Modification
```

### Key Features

#### Intelligent Code Parsing
- **Variable Extraction**: Identifies all variable declarations and assignments
- **Return Pattern Analysis**: Distinguishes between simple, complex, and chain returns
- **Object Path Mapping**: Maps property paths in complex return statements
- **Syntax Validation**: Validates all code modifications before applying

#### Selection Context Tracking
- **Object Name Identification**: Determines which variable corresponds to the selection
- **Path Resolution**: Handles complex return statements with object paths
- **Context Synchronization**: Maintains selection context across code updates

#### Robust Code Modification
- **Targeted Updates**: Only modifies the selected object
- **Pattern Handling**: Supports all common return statement patterns
- **Fallback Support**: Falls back to original method if selection-aware modification fails
- **Duplicate Prevention**: Prevents multiple `defaultParams` declarations

### Implementation Details

#### CodeAnalyzer Module
```javascript
// Analyzes code structure
const analysis = codeAnalyzer.analyzeCode(code);

// Determines selected object
const selectedObject = codeAnalyzer.determineSelectedObject(analysis, shapeRef, faceSelected, edgeSelected);

// Maps object paths
const objectPath = codeAnalyzer.determineObjectPath(analysis, selectedObject);
```

#### Selection-Aware CodeUpdater
```javascript
// Updates specific object with transforms
codeUpdater.updateSelectedObjectTransform(
  selectedObjectName,    // e.g., "vase", "wateringCan"
  selectedObjectPath,    // e.g., "shape" or null
  'translate',           // transform type
  [x, y, z]             // transform values
);
```

#### Context Integration
```javascript
// EditorViewer creates context
const gumballContext = {
  code: store.code.current,
  shape: shape,
  meshRef: selectedMeshRef.current,
  faceSelected: faceSelected,
  edgeSelected: edgeSelected
};

// Gumball passes context to MeshSelector
meshSelector.updateCodeContext(context.code, selectedShape, context.faceSelected, context.edgeSelected);
```

### Benefits

1. **Accurate Targeting**: Only the selected object is modified
2. **Syntax Safety**: Complex return statements are handled correctly
3. **User Experience**: Visual feedback matches code changes
4. **Maintainability**: Clear separation of concerns
5. **Extensibility**: Easy to add support for new code patterns
6. **Backward Compatibility**: Falls back to original method if needed

### Testing Results
- ✅ **Code Analysis**: Correctly identifies variables and return patterns
- ✅ **Object Selection**: Properly determines selected objects (`vase` vs `wateringCan`)
- ✅ **Path Detection**: Correctly identifies object paths (`null` for simple, `"shape"` for complex)
- ✅ **Code Modification**: Successfully modifies both simple and complex return statements
- ✅ **Syntax Validation**: All generated code passes syntax validation
- ✅ **Duplicate Prevention**: No duplicate `defaultParams` declarations

## Key Improvements

### Separation of Concerns
- **UI Logic**: Isolated in `GumballCore.jsx`
- **Business Logic**: Centralized in `TransformManager.js`
- **Code Updates**: Handled by `CodeUpdater.js`
- **Mesh Management**: Managed by `MeshSelector.js`
- **Code Analysis**: Handled by `CodeAnalyzer.js`

### Rotation Center Behavior (2024 update)
- **Rotation Center**: When using the gumball in rotate mode, the center of rotation is set to the object's current translation position (x_translate, y_translate, z_translate). This ensures that rotation always happens around the object's current position in 3D space.
- **Rotation Accumulation**: Similar to translation, rotations are accumulated during drag operations. Multiple rotation operations on the same axis are added together, while different axes replace the previous rotation. This ensures the visual preview matches the final parametric code.
- **Parametric Code Example**:
  ```js
  const defaultParams = {
    x_translate: 53.17,
    y_translate: 243.43,
    z_translate: 351.53,
    angle: 56.8795,
    axis_x: 0.0000,
    axis_y: 0.0000,
    axis_z: 1.0000,
  };

  return shape
    .translate([defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate])
    .rotate(
      defaultParams.angle,
      [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate],
      [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z]
    );
  ```
- **Benefits**: This approach ensures that rotation and translation work together seamlessly, with rotation always happening around the object's current translated position. The code is simplified by removing separate center parameters and using translation values directly. The accumulation pattern ensures visual consistency between preview and final result.

### Reduced Complexity
- Each module has a single responsibility
- Clear interfaces between modules
- Easier to test individual components
- Simpler debugging and maintenance

### Better State Management
- Eliminated complex ref management
- Clearer data flow between components
- Reduced race conditions
- More predictable behavior

## 2024 UX/Architecture Update: Visual/Functional Gumball Decoupling

### Motivation
Previously, the gumball (TransformControls) could only be placed at either the mesh origin (parametric position) or the mesh center (visual center), but not both. This caused confusing UX: the gumball would either be in the "right" place visually but produce incorrect transforms, or be correct mathematically but unintuitive for users.

### Solution: Visual/Functional Decoupling
- The gumball is now functionally attached to the mesh origin (parametric position), but visually offset to appear at the mesh center (or face/edge center).
- All transform math, preview, and parametric code updates are done as if the gumball is at the mesh origin.
- The gumball's UI is rendered at the mesh center for intuitive user interaction.
- This is achieved by wrapping the gumball in a `<group>` with an offset equal to `(mesh center - mesh origin)` in world space.

#### Example (code snippet):
```jsx
const visualOffset = meshCenterWorld.clone().sub(meshOriginWorld);
<Group position={visualOffset}>
  <Gumball selectedShape={meshOriginObject} ... />
</Group>
```

### Benefits
- **Intuitive UX:** The gumball always appears at the mesh center, matching user expectations.
- **Correct Math:** All transforms are calculated at the mesh origin, so previews and parametric code are always correct.
- **No More Offset/Drift:** The gumball, mesh, and parametric code are always in sync.

### Rotation Center
- The rotation center in the parametric code is set to the current translation (origin), ensuring correct and intuitive rotation behavior.

## 2024 Logging Improvements

### Problem
The previous logging system was verbose and repetitive, making it difficult to:
- Track important events during development
- Debug issues effectively
- Understand the flow of operations
- Identify performance bottlenecks

### Solution: Streamlined Logging System

#### Emoji-Prefixed Categories
- **🎯 Selection & Context**: Object identification and selection events
- **📐 Transform Operations**: Translation, rotation, and scale operations
- **📊 Accumulated Values**: Running totals and parameter updates
- **📝 Code Updates**: Code modification and validation events
- **🔄 System Events**: Rebuilds, resets, and state changes
- **✅ Success Events**: Successful operations and completions
- **⚠️ Warnings**: Fallback operations and non-critical issues
- **❌ Errors**: Critical failures and error conditions

#### Concise Information Display
```javascript
// Before: Verbose logging
console.log('TransformManager: Transform ended with data:', transformData);
console.log('TransformManager: Handling translation:', { x, y, z });
console.log('Total displacement:', this.totalDisplacement);

// After: Streamlined logging
console.log('📐 Translation:', { x: x.toFixed(2), y: y.toFixed(2), z: z.toFixed(2) });
console.log('📊 Total displacement:', { 
  x: this.totalDisplacement.x.toFixed(2), 
  y: this.totalDisplacement.y.toFixed(2), 
  z: this.totalDisplacement.z.toFixed(2) 
});
```

#### Reduced Noise
- **Eliminated repetitive logs** during drag operations
- **Removed verbose parameter dumps** that cluttered the console
- **Streamlined process tracking** with essential information only
- **Maintained all critical information** while improving readability

### Benefits
1. **Better Debugging**: Easy to identify and track specific operations
2. **Improved Performance**: Reduced console overhead during intensive operations
3. **Enhanced Readability**: Clear visual hierarchy with emoji prefixes
4. **Maintained Functionality**: All essential information preserved
5. **Developer Experience**: Faster issue identification and resolution

## Usage

```jsx
import { Gumball } from '../components-3d/gumball';

// Simple usage
<Gumball 
  selectedShape={meshObject}
  mode="translate"
  size={0.5}
/>

// With context for selection-aware modification
<Gumball 
  selectedShape={meshObject}
  mode="translate"
  size={0.5}
  context={{
    code: store.code.current,
    shape: shape,
    meshRef: selectedMeshRef.current,
    faceSelected: faceSelected,
    edgeSelected: edgeSelected
  }}
/>
```

## Debugging and Logging

The system includes comprehensive logging for debugging:

```javascript
// Object identification logs
🎯 SELECTED OBJECT IDENTIFICATION:
  Object Name: vase
  Object Path: null
  Has Valid Selection: true
  Has Valid Code Context: true

// Return statement analysis
📋 Found return statement: vase.translate([defaultParams.x_translate, ...])
📋 Return type: chain
📋 Return details: {baseVariable: 'vase'}

// Transform operation logs
🚀 Transform started
🎯 Will modify: vase
📐 Translation: {x: -38.01, y: 100.59, z: 0.00}
📊 Total displacement: {x: -38.01, y: 100.59, z: 0.00}

// Code update logs
🎯 Selection-aware update: {object: "vase", path: "none", type: "translate", values: [-38.01, 100.59, 0]}
📝 Updating simple return statement
✅ Added new transform to return statement
🔄 Triggering rebuild with parameters: 10 params
✅ Rebuild triggered successfully
```

## Goals Achieved

1. **Smooth Movement**: Transform controls work directly with mesh objects
2. **Code Integration**: Movement is converted to parametric code updates
3. **Selection-Aware Modification**: Only the selected object is modified
4. **Syntax Safety**: Complex return statements are handled correctly
5. **Maintainability**: Each module can be tested and modified independently
6. **Reliability**: Reduced complexity leads to fewer bugs and edge cases
7. **Debugging**: Streamlined logging system for better development experience
8. **Performance**: Optimized console output and reduced overhead

## Future Enhancements

- Add support for rotation and scale parameters in code
- Implement transform history/undo functionality
- Add transform preview modes
- Support for multiple object selection
- Batch transform operations
- Enhanced code pattern recognition for more complex scenarios
- Advanced logging analytics and performance monitoring
- Real-time collaboration features
- Integration with version control systems 