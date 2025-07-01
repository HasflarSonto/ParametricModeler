import * as THREE from 'three';
import { CodeUpdater } from './CodeUpdater.js';

/**
 * TransformManager handles the accumulation of transforms and coordinates
 * between the gumball and the code updater
 */
export class TransformManager {
  constructor(store) {
    this.store = store;
    this.codeUpdater = new CodeUpdater(store);
    
    // Track total displacement with simple vector addition
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
    
    // Track total rotation accumulation
    this.totalRotation = { angle: 0, axis: [0, 0, 1] };
    
    // Store original position to restore after drag
    this.originalPosition = null;
    this.originalTransform = null;
    this.selectedShape = null;

    // Selection context for code modification
    this.selectedObjectName = null;
    this.selectedObjectPath = null;
    this.selectionContext = null;

    // Flag to prevent multiple initializations
    this.transformParametersInitialized = false;
  }

  /**
   * Initialize transform parameters in the code
   */
  initializeTransformParameters() {
    // Prevent multiple initializations
    if (this.transformParametersInitialized) {
      console.log('Transform parameters already initialized, skipping');
      return;
    }
    
    console.log('Initializing transform parameters');
    this.codeUpdater.addTransformParametersToCode();
    this.transformParametersInitialized = true;
  }

  /**
   * Handle the start of a transform operation
   */
  onTransformStart(initialTransform, selectedShape, meshSelector = null) {
    console.log('🚀 TransformManager: Transform started');
    
    // Store the original transform state and shape reference
    this.originalTransform = initialTransform;
    this.selectedShape = selectedShape;
    
    // Store original position to restore after drag
    this.originalPosition = selectedShape.position ? selectedShape.position.clone() : new THREE.Vector3();
    
    // Get selection context from MeshSelector if provided
    if (meshSelector) {
      this.selectionContext = meshSelector.getSelectionContext();
      this.selectedObjectName = this.selectionContext.selectedObjectName;
      this.selectedObjectPath = this.selectionContext.selectedObjectPath;
      
      console.log('🎯 Transform will modify object:', this.selectedObjectName);
      if (this.selectedObjectPath) {
        console.log('📁 Object path in return statement:', this.selectedObjectPath);
      }
      console.log('Selection context loaded:', this.selectionContext);
    }
    
    // Reset displacement tracking for this operation
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
    
    // Reset rotation tracking for this operation
    this.totalRotation = { angle: 0, axis: [0, 0, 1] };
  }

  /**
   * Handle transform changes during drag
   */
  onTransformChange() {
    // This could be used for preview updates if needed
    console.log('TransformManager: Transform changed');
  }

  /**
   * Handle the end of a transform operation
   */
  onTransformEnd(transformData) {
    console.log('TransformManager: Transform ended with data:', transformData);
    
    if (!transformData) return;

    switch (transformData.type) {
      case 'translate':
        this.handleTranslation(transformData.values);
        break;
      case 'rotate':
        this.handleRotation(transformData.values);
        break;
      case 'scale':
        this.handleScale(transformData.values);
        break;
    }
  }

  /**
   * Handle translation transform
   */
  handleTranslation([x, y, z]) {
    console.log('TransformManager: Handling translation:', { x, y, z });
    
    // Add to running total (simple vector addition)
    this.totalDisplacement.x += x;
    this.totalDisplacement.y += y;
    this.totalDisplacement.z += z;
    
    console.log('Total displacement:', this.totalDisplacement);
    
    // Log the transform command
    this.logTransformCommand('translate', [x, y, z]);
    this.logTotalDisplacement();
    
    // Restore the original position immediately
    // COMMENTED OUT: Allow mesh to move visually during drag
    // if (this.originalPosition && this.selectedShape && this.selectedShape.position) {
    //   this.selectedShape.position.copy(this.originalPosition);
    // }
    
    // Update the parametric code with the total displacement
    this.updateCodeWithTransform();
  }

  /**
   * Handle rotation transform
   */
  handleRotation([angle, center, axis]) {
    console.log('TransformManager: Handling rotation:', { angle, center, axis });
    
    // Accumulate rotation (simple angle addition for same axis)
    if (this.totalRotation.axis[0] === axis[0] && 
        this.totalRotation.axis[1] === axis[1] && 
        this.totalRotation.axis[2] === axis[2]) {
      // Same axis, add angles
      this.totalRotation.angle += angle;
    } else {
      // Different axis, replace (simplified approach)
      this.totalRotation.angle = angle;
      this.totalRotation.axis = [...axis];
    }
    
    console.log('Total rotation:', this.totalRotation);
    
    // Log the transform command
    this.logTransformCommand('rotate', [angle, center, axis]);
    this.logTotalRotation();
    
    // Update the parametric code with the accumulated rotation
    this.updateCodeWithRotation();
  }

  /**
   * Handle scale transform
   */
  handleScale([scale, center]) {
    console.log('TransformManager: Handling scale:', { scale, center });
    
    // Log the transform command
    this.logTransformCommand('scale', [scale, center]);
    
    // For now, we'll just log scale commands
    // TODO: Implement scale parameter updates in the code
  }

  /**
   * Update the code with the current transform
   */
  updateCodeWithTransform() {
    // Try selection-aware code modification first
    if (this.hasValidSelectionContext()) {
      console.log('Using selection-aware code modification');
      const success = this.codeUpdater.updateSelectedObjectTransform(
        this.selectedObjectName,
        this.selectedObjectPath,
        'translate',
        [this.totalDisplacement.x, this.totalDisplacement.y, this.totalDisplacement.z]
      );
      
      if (success) {
        // Get the updated code and trigger a rebuild
        const currentCode = this.store.code.current;
        this.codeUpdater.triggerRebuild(currentCode);
        
        // Reset the total displacement tracking after successful update
        this.totalDisplacement = { x: 0, y: 0, z: 0 };
        console.log('Reset total displacement tracking');
        
        console.log('Selection-aware transform completed');
        return;
      } else {
        console.log('Selection-aware modification failed, falling back to original method');
      }
    }
    
    // Fallback to original method
    console.log('Using original code modification method');
    const success = this.codeUpdater.updateTranslationParams(this.totalDisplacement);
    
    if (success) {
      // Get the updated code and trigger a rebuild
      const currentCode = this.store.code.current;
      this.codeUpdater.triggerRebuild(currentCode);
      
      // Reset the total displacement tracking after successful update
      this.totalDisplacement = { x: 0, y: 0, z: 0 };
      console.log('Reset total displacement tracking');
      
      // Note: The mesh will be recreated by the parametric system
      // The MeshSelector should handle tracking the new mesh and restoring selection
      console.log('Transform completed, mesh will be recreated by parametric system');
    }
  }

  /**
   * Update the code with the current rotation
   */
  updateCodeWithRotation() {
    // Try selection-aware code modification first
    if (this.hasValidSelectionContext()) {
      console.log('Using selection-aware rotation code modification');
      const success = this.codeUpdater.updateSelectedObjectTransform(
        this.selectedObjectName,
        this.selectedObjectPath,
        'rotate',
        [this.totalRotation.angle, [this.totalRotation.axis[0], this.totalRotation.axis[1], this.totalRotation.axis[2]]]
      );
      
      if (success) {
        // Get the updated code and trigger a rebuild
        const currentCode = this.store.code.current;
        this.codeUpdater.triggerRebuild(currentCode);
        
        // Reset the total rotation tracking after successful update
        this.totalRotation = { angle: 0, axis: [0, 0, 1] };
        console.log('Reset total rotation tracking');
        
        console.log('Selection-aware rotation completed');
        return;
      } else {
        console.log('Selection-aware rotation modification failed, falling back to original method');
      }
    }
    
    // Fallback to original method
    console.log('Using original rotation code modification method');
    const success = this.codeUpdater.updateRotationParams(this.totalRotation.angle, this.totalRotation.axis);
    
    if (success) {
      // Get the updated code and trigger a rebuild
      const currentCode = this.store.code.current;
      this.codeUpdater.triggerRebuild(currentCode);
      
      // Reset the total rotation tracking after successful update
      this.totalRotation = { angle: 0, axis: [0, 0, 1] };
      console.log('Reset total rotation tracking');
      
      // Note: The mesh will be recreated by the parametric system
      // The MeshSelector should handle tracking the new mesh and restoring selection
      console.log('Rotation completed, mesh will be recreated by parametric system');
    }
  }

  /**
   * Log a transform command
   */
  logTransformCommand(transformType, values) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Generated Transform Command:`);
    console.log(`// ${transformType} command for selected shape`);
    
    switch (transformType) {
      case 'translate':
        const [x, y, z] = values;
        console.log(`shape.translate([${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]);`);
        break;
      case 'rotate':
        const [angle, rotateCenter, axis] = values;
        console.log(`shape.rotate(${angle.toFixed(2)}, [${rotateCenter[0].toFixed(2)}, ${rotateCenter[1].toFixed(2)}, ${rotateCenter[2].toFixed(2)}], [${axis[0].toFixed(2)}, ${axis[1].toFixed(2)}, ${axis[2].toFixed(2)}]);`);
        break;
      case 'scale':
        const [scale, scaleCenter] = values;
        console.log(`shape.scale([${scaleCenter[0].toFixed(2)}, ${scaleCenter[1].toFixed(2)}, ${scaleCenter[2].toFixed(2)}], ${scale.toFixed(2)});`);
        break;
    }
    console.log('---');
  }

  /**
   * Log the total displacement
   */
  logTotalDisplacement() {
    const total = this.totalDisplacement;
    console.log(`// TOTAL DISPLACEMENT from original position:`);
    console.log(`shape.translate([${total.x.toFixed(2)}, ${total.y.toFixed(2)}, ${total.z.toFixed(2)}]);`);
    console.log('---');
  }

  /**
   * Log the total rotation
   */
  logTotalRotation() {
    const total = this.totalRotation;
    console.log(`// TOTAL ROTATION from original rotation:`);
    console.log(`shape.rotate(${total.angle.toFixed(2)}, [${total.axis[0].toFixed(2)}, ${total.axis[1].toFixed(2)}, ${total.axis[2].toFixed(2)}]);`);
    console.log('---');
  }

  /**
   * Reset all transform state
   */
  reset() {
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
    this.totalRotation = { angle: 0, axis: [0, 0, 1] };
    this.originalPosition = null;
    this.originalTransform = null;
    this.selectedShape = null;
    this.selectedObjectName = null;
    this.selectedObjectPath = null;
    this.selectionContext = null;
    this.transformParametersInitialized = false;
    console.log('TransformManager: Reset all transform state');
  }

  /**
   * Get the current transform state for debugging
   */
  getTransformState() {
    return {
      totalDisplacement: this.totalDisplacement,
      totalRotation: this.totalRotation,
      originalPosition: this.originalPosition,
      selectedShape: this.selectedShape
    };
  }

  /**
   * Set selection context manually
   */
  setSelectionContext(selectionContext) {
    this.selectionContext = selectionContext;
    this.selectedObjectName = selectionContext.selectedObjectName;
    this.selectedObjectPath = selectionContext.selectedObjectPath;
    console.log('🔄 TransformManager: Selection context set');
    console.log('  Object Name:', this.selectedObjectName);
    console.log('  Object Path:', this.selectedObjectPath);
    console.log('  Has Valid Context:', this.hasValidSelectionContext());
  }

  /**
   * Check if we have valid selection context for code modification
   */
  hasValidSelectionContext() {
    return this.selectedObjectName !== null && this.selectionContext !== null;
  }
} 