import React, { useState, useEffect, useRef, useCallback } from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import { ParamsSection } from "../../components/ToolUI";
import useEditorStore from "./useEditorStore";

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: var(--bg-color);
  border-radius: 4px;
  min-width: 200px;
`;

const SliderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SliderLabel = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 500;
`;

const SliderValue = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace;
  font-size: 10px;
  color: var(--color-primary-light);
  min-width: 40px;
  text-align: right;
`;

const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-color-secondary);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid var(--bg-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid var(--bg-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  
  &:hover::-webkit-slider-thumb {
    background: var(--color-primary-light);
  }
  
  &:hover::-moz-range-thumb {
    background: var(--color-primary-light);
  }
`;

const NumberInput = styled.input`
  width: 60px;
  height: 24px;
  border: 1px solid var(--bg-color-secondary);
  border-radius: 3px;
  background: var(--bg-color);
  color: var(--color-primary);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace;
  text-align: center;
  outline: none;
  
  &:focus {
    border-color: var(--color-primary);
  }
  
  &:hover {
    border-color: var(--color-primary-light);
  }
`;

const BooleanToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
  color: var(--color-primary);
  
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-primary);
  }
`;

const SyncButton = styled.button`
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: var(--color-primary-light);
  }
  
  &:active {
    background: var(--color-primary-dark);
  }
`;

const StatusIndicator = styled.div`
  font-size: 10px;
  color: var(--color-primary-light);
  text-align: center;
  padding: 4px;
  font-style: italic;
  opacity: ${props => props.isUpdating ? 1 : 0.6};
  transition: opacity 0.2s;
`;

// Code updater class for parameter changes
class ParameterCodeUpdater {
  constructor(store) {
    this.store = store;
  }

  updateParameterInCode(paramName, newValue) {
    try {
      const currentCode = this.store.code.current;
      
      // Find the defaultParams object
      const defaultParamsMatch = currentCode.match(/const\s+defaultParams\s*=\s*{([^}]+)}/);
      if (!defaultParamsMatch) {
        console.log('No defaultParams found in code');
        return false;
      }
      
      const paramsContent = defaultParamsMatch[1];
      
      // Check if parameter already exists
      const paramRegex = new RegExp(`${paramName}:\\s*[^,\\s]+`);
      const paramExists = paramRegex.test(paramsContent);
      
      let newParamsContent;
      if (paramExists) {
        // Update existing parameter
        newParamsContent = paramsContent.replace(
          paramRegex,
          `${paramName}: ${newValue}`
        );
      } else {
        // Add new parameter
        newParamsContent = paramsContent.replace(
          /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
          `$1$2,\n    ${paramName}: ${newValue}$3`
        );
      }
      
      // Replace the defaultParams in the code
      const newCode = currentCode.replace(
        /const\s+defaultParams\s*=\s*{([^}]+)}/,
        `const defaultParams = {${newParamsContent}}`
      );
      
      // Update the code in the store
      this.store.code.update(newCode, true);
      
      console.log(`Updated parameter ${paramName}: ${newValue}`);
      return true;
    } catch (error) {
      console.error('Error updating parameter in code:', error);
      return false;
    }
  }
}

const SliderControl = ({ 
  label, 
  value, 
  onCodeUpdate, 
  min = 0, 
  max = 100, 
  step = 1,
  showInput = true 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const debouncedCodeUpdate = useCallback((newValue) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onCodeUpdate(label, newValue);
    }, 50);
  }, [onCodeUpdate, label]);
  
  const handleSliderChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    debouncedCodeUpdate(newValue);
  };
  
  const handleInputChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      setLocalValue(newValue);
      // Immediate update for number input
      onCodeUpdate(label, newValue);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onCodeUpdate(label, localValue);
    }
  };
  
  return (
    <SliderRow>
      <SliderLabel>
        <span>{label}</span>
        <SliderValue>{localValue.toFixed(step < 1 ? 2 : 0)}</SliderValue>
      </SliderLabel>
      <SliderInput
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleSliderChange}
      />
      {showInput && (
        <NumberInput
          type="number"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
      )}
    </SliderRow>
  );
};

const BooleanControl = ({ label, value, onCodeUpdate }) => {
  const handleChange = (e) => {
    const newValue = e.target.checked;
    onCodeUpdate(label, newValue);
  };
  
  return (
    <BooleanToggle>
      <input
        type="checkbox"
        checked={value}
        onChange={handleChange}
      />
      <span>{label}</span>
    </BooleanToggle>
  );
};

export default observer(function ParamsEditor({
  defaultParams,
  hidden,
  onRun,
}) {
  const store = useEditorStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [sliderRanges, setSliderRanges] = useState({});
  const codeUpdaterRef = useRef(null);
  
  // Initialize slider ranges based on initial defaultParams
  useEffect(() => {
    if (defaultParams && Object.keys(sliderRanges).length === 0) {
      const ranges = {};
      Object.entries(defaultParams).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const absValue = Math.abs(value);
          let min, max, step;
          
          if (absValue === 0) {
            min = 0;
            max = 10;
            step = 0.1;
          } else if (absValue < 0.1) {
            min = 0;
            max = absValue * 2;
            step = absValue / 100;
          } else if (absValue < 1) {
            min = 0;
            max = absValue * 2;
            step = absValue / 100;
          } else if (absValue < 10) {
            min = 0;
            max = absValue * 2;
            step = absValue / 50;
          } else if (absValue < 100) {
            min = 0;
            max = absValue * 2;
            step = absValue / 100;
          } else if (absValue < 1000) {
            min = 0;
            max = absValue * 2;
            step = absValue / 200;
          } else {
            min = 0;
            max = absValue * 2;
            step = absValue / 500;
          }
          
          // Ensure minimum range for usability
          const range = max - min;
          if (range < 1) {
            min = 0;
            max = 1;
            step = 0.01;
          }
          
          // Handle negative values
          if (value < 0) {
            min = absValue * 2;
            max = 0;
          }
          
          ranges[key] = { min, max, step };
        }
      });
      setSliderRanges(ranges);
    }
  }, [defaultParams, sliderRanges]);
  
  useEffect(() => {
    if (!codeUpdaterRef.current) {
      codeUpdaterRef.current = new ParameterCodeUpdater(store);
    }
  }, [store]);
  
  const handleParameterChange = useCallback((paramName, newValue) => {
    if (!codeUpdaterRef.current) return;
    
    setIsUpdating(true);
    
    // Update the code directly
    const success = codeUpdaterRef.current.updateParameterInCode(paramName, newValue);
    
    if (success) {
      // Trigger a rebuild with the new parameters
      setTimeout(() => {
        onRun({ ...defaultParams, [paramName]: newValue });
        setIsUpdating(false);
      }, 100);
    } else {
      setIsUpdating(false);
    }
  }, [defaultParams, onRun]);
  
  const handleSyncFromCode = useCallback(() => {
    // This would sync slider positions from current code values
    // For now, just trigger a rebuild with current defaultParams
    onRun(defaultParams);
  }, [defaultParams, onRun]);
  
  const renderControl = (key, value) => {
    if (typeof value === 'number') {
      const range = sliderRanges[key];
      if (!range) return null;
      
      return (
        <SliderControl
          key={key}
          label={key}
          value={value}
          onCodeUpdate={handleParameterChange}
          min={range.min}
          max={range.max}
          step={range.step}
        />
      );
    } else if (typeof value === 'boolean') {
      return (
        <BooleanControl
          key={key}
          label={key}
          value={value}
          onCodeUpdate={handleParameterChange}
        />
      );
    }
    
    return null;
  };
  
  if (hidden || !defaultParams) {
    return null;
  }
  
  return (
    <ParamsSection>
      <SliderContainer>
        {Object.entries(defaultParams).map(([key, value]) => 
          renderControl(key, value)
        )}
        <SyncButton onClick={handleSyncFromCode}>
          Sync from Code
        </SyncButton>
        <StatusIndicator isUpdating={isUpdating}>
          {isUpdating ? "Updating code..." : "Ready"}
        </StatusIndicator>
      </SliderContainer>
    </ParamsSection>
  );
});
