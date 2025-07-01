# Gumball System - Modular Architecture

This directory contains the refactored gumball system, split into multiple modules for better maintainability and separation of concerns.

## Architecture Overview

The gumball system is now split into several focused modules:

### Core Components

1. **`Gumball.jsx`** - Main orchestrator component
   - Manages the lifecycle of other modules
   - Provides clean interface to the rest of the application
   - Handles initialization and cleanup

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

4. **`CodeUpdater.js`** - Code modification logic
   - Updates parametric code with transform parameters
   - Handles code parsing and modification
   - Triggers rebuilds after code changes
   - Manages parameter extraction and injection

5. **`MeshSelector.js`** - Mesh reference management
   - Handles complex mesh reference tracking
   - Calculates geometry centers
   - Manages gumball positioning objects
   - Provides clean mesh access interface

## Key Improvements

### Separation of Concerns
- **UI Logic**: Isolated in `GumballCore.jsx`
- **Business Logic**: Centralized in `TransformManager.js`
- **Code Updates**: Handled by `CodeUpdater.js`
- **Mesh Management**: Managed by `MeshSelector.js`

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

## Usage

```jsx
import { Gumball } from '../components-3d/gumball';

// Simple usage
<Gumball 
  selectedShape={meshObject}
  mode="translate"
  size={0.5}
/>
```

## Goals Achieved

1. **Smooth Movement**: Transform controls work directly with mesh objects
2. **Code Integration**: Movement is converted to parametric code updates
3. **Maintainability**: Each module can be tested and modified independently
4. **Reliability**: Reduced complexity leads to fewer bugs and edge cases

## Future Enhancements

- Add support for rotation and scale parameters in code
- Implement transform history/undo functionality
- Add transform preview modes
- Support for multiple object selection
- Batch transform operations 