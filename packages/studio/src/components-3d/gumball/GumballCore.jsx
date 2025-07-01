import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GumballCore = ({ 
  selectedShape, 
  mode = 'translate',
  size = 0.5,
  onTransformStart,
  onTransformChange,
  onTransformEnd
}) => {
  const controlsRef = useRef();
  const { camera } = useThree();
  const isDraggingRef = useRef(false);
  const initialTransformRef = useRef(null);
  
  // Track the selected shape to detect changes
  const selectedShapeRef = useRef(null);
  const shapeKeyRef = useRef(0);

  // Validate that we have a proper mesh object
  if (!selectedShape || !selectedShape.position || (!selectedShape.isMesh && !selectedShape.isLineSegments && !selectedShape.isObject3D)) {
    console.warn('GumballCore: Invalid selectedShape provided:', selectedShape);
    return null;
  }

  // Update shape tracking and force re-render when selected shape changes
  useEffect(() => {
    if (selectedShape !== selectedShapeRef.current) {
      selectedShapeRef.current = selectedShape;
      shapeKeyRef.current += 1; // Force re-render of TransformControls
      console.log('Selected shape changed, resetting gumball:', selectedShape);
    }
  }, [selectedShape]);

  // Force TransformControls to update its position when the object changes
  useEffect(() => {
    if (controlsRef.current && selectedShape) {
      const timer = setTimeout(() => {
        if (controlsRef.current && selectedShape) {
          controlsRef.current.reset();
          console.log('TransformControls reset to follow object position');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedShape, shapeKeyRef.current]);

  // Continuously update TransformControls to follow the object
  // COMMENTED OUT: This was preventing visual movement during drag
  // useFrame(() => {
  //   if (controlsRef.current && selectedShape && !isDraggingRef.current) {
  //     const controls = controlsRef.current;
  //     const object = selectedShape;
  //     
  //     // Check if the controls are at the wrong position
  //     if (object.position && controls.object) {
  //       const distance = controls.object.position.distanceTo(object.position);
  //       if (distance > 0.1) {
  //         controls.reset();
  //         console.log('TransformControls repositioned to follow object');
  //       }
  //     }
  //   }
  // });

  const handleMouseDown = () => {
    if (!selectedShape) return;
    
    isDraggingRef.current = true;
    
    // Store initial transform state for this drag operation
    initialTransformRef.current = {
      position: selectedShape.position ? selectedShape.position.clone() : new THREE.Vector3(),
      rotation: selectedShape.rotation ? selectedShape.rotation.clone() : new THREE.Euler(),
      scale: selectedShape.scale ? selectedShape.scale.clone() : new THREE.Vector3(1, 1, 1),
      matrix: selectedShape.matrix ? selectedShape.matrix.clone() : new THREE.Matrix4()
    };
    
    console.log('Transform started - initial state captured');
    
    if (onTransformStart) {
      onTransformStart(initialTransformRef.current);
    }
  };

  const handleChange = () => {
    if (isDraggingRef.current && onTransformChange) {
      onTransformChange();
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current || !initialTransformRef.current || !selectedShape) return;
    
    const current = selectedShape;
    const initial = initialTransformRef.current;

    // Calculate the transform difference
    let transformData = null;
    
    switch (mode) {
      case 'translate':
        if (current.position && initial.position) {
          const displacement = new THREE.Vector3();
          displacement.subVectors(current.position, initial.position);
          
          if (displacement.length() > 0.01) {
            transformData = {
              type: 'translate',
              values: [displacement.x, displacement.y, displacement.z]
            };
          }
        }
        break;

      case 'rotate':
        if (current.rotation && initial.rotation) {
          const individualRotation = new THREE.Euler();
          individualRotation.x = current.rotation.x - initial.rotation.x;
          individualRotation.y = current.rotation.y - initial.rotation.y;
          individualRotation.z = current.rotation.z - initial.rotation.z;
          
          const individualAngleX = THREE.MathUtils.radToDeg(individualRotation.x);
          const individualAngleY = THREE.MathUtils.radToDeg(individualRotation.y);
          const individualAngleZ = THREE.MathUtils.radToDeg(individualRotation.z);
          
          if (Math.abs(individualAngleX) > 1 || Math.abs(individualAngleY) > 1 || Math.abs(individualAngleZ) > 1) {
            const maxAngle = Math.max(Math.abs(individualAngleX), Math.abs(individualAngleY), Math.abs(individualAngleZ));
            let axis, angle;
            if (Math.abs(individualAngleX) === maxAngle) {
              axis = [1, 0, 0];
              angle = individualAngleX;
            } else if (Math.abs(individualAngleY) === maxAngle) {
              axis = [0, 1, 0];
              angle = individualAngleY;
            } else {
              axis = [0, 0, 1];
              angle = individualAngleZ;
            }
            // Use the gumball's position as the center of rotation
            const center = [
              current.position.x,
              current.position.y,
              current.position.z
            ];
            transformData = {
              type: 'rotate',
              values: [angle, center, axis]
            };
          }
        }
        break;

      case 'scale':
        if (current.scale && initial.scale) {
          const individualScaleX = current.scale.x / initial.scale.x;
          const individualScaleY = current.scale.y / initial.scale.y;
          const individualScaleZ = current.scale.z / initial.scale.z;
          const individualScaleFactor = (individualScaleX + individualScaleY + individualScaleZ) / 3;
          
          if (Math.abs(individualScaleFactor - 1) > 0.01) {
            transformData = {
              type: 'scale',
              values: [individualScaleFactor, [0, 0, 0]]
            };
          }
        }
        break;
    }

    console.log('Transform completed');
    isDraggingRef.current = false;
    initialTransformRef.current = null;
    
    if (onTransformEnd && transformData) {
      onTransformEnd(transformData);
    }
  };

  return (
    <TransformControls
      key={`gumball-${shapeKeyRef.current}`}
      ref={controlsRef}
      object={selectedShape}
      mode={mode}
      size={size}
      showX={true}
      showY={true}
      showZ={true}
      onMouseDown={handleMouseDown}
      onChange={handleChange}
      onMouseUp={handleMouseUp}
      enabled={true}
      translationSnap={null}
      rotationSnap={null}
      scaleSnap={null}
      userData={{ isTransformControl: true }}
    />
  );
};

export default GumballCore; 