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