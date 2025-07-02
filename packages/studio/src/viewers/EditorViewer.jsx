import React, { useState, useRef, useEffect, useMemo } from "react";
import { observer } from "mobx-react";
import debounce from "debounce";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import Canvas from "./Canvas.jsx";
import Material from "./Material.jsx";

import Controls from "../components-3d/Controls.jsx";
import ShapeGeometry from "../components-3d/ShapeGeometry.jsx";
import DefaultGeometry from "../components-3d/DefaultGeometry.jsx";
import InfiniteGrid from "../components-3d/InfiniteGrid.jsx";
import Gumball from "../components-3d/gumball/Gumball.jsx";

import SVGViewer from "./SVGViewer.jsx";
import useEditorStore from "../visualiser/editor/useEditorStore";
import { Button } from '../components/Button.jsx';
import styled from 'styled-components';

// Updated selection state to use persistent IDs
const useSelection = () => {
  const [selected, setSelected] = useState(null);
  const toggleSelected = debounce((selectionData) => {
    if (selected && selected.type === selectionData.type && selected.id === selectionData.id) {
      setSelected(null);
    } else {
      setSelected(selectionData);
    }
  }, 50);

  return [selected, toggleSelected];
};

const useClickHighlight = (selectMode, onSelected) => {
  const selectedFcn = useRef(onSelected);
  useEffect(() => {
    console.log('useClickHighlight: onSelected callback changed');
    selectedFcn.current = onSelected;
  }, [onSelected]);

  const [faceSelected, toggleFaceSelection] = useSelection();
  const [edgeSelected, toggleEdgeSelection] = useSelection();

  const updateFaceSelected = ["all", "faces"].includes(selectMode)
    ? (e, faceId) => {
        e.stopPropagation();
        console.log('👆 Face selected:', faceId);
        toggleFaceSelection({ type: 'face', id: faceId });
        if (edgeSelected) {
          toggleEdgeSelection(edgeSelected);
        }
      }
    : null;

  const updateEdgeSelected = ["all", "edges"].includes(selectMode)
    ? (e, edgeId) => {
        e.stopPropagation();
        console.log('👆 Edge selected:', edgeId);
        toggleEdgeSelection({ type: 'edge', id: edgeId });
        if (faceSelected) {
          toggleFaceSelection(faceSelected);
        }
      }
    : null;

  const clearSelection = () => {
    console.log('🗑️ Selection cleared');
    if (faceSelected) {
      toggleFaceSelection(faceSelected);
    }
    if (edgeSelected) {
      toggleEdgeSelection(edgeSelected);
    }
  };

  return {
    updateFaceSelected,
    updateEdgeSelected,
    clearSelection,
    faceSelected,
    edgeSelected,
  };
};

// Click outside detector using React Three Fiber events
const ClickOutsideDetector = ({ onClearSelection, hasSelection }) => {
  if (!hasSelection) return null;
  
  return (
    <mesh
      position={[0, 0, -1000]} // Place far behind everything
      onClick={(e) => {
        // Only clear selection if the click is not on a gumball or transform control
        const target = e.object;
        const isGumballClick = target.userData?.isGumball || 
                              target.userData?.isTransformControl ||
                              target.parent?.userData?.isGumball ||
                              target.parent?.userData?.isTransformControl;
        
        if (!isGumballClick) {
          console.log('🗑️ Click outside - clearing selection');
          e.stopPropagation();
          onClearSelection();
        } else {
          console.log('Click on gumball/transform control - not clearing selection');
        }
      }}
      userData={{ isClickOutsideDetector: true }}
      renderOrder={-1} // Render before other objects
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} depthTest={false} />
    </mesh>
  );
};

// Utility: Compute the center of a face group (average of all its vertices)
function computeFaceGroupCenter(mesh, group) {
  const { vertices, triangles } = mesh;
  let sum = new THREE.Vector3();
  let count = 0;
  for (let i = group.start; i < group.start + group.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const vi = triangles[i + j] * 3;
      sum.x += vertices[vi];
      sum.y += vertices[vi + 1];
      sum.z += vertices[vi + 2];
      count++;
    }
  }
  if (count === 0) return null;
  return sum.multiplyScalar(1 / count);
}

// Utility: Compute the center of an edge group (average of all its vertices)
function computeEdgeGroupCenter(edges, group) {
  const { lines } = edges;
  let sum = new THREE.Vector3();
  let count = 0;
  for (let i = group.start * 2; i < (group.start + group.count) * 2; i += 2) {
    for (let j = 0; j < 2; j++) {
      const vi = (i + j) * 3;
      sum.x += lines[vi];
      sum.y += lines[vi + 1];
      sum.z += lines[vi + 2];
      count++;
    }
  }
  if (count === 0) return null;
  return sum.multiplyScalar(1 / count);
}

const ModeSwitcherBar = styled.div`
  position: absolute;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.95);
  border-radius: 1.5em;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  padding: 0.5em 1.5em;
  display: flex;
  align-items: center;
  z-index: 100;
  gap: 1em;
`;

const ModeSelect = styled.select`
  background: transparent;
  color: #fff;
  border: none;
  font-size: 1em;
  outline: none;
  margin-left: 0.5em;
  margin-right: 0.5em;
  option {
    color: #222;
    background: #fff;
  }
`;

export default observer(function EditorViewer({
  shape,
  hasError,
  selectMode = "all",
  onSelected,
  clipDirection,
  clipConstant,
}) {
  const store = useEditorStore();
  const selectedMeshRef = useRef(null);
  const { updateEdgeSelected, updateFaceSelected, clearSelection, faceSelected, edgeSelected } =
    useClickHighlight(selectMode, onSelected);

  // Callback to ensure ref is properly set when mesh is created/recreated
  const handleMeshRef = (mesh) => {
    console.log('=== MESH REF CALLBACK ===');
    console.log('Previous mesh ref:', selectedMeshRef.current);
    console.log('New mesh ref:', mesh);
    console.log('Mesh position:', mesh ? mesh.position.toArray() : null);
    console.log('Mesh world position:', mesh ? mesh.getWorldPosition(new THREE.Vector3()).toArray() : null);
    
    selectedMeshRef.current = mesh;
    
    if (mesh) {
      console.log('✅ Mesh ref updated successfully');
      console.log('Final mesh position:', mesh.position.toArray());
      console.log('Final mesh world position:', mesh.getWorldPosition(new THREE.Vector3()).toArray());
    } else {
      console.log('❌ Mesh ref cleared');
    }
  };

  // Generate a unique key for the mesh that changes when the shape is updated
  const meshKey = useMemo(() => {
    if (!shape) return 'no-shape';
    
    // Create a more stable key that only changes when the actual geometry changes
    // Use a hash of the mesh data to ensure stability
    let key = 'shape';
    
    // Add shape name if available
    if (shape.name) {
      key += `-${shape.name}`;
    }
    
    // Add shape ID if available
    if (shape.id) {
      key += `-${shape.id}`;
    }
    
    // Add a hash of the mesh data to ensure the key only changes when geometry actually changes
    if (shape.mesh && shape.mesh.vertices) {
      const vertexHash = shape.mesh.vertices.length + '_' + 
                        (shape.mesh.triangles ? shape.mesh.triangles.length : 0);
      key += `-${vertexHash}`;
    }
    
    console.log('=== MESH KEY GENERATION ===');
    console.log('Shape name:', shape?.name);
    console.log('Shape ID:', shape?.id);
    console.log('Mesh vertices count:', shape?.mesh?.vertices?.length);
    console.log('Mesh triangles count:', shape?.mesh?.triangles?.length);
    console.log('Generated mesh key:', key);
    
    return key;
  }, [shape?.name, shape?.id, shape?.mesh?.vertices?.length, shape?.mesh?.triangles?.length]);

  // Restore selection after mesh rebuild using persistent IDs
  useEffect(() => {
    if (!shape || !shape.mesh) return;
    
    console.log('=== SELECTION RESTORATION CHECK ===');
    console.log('Shape mesh available:', !!shape.mesh);
    console.log('Face selected:', faceSelected);
    console.log('Edge selected:', edgeSelected);
    
    // Check if we have a face selection that needs to be restored
    if (faceSelected && faceSelected.type === 'face') {
      const faceExists = shape.mesh.faceGroups?.some(group => group.faceId === faceSelected.id);
      console.log('Face selection check - face exists:', faceExists);
      if (!faceExists) {
        console.log('🗑️ Selected face no longer exists, clearing selection');
        clearSelection();
      } else {
        console.log('✅ Face selection restored successfully');
      }
    }
    
    // Check if we have an edge selection that needs to be restored
    if (edgeSelected && edgeSelected.type === 'edge') {
      const edgeExists = shape.edges?.edgeGroups?.some(group => group.edgeId === edgeSelected.id);
      console.log('Edge selection check - edge exists:', edgeExists);
      if (!edgeExists) {
        console.log('🗑️ Selected edge no longer exists, clearing selection');
        clearSelection();
      } else {
        console.log('✅ Edge selection restored successfully');
      }
    }
  }, [shape, faceSelected, edgeSelected, clearSelection]);

  // Convert selection to indices for highlighting (backward compatibility)
  const facesHighlight = useMemo(() => {
    if (!faceSelected || !shape?.mesh?.faceGroups) return null;
    
    const faceGroupIndex = shape.mesh.faceGroups.findIndex(group => group.faceId === faceSelected.id);
    return faceGroupIndex >= 0 ? faceGroupIndex : null;
  }, [faceSelected, shape?.mesh?.faceGroups]);

  const edgesHighlight = useMemo(() => {
    if (!edgeSelected || !shape?.edges?.edgeGroups) return null;
    
    const edgeGroupIndex = shape.edges.edgeGroups.findIndex(group => group.edgeId === edgeSelected.id);
    return edgeGroupIndex >= 0 ? edgeGroupIndex : null;
  }, [edgeSelected, shape?.edges?.edgeGroups]);

  // Show/hide gumball based on selection
  const [gumballVisible, setGumballVisible] = useState(false);
  useEffect(() => {
    const hasSelection = faceSelected || edgeSelected;
    if (hasSelection && !gumballVisible) {
      console.log('🎯 Gumball visible');
      setGumballVisible(true);
    } else if (!hasSelection && gumballVisible) {
      console.log('🎯 Gumball hidden');
      setGumballVisible(false);
    }
  }, [faceSelected, edgeSelected, gumballVisible]);

  // Compute a dummy Object3D at the mesh's origin in world space (proxy gumball)
  const gumballProxy = useMemo(() => {
    if (!selectedMeshRef.current || !shape) return null;
    const mesh = selectedMeshRef.current;
    let center = null;
    // Try to use the selected face
    if (faceSelected && faceSelected.type === 'face' && shape.mesh?.faceGroups) {
      const group = shape.mesh.faceGroups.find(g => g.faceId === faceSelected.id);
      if (group) {
        center = computeFaceGroupCenter(shape.mesh, group);
      }
    }
    // Or the selected edge
    else if (edgeSelected && edgeSelected.type === 'edge' && shape.edges?.edgeGroups) {
      const group = shape.edges.edgeGroups.find(g => g.edgeId === edgeSelected.id);
      if (group) {
        center = computeEdgeGroupCenter(shape.edges, group);
      }
    }
    // Fallback: mesh center
    if (!center) {
      mesh.geometry.computeBoundingBox();
      center = new THREE.Vector3();
      mesh.geometry.boundingBox.getCenter(center);
      mesh.updateMatrixWorld();
      center.applyMatrix4(mesh.matrixWorld);
    } else if (center && mesh) {
      mesh.updateMatrixWorld();
      center.applyMatrix4(mesh.matrixWorld);
    }
    const dummy = new THREE.Object3D();
    dummy.position.copy(center);
    return dummy;
  }, [selectedMeshRef.current, faceSelected, edgeSelected, shape]);

  // Existing gumballTarget at mesh center
  const gumballTarget = useMemo(() => {
    if (!selectedMeshRef.current || !shape) return null;
    const mesh = selectedMeshRef.current;
    let position = new THREE.Vector3();
    mesh.updateMatrixWorld();
    position.setFromMatrixPosition(mesh.matrixWorld);
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    return dummy;
  }, [selectedMeshRef.current, faceSelected, edgeSelected, shape]);

  // Create context object for selection-aware code modification
  const gumballContext = useMemo(() => {
    if (!shape || !selectedMeshRef.current) return null;
    
    return {
      code: store.code.current,
      shape: shape,
      meshRef: selectedMeshRef.current,
      faceSelected: faceSelected,
      edgeSelected: edgeSelected
    };
  }, [shape, selectedMeshRef.current, store.code.current, faceSelected, edgeSelected]);

  // Proxy transform events to the actual mesh
  const handleTransformStart = (initialTransform) => {
    if (!selectedMeshRef.current) return;
    // Store the initial state on the mesh for later use
    selectedMeshRef.current.__initialTransform = {
      position: selectedMeshRef.current.position.clone(),
      rotation: selectedMeshRef.current.rotation.clone(),
      scale: selectedMeshRef.current.scale.clone(),
      matrix: selectedMeshRef.current.matrix.clone(),
    };
  };

  const handleTransformChange = () => {
    // Move the real mesh in real-time during drag
    if (selectedMeshRef.current && gumballTarget) {
      // Copy the position from the dummy to the real mesh
      selectedMeshRef.current.position.copy(gumballTarget.position);
      
      // For rotation, also copy the rotation
      if (store.ui.gumballMode === 'rotate') {
        selectedMeshRef.current.rotation.copy(gumballTarget.rotation);
      }
      
      // For scale, also copy the scale
      if (store.ui.gumballMode === 'scale') {
        selectedMeshRef.current.scale.copy(gumballTarget.scale);
      }
    }
  };

  const handleTransformEnd = (transformData) => {
    if (!selectedMeshRef.current || !selectedMeshRef.current.__initialTransform) return;
    
    // Log mesh, gumball, and parametric positions
    const meshPos = selectedMeshRef.current.position;
    const gumballPos = gumballTarget?.position;
    const gumballProxyPos = gumballProxy?.position;
    
    // Extract defaultParams from code
    let paramCoords = {};
    const code = store.code.current;
    const defaultParamsMatch = code.match(/const\s+defaultParams\s*=\s*{([\s\S]*?)};/);
    if (defaultParamsMatch) {
      const paramsStr = defaultParamsMatch[1];
      // Parse key: value pairs (simple, not robust to nested objects)
      paramsStr.split(/,\s*/).forEach(pair => {
        const match = pair.match(/([a-zA-Z0-9_]+):\s*([^,]+)/);
        if (match) {
          paramCoords[match[1]] = match[2];
        }
      });
    }
    
    // Prefer x/y/z_translate if present
    const paramLog = (paramCoords.x_translate || paramCoords.y_translate || paramCoords.z_translate)
      ? {
          x_translate: paramCoords.x_translate,
          y_translate: paramCoords.y_translate,
          z_translate: paramCoords.z_translate
        }
      : paramCoords;
    
    // === COMPREHENSIVE DEBUG LOGGING ===
    console.log('=== TRANSFORM END ANALYSIS ===');
    console.log('Shape name:', shape?.name || 'unknown');
    console.log('Shape type:', shape?.constructor?.name || 'unknown');
    
    // Mesh state analysis
    console.log('--- MESH STATE ---');
    console.log('Mesh position (world):', meshPos ? meshPos.toArray() : null);
    console.log('Mesh position (local):', selectedMeshRef.current ? selectedMeshRef.current.position.toArray() : null);
    console.log('Mesh matrix world:', selectedMeshRef.current ? selectedMeshRef.current.matrixWorld.elements : null);
    console.log('Mesh matrix:', selectedMeshRef.current ? selectedMeshRef.current.matrix.elements : null);
    
    // Gumball state analysis
    console.log('--- GUMBALL STATE ---');
    console.log('Gumball target position:', gumballPos ? gumballPos.toArray() : null);
    console.log('Gumball proxy position:', gumballProxyPos ? gumballProxyPos.toArray() : null);
    
    // Coordinate system analysis
    console.log('--- COORDINATE ANALYSIS ---');
    const meshWorldPos = new THREE.Vector3();
    selectedMeshRef.current?.getWorldPosition(meshWorldPos);
    console.log('Mesh world position (getWorldPosition):', meshWorldPos.toArray());
    
    const meshLocalPos = selectedMeshRef.current?.position.clone();
    console.log('Mesh local position (clone):', meshLocalPos ? meshLocalPos.toArray() : null);
    
    // Parametric coordinates analysis
    console.log('--- PARAMETRIC COORDINATES ---');
    console.log('Raw parametric coords:', paramLog);
    
    // Check for coordinate matching (potential double movement indicator)
    const meshX = meshPos ? meshPos.x : 0;
    const meshY = meshPos ? meshPos.y : 0;
    const meshZ = meshPos ? meshPos.z : 0;
    const paramX = paramCoords.x_translate ? parseFloat(paramCoords.x_translate) : 0;
    const paramY = paramCoords.y_translate ? parseFloat(paramCoords.y_translate) : 0;
    const paramZ = paramCoords.z_translate ? parseFloat(paramCoords.z_translate) : 0;
    
    const xDiff = Math.abs(meshX - paramX);
    const yDiff = Math.abs(meshY - paramY);
    const zDiff = Math.abs(meshZ - paramZ);
    
    console.log('--- COORDINATE MATCHING ANALYSIS ---');
    console.log('Mesh X:', meshX, 'Param X:', paramX, 'Diff:', xDiff);
    console.log('Mesh Y:', meshY, 'Param Y:', paramY, 'Diff:', yDiff);
    console.log('Mesh Z:', meshZ, 'Param Z:', paramZ, 'Diff:', zDiff);
    
    if (xDiff < 0.1 && yDiff < 0.1 && zDiff < 0.1) {
      console.log('⚠️  WARNING: Parametric coordinates EXACTLY match mesh position!');
      console.log('⚠️  This indicates potential double movement issue!');
    } else {
      console.log('✅ Parametric coordinates differ from mesh position (expected behavior)');
    }
    
    // Initial transform state (if available)
    if (selectedMeshRef.current.__initialTransform) {
      console.log('--- INITIAL TRANSFORM STATE ---');
      console.log('Initial position:', selectedMeshRef.current.__initialTransform.position.toArray());
      console.log('Initial rotation:', selectedMeshRef.current.__initialTransform.rotation.toArray());
      console.log('Initial scale:', selectedMeshRef.current.__initialTransform.scale.toArray());
      
      // Calculate total displacement
      const initialPos = selectedMeshRef.current.__initialTransform.position;
      const totalDisplacement = meshPos.clone().sub(initialPos);
      console.log('Total displacement from initial:', totalDisplacement.toArray());
    }
    
    // Shape-specific analysis
    console.log('--- SHAPE-SPECIFIC ANALYSIS ---');
    if (shape?.mesh) {
      console.log('Mesh vertices count:', shape.mesh.vertices?.length || 0);
      console.log('Mesh triangles count:', shape.mesh.triangles?.length || 0);
      console.log('Mesh face groups count:', shape.mesh.faceGroups?.length || 0);
    }
    
    console.log('=== END TRANSFORM ANALYSIS ===');
    
    // Forward the transformData to the TransformManager logic if needed
    // (The advanced gumball system should already handle this)
    // Clean up
    delete selectedMeshRef.current.__initialTransform;
  };

  // Convert selection to indices and call onSelected callback
  useEffect(() => {
    if (onSelected) {
      // Convert our new selection format to group indices as expected by MobX state
      let faceIndex = null;
      let edgeIndex = null;
      
      if (faceSelected && faceSelected.type === 'face' && shape?.mesh?.faceGroups) {
        faceIndex = shape.mesh.faceGroups.findIndex(group => group.faceId === faceSelected.id);
        faceIndex = faceIndex >= 0 ? faceIndex : null;
      }
      
      if (edgeSelected && edgeSelected.type === 'edge' && shape?.edges?.edgeGroups) {
        edgeIndex = shape.edges.edgeGroups.findIndex(group => group.edgeId === edgeSelected.id);
        edgeIndex = edgeIndex >= 0 ? edgeIndex : null;
      }
      
      onSelected(faceIndex, edgeIndex);
    }
  }, [faceSelected, edgeSelected, shape, onSelected]);

  if (
    shape &&
    (shape.format === "svg" || (shape.length && shape[0].format === "svg"))
  ) {
    return <SVGViewer shape={shape} />;
  }

  return (
    <>
      <Canvas
        orthographic
        onCreated={(state) => (state.gl.localClippingEnabled = true)}
      >
        <InfiniteGrid />
        <Controls enableDamping={false}>
          {hasError ? (
            <DefaultGeometry />
          ) : shape.length ? (
            shape.map((s) => (
              <ShapeGeometry
                key={s.name}
                shape={s}
                FaceMaterial={Material}
                clipDirection={clipDirection}
                clipConstant={clipConstant}
              />
            ))
          ) : (
            <ShapeGeometry
              key={meshKey}
              ref={handleMeshRef}
              facesHighlight={facesHighlight}
              edgesHighlight={edgesHighlight}
              shape={shape}
              FaceMaterial={Material}
              onEdgeClick={updateEdgeSelected}
              onFaceClick={updateFaceSelected}
              clipDirection={clipDirection}
              clipConstant={clipConstant}
            />
          )}
        </Controls>
        {/* Add the dummy to the scene graph so TransformControls can attach to it */}
        {gumballTarget && <primitive object={gumballTarget} />}
        {gumballProxy && <primitive object={gumballProxy} />}
        {/* Render gumball visually at mesh center, but functionally at mesh origin */}
        {gumballVisible && gumballTarget && gumballProxy && (
          <group position={(() => {
            // Ensure offset is in world space
            const proxyWorld = gumballProxy.getWorldPosition(new THREE.Vector3());
            const targetWorld = gumballTarget.getWorldPosition(new THREE.Vector3());
            return proxyWorld.sub(targetWorld);
          })()}>
            <Gumball
              selectedShape={gumballTarget}
              mode={store.ui.gumballMode}
              onTransformStart={handleTransformStart}
              onTransformChange={handleTransformChange}
              onTransformEnd={handleTransformEnd}
              size={0.5}
              context={gumballContext}
            />
          </group>
        )}
        <ClickOutsideDetector onClearSelection={clearSelection} hasSelection={faceSelected !== null || edgeSelected !== null} />
      </Canvas>
      {/* Mode switcher at the bottom center, only when gumball is visible */}
      {gumballVisible && (
        <ModeSwitcherBar>
          <span style={{ color: '#fff', fontWeight: 600, letterSpacing: '1px' }}>Gumball Mode:</span>
          <ModeSelect
            value={store.ui.gumballMode}
            onChange={e => store.ui.setGumballMode(e.target.value)}
          >
            <option value="translate">Move</option>
            <option value="rotate">Rotate</option>
            <option value="scale">Scale</option>
          </ModeSelect>
        </ModeSwitcherBar>
      )}
    </>
  );
}); 