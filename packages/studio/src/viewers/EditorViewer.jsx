import React, { useState, useRef, useEffect } from "react";
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
import Gumball from "../components-3d/Gumball.jsx";

import SVGViewer from "./SVGViewer.jsx";
import useEditorStore from "../visualiser/editor/useEditorStore";

const useSelection = () => {
  const [selected, setSelected] = useState(null);
  const toggleSelected = debounce((index) => {
    if ((selected || selected === 0) && selected === index) {
      setSelected(null);
    } else {
      setSelected(index);
    }
  }, 50);

  return [selected, toggleSelected];
};

const useClickHighlight = (selectMode, onSelected) => {
  const selectedFcn = useRef(onSelected);
  useEffect(() => {
    selectedFcn.current = onSelected;
  }, [onSelected]);

  const [faceSelected, toggleFaceSelection] = useSelection();
  const [edgeSelected, toggleEdgeSelection] = useSelection();

  const updateFaceSelected = ["all", "faces"].includes(selectMode)
    ? (e, index) => {
        e.stopPropagation();
        toggleFaceSelection(index);
        (edgeSelected || edgeSelected === 0) &&
          toggleEdgeSelection(edgeSelected);
      }
    : null;

  const updateEdgeSelected = ["all", "edges"].includes(selectMode)
    ? (e, index) => {
        e.stopPropagation();
        toggleEdgeSelection(index);
        (faceSelected || faceSelected === 0) &&
          toggleFaceSelection(faceSelected);
      }
    : null;

  const clearSelection = () => {
    if (faceSelected !== null) {
      toggleFaceSelection(faceSelected);
    }
    if (edgeSelected !== null) {
      toggleEdgeSelection(edgeSelected);
    }
  };

  useEffect(() => {
    selectedFcn.current && selectedFcn.current(faceSelected, edgeSelected);
  }, [faceSelected, edgeSelected]);

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
        e.stopPropagation();
        onClearSelection();
      }}
      userData={{ isClickOutsideDetector: true }}
      renderOrder={-1} // Render before other objects
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} depthTest={false} />
    </mesh>
  );
};

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

  // Show gumball when something is selected
  useEffect(() => {
    if (faceSelected !== null || edgeSelected !== null) {
      store.ui.showGumballForSelection();
    } else {
      store.ui.hideGumball();
    }
  }, [faceSelected, edgeSelected, store.ui]);

  if (
    shape &&
    (shape.format === "svg" || (shape.length && shape[0].format === "svg"))
  ) {
    return <SVGViewer shape={shape} />;
  }

  return (
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
            ref={selectedMeshRef}
            facesHighlight={faceSelected}
            edgesHighlight={edgeSelected}
            shape={shape}
            FaceMaterial={Material}
            onEdgeClick={updateEdgeSelected}
            onFaceClick={updateFaceSelected}
            clipDirection={clipDirection}
            clipConstant={clipConstant}
          />
        )}
      </Controls>
      
      {/* Render gumball completely outside Stage component */}
      {store.ui.showGumball && selectedMeshRef.current && (
        <Gumball
          selectedShape={selectedMeshRef.current}
          mode={store.ui.gumballMode}
        />
      )}

      <ClickOutsideDetector onClearSelection={clearSelection} hasSelection={faceSelected !== null || edgeSelected !== null} />
    </Canvas>
  );
}); 