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
    
    // Store original position to restore after drag
    this.originalPosition = null;
    this.originalTransform = null;
    this.selectedShape = null;
  }

  /**
   * Initialize transform parameters in the code
   */
  initializeTransformParameters() {
    this.codeUpdater.addTransformParametersToCode();
  }

  /**
   * Handle the start of a transform operation
   */
  onTransformStart(initialTransform, selectedShape) {
    console.log('TransformManager: Transform started');
    
    // Store the original transform state and shape reference
    this.originalTransform = initialTransform;
    this.selectedShape = selectedShape;
    
    // Store original position to restore after drag
    this.originalPosition = selectedShape.position ? selectedShape.position.clone() : new THREE.Vector3();
    
    // Reset displacement tracking for this operation
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
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
    if (this.originalPosition && this.selectedShape && this.selectedShape.position) {
      this.selectedShape.position.copy(this.originalPosition);
    }
    
    // Update the parametric code with the total displacement
    this.updateCodeWithTransform();
  }

  /**
   * Handle rotation transform
   */
  handleRotation([angle, center, axis]) {
    console.log('TransformManager: Handling rotation:', { angle, center, axis });
    
    // Log the transform command
    this.logTransformCommand('rotate', [angle, center, axis]);
    
    // For now, we'll just log rotation commands
    // TODO: Implement rotation parameter updates in the code
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
    // Update the code with the new translation parameters
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
   * Reset the transform manager state
   */
  reset() {
    this.totalDisplacement = { x: 0, y: 0, z: 0 };
    this.originalPosition = null;
    this.originalTransform = null;
    this.selectedShape = null;
    console.log('TransformManager: Reset state');
  }

  /**
   * Get the current transform state for debugging
   */
  getTransformState() {
    return {
      totalDisplacement: this.totalDisplacement,
      originalPosition: this.originalPosition,
      selectedShape: this.selectedShape
    };
  }
} 