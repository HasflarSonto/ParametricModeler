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
      return;
    }
    
    this.codeUpdater.addTransformParametersToCode();
    this.transformParametersInitialized = true;
  }

  /**
   * Handle the start of a transform operation
   */
  onTransformStart(initialTransform, selectedShape, meshSelector = null) {
    console.log('🚀 Transform started');
    
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
      
      if (this.selectedObjectName) {
        console.log('🎯 Will modify:', this.selectedObjectName);
      }
    }
    
    // Reset displacement tracking for this operation
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
    
    // Reset rotation tracking for this operation
    this.totalRotation = { angle: 0, axis: [0, 0, 1] };
  }

  /**
   * Handle transform changes during drag
   */
  onTransformChange(transformData) {
    // Update the transform data
    this.currentTransform = transformData;
    
    // Call the change callback if provided
    if (this.onChangeCallback) {
      this.onChangeCallback(transformData);
    }
  }

  /**
   * Handle the end of a transform operation
   */
  onTransformEnd(transformData) {
    console.log('✅ Transform completed');
    
    // Reset the mesh's transform to avoid double application
    if (this.selectedShape) {
      // Reset the mesh's transform to avoid double application
      this.selectedShape.position.set(0, 0, 0);
      this.selectedShape.rotation.set(0, 0, 0);
      this.selectedShape.scale.set(1, 1, 1);
    }
    
    // Reset the total displacement tracking after successful update
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
  }

  /**
   * Handle translation transform
   */
  handleTranslation([x, y, z]) {
    // Accumulate the displacement
    this.totalDisplacement.x += x;
    this.totalDisplacement.y += y;
    this.totalDisplacement.z += z;
    
    // Update the parametric code with the total displacement
    this.updateCodeWithTransform();
  }

  /**
   * Handle rotation transform
   */
  handleRotation([angle, center, axis]) {
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
    
    // Update the parametric code with the accumulated rotation
    this.updateCodeWithRotation();
  }

  /**
   * Handle scale transform
   */
  handleScale([scale, center]) {
    console.log('📏 Scale:', { scale: scale.toFixed(2), center: center.map(v => v.toFixed(2)) });
    
    // For now, we'll just log scale commands
    // TODO: Implement scale parameter updates in the code
  }

  /**
   * Update the code with the current transform
   */
  updateCodeWithTransform() {
    // Try selection-aware code modification first
    if (this.hasValidSelectionContext()) {
      this.codeUpdater.updateSelectedObjectTransform(
        this.selectedObjectName,
        this.selectedObjectPath,
        'translate',
        [this.totalDisplacement.x, this.totalDisplacement.y, this.totalDisplacement.z]
      );
    } else {
      // Fallback to original method
      this.codeUpdater.updateTranslationParams(this.totalDisplacement);
    }
  }

  /**
   * Update the code with the current rotation
   */
  updateCodeWithRotation() {
    // Try selection-aware code modification first
    if (this.hasValidSelectionContext()) {
      this.codeUpdater.updateSelectedObjectTransform(
        this.selectedObjectName,
        this.selectedObjectPath,
        'rotate',
        [this.totalRotation.angle, this.totalRotation.axis[0], this.totalRotation.axis[1], this.totalRotation.axis[2]]
      );
    } else {
      // Fallback to original method
      this.codeUpdater.updateRotationParams(this.totalRotation);
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
    console.log('🔄 TransformManager: Reset all transform state');
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
   * Set selection context for code modification
   */
  setSelectionContext(selectionContext) {
    this.selectionContext = selectionContext;
    this.selectedObjectName = selectionContext.selectedObjectName;
    this.selectedObjectPath = selectionContext.selectedObjectPath;
  }

  /**
   * Check if we have valid selection context for code modification
   */
  hasValidSelectionContext() {
    return this.selectedObjectName !== null && this.selectionContext !== null;
  }
} 