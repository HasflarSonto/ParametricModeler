import * as THREE from 'three';
import { CodeAnalyzer } from './CodeAnalyzer.js';

/**
 * MeshSelector handles the complex mesh reference management and selection logic
 */
export class MeshSelector {
  constructor() {
    this.selectedMeshRef = null;
    this.actualMeshRef = null;
    this.gumballPositionRef = null;
    
    // Track selection state to persist across rebuilds
    this.lastFaceSelected = null;
    this.lastEdgeSelected = null;
    this.lastShapeGeometryRef = null;
    
    // Track mesh by unique identifiers
    this.meshIdentifier = null;
    this.meshVersion = 0;

    // Code context tracking for selection-aware modifications
    this.selectedObjectName = null;        // Variable name in code (e.g., "vase", "wateringCan")
    this.selectedObjectPath = null;        // Path to object in code (e.g., "shape" in return {shape: wateringCan})
    this.codeContext = null;               // Full code context for analysis
    this.codeAnalyzer = new CodeAnalyzer(); // Code analysis instance
  }

  /**
   * Get the actual Three.js mesh from a ShapeGeometry component
   */
  getActualMesh(shapeGeometryRef) {
    if (!shapeGeometryRef) {
      return null;
    }
    
    // The ShapeGeometry component contains the actual mesh in its children
    // We need to find the mesh that has the geometry and material
    const mesh = shapeGeometryRef;
    
    // If the ref is already a Three.js mesh, return it
    if (mesh.isMesh || mesh.isLineSegments) {
      return mesh;
    }
    
    // Otherwise, look for the mesh in the children
    if (mesh.children && mesh.children.length > 0) {
      // Find the first mesh or lineSegments object
      for (let i = 0; i < mesh.children.length; i++) {
        const child = mesh.children[i];
        if (child.isMesh || child.isLineSegments) {
          return child;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate a unique identifier for a mesh based on its properties
   */
  generateMeshIdentifier(mesh) {
    if (!mesh) return null;
    
    try {
      // Create a unique identifier based on mesh properties
      const geometry = mesh.geometry;
      const material = mesh.material;
      
      let identifier = '';
      
      // Add geometry info
      if (geometry) {
        identifier += `geo:${geometry.type}:${geometry.uuid}`;
      }
      
      // Add material info
      if (material) {
        if (Array.isArray(material)) {
          identifier += `:mat:${material.length}:${material[0]?.uuid || 'unknown'}`;
        } else {
          identifier += `:mat:${material.uuid || 'unknown'}`;
        }
      }
      
      // Add mesh type
      identifier += `:type:${mesh.type}`;
      
      return identifier;
    } catch (error) {
      console.error('Error generating mesh identifier:', error);
      return null;
    }
  }

  /**
   * Check if a mesh is the same as the previously tracked mesh
   */
  isSameMesh(newMesh) {
    if (!newMesh || !this.meshIdentifier) return false;
    
    const newIdentifier = this.generateMeshIdentifier(newMesh);
    return newIdentifier === this.meshIdentifier;
  }

  /**
   * Calculate the center of the selected geometry
   */
  getSelectedGeometryCenter(actualMesh) {
    if (!actualMesh) return null;
    
    try {
      const mesh = actualMesh;
      const geometry = mesh.geometry;
      
      if (!geometry) return null;
      
      // Calculate bounding box
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      
      if (!boundingBox) return null;
      
      // Get center of bounding box
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      
      // Transform to world coordinates
      mesh.updateMatrixWorld();
      center.applyMatrix4(mesh.matrixWorld);
      
      return center;
      
    } catch (error) {
      console.error('Error calculating geometry center:', error);
      return null;
    }
  }

  /**
   * Create or update the gumball positioning object
   */
  createGumballPositionObject(actualMesh) {
    let center = this.getSelectedGeometryCenter(actualMesh);
    
    if (!center) {
      center = new THREE.Vector3(0, 0, 0);
    }
    
    // Create a temporary object for the gumball to attach to
    if (!this.gumballPositionRef) {
      this.gumballPositionRef = new THREE.Object3D();
      this.gumballPositionRef.name = 'GumballPosition';
      this.gumballPositionRef.visible = false; // Make it invisible
    }
    
    // Position it at the center of the selected geometry
    this.gumballPositionRef.position.copy(center);
    
    return this.gumballPositionRef;
  }

  /**
   * Update the mesh references when selection changes
   */
  updateMeshReferences(shapeGeometryRef, faceSelected = null, edgeSelected = null) {
    // Store the current selection state
    this.lastFaceSelected = faceSelected;
    this.lastEdgeSelected = edgeSelected;
    this.lastShapeGeometryRef = shapeGeometryRef;
    
    const actualMesh = this.getActualMesh(shapeGeometryRef);
    
    // Check if this is a new mesh or the same mesh after rebuild
    const isNewMesh = !this.isSameMesh(actualMesh);
    
    if (isNewMesh) {
      this.meshIdentifier = this.generateMeshIdentifier(actualMesh);
      this.meshVersion++;
    }
    
    this.actualMeshRef = actualMesh;
    
    if (actualMesh) {
      // Create or update the gumball positioning object
      this.createGumballPositionObject(actualMesh);
    }
  }

  /**
   * Get the gumball position object
   */
  getGumballPositionObject() {
    return this.gumballPositionRef;
  }

  /**
   * Get the actual mesh reference
   */
  getActualMeshRef() {
    return this.actualMeshRef;
  }

  /**
   * Get the last known selection state
   */
  getLastSelectionState() {
    return {
      faceSelected: this.lastFaceSelected,
      edgeSelected: this.lastEdgeSelected,
      shapeGeometryRef: this.lastShapeGeometryRef
    };
  }

  /**
   * Check if we have a valid mesh selection
   */
  hasValidSelection() {
    return this.actualMeshRef !== null && this.gumballPositionRef !== null;
  }

  /**
   * Check if we have a persistent selection that should be restored
   */
  hasPersistentSelection() {
    return (this.lastFaceSelected !== null || this.lastEdgeSelected !== null) && 
           this.meshIdentifier !== null;
  }

  /**
   * Reset all references
   */
  reset() {
    this.selectedMeshRef = null;
    this.actualMeshRef = null;
    this.gumballPositionRef = null;
    this.lastFaceSelected = null;
    this.lastEdgeSelected = null;
    this.lastShapeGeometryRef = null;
    this.meshIdentifier = null;
    this.meshVersion = 0;
    this.resetCodeContext();
  }

  /**
   * Clean up the gumball position object
   */
  cleanup() {
    if (this.gumballPositionRef && this.gumballPositionRef.parent) {
      this.gumballPositionRef.parent.remove(this.gumballPositionRef);
      this.gumballPositionRef = null;
    }
  }

  /**
   * Update code context when selection changes
   */
  updateCodeContext(code, shapeGeometryRef, faceSelected, edgeSelected) {
    try {
      // Analyze the code to understand its structure
      const analysis = this.codeAnalyzer.analyzeCode(code);
      this.codeContext = analysis;
      
      // Determine which object corresponds to the selection
      this.selectedObjectName = this.codeAnalyzer.determineSelectedObject(
        analysis, 
        shapeGeometryRef, 
        faceSelected, 
        edgeSelected
      );
      
      // Determine the object path in complex return statements
      this.selectedObjectPath = this.codeAnalyzer.determineObjectPath(
        analysis, 
        this.selectedObjectName
      );
      
      // Show the actual return statement and object identification
      if (analysis.returnStatements && analysis.returnStatements.length > 0) {
        const returnStmt = analysis.returnStatements[0];
        console.log('📋 Return:', returnStmt.value.substring(0, 50) + (returnStmt.value.length > 50 ? '...' : ''));
        console.log('📋 Type:', returnStmt.type);
      }
      
      console.log('🎯 Object:', this.selectedObjectName || 'none');
      if (this.selectedObjectPath) {
        console.log('📁 Path:', this.selectedObjectPath);
      }
      
      if (this.selectedObjectName) {
        console.log('✅ Ready for selection-aware modification');
      } else {
        console.log('❌ No object identified');
      }
      
    } catch (error) {
      console.error('Error updating code context:', error);
      this.selectedObjectName = null;
      this.selectedObjectPath = null;
      this.codeContext = null;
    }
  }

  /**
   * Get the current selection context for code modification
   */
  getSelectionContext() {
    return {
      selectedObjectName: this.selectedObjectName,
      selectedObjectPath: this.selectedObjectPath,
      codeContext: this.codeContext,
      hasValidSelection: this.hasValidSelection(),
      meshIdentifier: this.meshIdentifier
    };
  }

  /**
   * Check if we have valid code context for modification
   */
  hasValidCodeContext() {
    return this.selectedObjectName !== null && this.codeContext !== null;
  }

  /**
   * Reset code context
   */
  resetCodeContext() {
    this.selectedObjectName = null;
    this.selectedObjectPath = null;
    this.codeContext = null;
  }
} 