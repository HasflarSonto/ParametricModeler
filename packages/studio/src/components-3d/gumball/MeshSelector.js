import * as THREE from 'three';

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
  }

  /**
   * Get the actual Three.js mesh from a ShapeGeometry component
   */
  getActualMesh(shapeGeometryRef) {
    console.log('=== getActualMesh called ===');
    console.log('shapeGeometryRef:', shapeGeometryRef);
    
    if (!shapeGeometryRef) {
      console.log('No shapeGeometryRef provided');
      return null;
    }
    
    // The ShapeGeometry component contains the actual mesh in its children
    // We need to find the mesh that has the geometry and material
    const mesh = shapeGeometryRef;
    
    console.log('Mesh type:', mesh.type);
    console.log('Mesh isMesh:', mesh.isMesh);
    console.log('Mesh isLineSegments:', mesh.isLineSegments);
    console.log('Mesh position:', mesh.position);
    console.log('Mesh children:', mesh.children);
    
    // If the ref is already a Three.js mesh, return it
    if (mesh.isMesh || mesh.isLineSegments) {
      console.log('Returning mesh directly:', mesh);
      return mesh;
    }
    
    // Otherwise, look for the mesh in the children
    if (mesh.children && mesh.children.length > 0) {
      console.log('Looking through children...');
      // Find the first mesh or lineSegments object
      for (let i = 0; i < mesh.children.length; i++) {
        const child = mesh.children[i];
        console.log(`Child ${i}:`, child.type, child.isMesh, child.isLineSegments, child.position);
        if (child.isMesh || child.isLineSegments) {
          console.log('Found mesh child:', child);
          return child;
        }
      }
    }
    
    console.log('No mesh found, returning null');
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
      
      console.log('Selected geometry center:', center);
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
      console.log('No center found, using origin');
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
    
    console.log('Gumball position object created at:', center);
    return this.gumballPositionRef;
  }

  /**
   * Update the mesh references when selection changes
   */
  updateMeshReferences(shapeGeometryRef, faceSelected = null, edgeSelected = null) {
    console.log('=== Selection changed ===');
    console.log('shapeGeometryRef:', shapeGeometryRef);
    console.log('faceSelected:', faceSelected);
    console.log('edgeSelected:', edgeSelected);
    
    // Store the current selection state
    this.lastFaceSelected = faceSelected;
    this.lastEdgeSelected = edgeSelected;
    this.lastShapeGeometryRef = shapeGeometryRef;
    
    const actualMesh = this.getActualMesh(shapeGeometryRef);
    
    // Check if this is a new mesh or the same mesh after rebuild
    const isNewMesh = !this.isSameMesh(actualMesh);
    
    if (isNewMesh) {
      console.log('New mesh detected, updating identifier');
      this.meshIdentifier = this.generateMeshIdentifier(actualMesh);
      this.meshVersion++;
    } else {
      console.log('Same mesh detected after rebuild');
    }
    
    this.actualMeshRef = actualMesh;
    console.log('Actual mesh reference updated:', actualMesh);
    console.log('Mesh identifier:', this.meshIdentifier);
    console.log('Mesh version:', this.meshVersion);
    
    if (actualMesh) {
      console.log('Mesh position:', actualMesh.position);
      console.log('Mesh world position:', actualMesh.getWorldPosition(new THREE.Vector3()));
      
      // Calculate and log the center of selected geometry
      const center = this.getSelectedGeometryCenter(actualMesh);
      if (center) {
        console.log('Selected geometry center:', center);
      }
      
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
    console.log('MeshSelector: Reset all references');
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
} 