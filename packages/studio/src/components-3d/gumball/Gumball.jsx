import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useEditorStore from '../../visualiser/editor/useEditorStore';

import GumballCore from './GumballCore.jsx';
import { TransformManager } from './TransformManager.js';
import { MeshSelector } from './MeshSelector.js';

const Gumball = ({ 
  selectedShape, 
  mode = 'translate',
  size = 0.5,
  onTransformStart,
  onTransformChange,
  onTransformEnd,
  context = null
}) => {
  const store = useEditorStore();
  const transformManagerRef = useRef(null);
  const meshSelectorRef = useRef(null);
  const lastSelectedShapeRef = useRef(null);
  const lastContextRef = useRef(null);
  
  // Initialize managers
  useEffect(() => {
    if (!transformManagerRef.current) {
      transformManagerRef.current = new TransformManager(store);
    }
    if (!meshSelectorRef.current) {
      meshSelectorRef.current = new MeshSelector();
    }
  }, [store]);

  // Track mesh changes and handle recreation
  useEffect(() => {
    if (selectedShape !== lastSelectedShapeRef.current) {
      lastSelectedShapeRef.current = selectedShape;
      
      // Initialize transform parameters when shape changes
      if (selectedShape && transformManagerRef.current) {
        transformManagerRef.current.initializeTransformParameters();
      }
    }
  }, [selectedShape]);

  // Handle code context synchronization
  useEffect(() => {
    if (context && context !== lastContextRef.current) {
      lastContextRef.current = context;
      
      // Update mesh selector with code context
      if (meshSelectorRef.current && context.code) {
        meshSelectorRef.current.updateCodeContext(
          context.code,
          selectedShape,
          context.faceSelected || null,
          context.edgeSelected || null
        );
        
        // Pass selection context to transform manager
        const selectionContext = meshSelectorRef.current.getSelectionContext();
        if (transformManagerRef.current && selectionContext) {
          transformManagerRef.current.setSelectionContext(selectionContext);
        }
      }
    }
  }, [context, selectedShape]);

  // Listen for parametric system updates and handle mesh recreation
  useEffect(() => {
    const handleCodeUpdate = () => {
      // The mesh will be recreated by the parametric system
      // We need to wait for the new mesh to be available
      setTimeout(() => {
        if (meshSelectorRef.current && meshSelectorRef.current.hasPersistentSelection()) {
          // The MeshSelector should handle tracking the new mesh
          // and the EditorViewer should restore the selection
        }
      }, 100);
    };

    // Listen for code update events
    window.addEventListener('codeUpdated', handleCodeUpdate);
    
    return () => {
      window.removeEventListener('codeUpdated', handleCodeUpdate);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meshSelectorRef.current) {
        meshSelectorRef.current.cleanup();
      }
      if (transformManagerRef.current) {
        transformManagerRef.current.reset();
      }
    };
  }, []);

  // Handle transform events
  const handleTransformStart = (initialTransform) => {
    if (transformManagerRef.current) {
      // Pass mesh selector for selection context
      transformManagerRef.current.onTransformStart(initialTransform, selectedShape, meshSelectorRef.current);
    }
    // Call external handler if provided
    if (onTransformStart) {
      onTransformStart(initialTransform);
    }
  };

  const handleTransformChange = () => {
    if (transformManagerRef.current) {
      transformManagerRef.current.onTransformChange();
    }
    // Call external handler if provided
    if (onTransformChange) {
      onTransformChange();
    }
  };

  const handleTransformEnd = (transformData) => {
    if (transformManagerRef.current) {
      transformManagerRef.current.onTransformEnd(transformData);
    }
    // Call external handler if provided
    if (onTransformEnd) {
      onTransformEnd(transformData);
    }
  };

  // Validate that we have a proper mesh object
  if (!selectedShape || !selectedShape.position || (!selectedShape.isMesh && !selectedShape.isLineSegments && !selectedShape.isObject3D)) {
    console.warn('Gumball: Invalid selectedShape provided:', selectedShape);
    return null;
  }

  return (
    <GumballCore
      selectedShape={selectedShape}
      mode={mode}
      size={size}
      onTransformStart={handleTransformStart}
      onTransformChange={handleTransformChange}
      onTransformEnd={handleTransformEnd}
    />
  );
};

export default Gumball; 