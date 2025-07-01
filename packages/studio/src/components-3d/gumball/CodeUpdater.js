/**
 * CodeUpdater handles updating the parametric code with transform parameters
 */
export class CodeUpdater {
  constructor(store) {
    this.store = store;
  }

  /**
   * Update translation parameters in the code
   */
  updateTranslationParams(totalDisplacement) {
    try {
      console.log('=== Starting code update process ===');
      const currentCode = this.store.code.current;
      console.log('Current code length:', currentCode.length);
      
      // Parse the defaultParams object to find current translation values
      const defaultParamsMatch = currentCode.match(/const\s+defaultParams\s*=\s*{([^}]+)}/);
      if (!defaultParamsMatch) {
        console.log('No defaultParams found in code');
        return false;
      }
      
      const paramsContent = defaultParamsMatch[1];
      console.log('Found params content:', paramsContent);
      
      // Extract current translation values
      const xTranslateMatch = paramsContent.match(/x_translate:\s*([0-9.-]+)/);
      const yTranslateMatch = paramsContent.match(/y_translate:\s*([0-9.-]+)/);
      const zTranslateMatch = paramsContent.match(/z_translate:\s*([0-9.-]+)/);
      
      const currentX = xTranslateMatch ? parseFloat(xTranslateMatch[1]) : 0;
      const currentY = yTranslateMatch ? parseFloat(yTranslateMatch[1]) : 0;
      const currentZ = zTranslateMatch ? parseFloat(zTranslateMatch[1]) : 0;
      
      console.log('Current translation values:', { x: currentX, y: currentY, z: currentZ });
      
      // Calculate new values by adding the displacement
      const newX = currentX + totalDisplacement.x;
      const newY = currentY + totalDisplacement.y;
      const newZ = currentZ + totalDisplacement.z;
      
      console.log('New translation values:', { x: newX, y: newY, z: newZ });
      
      // Create new params content with updated values
      let newParamsContent = paramsContent;
      
      if (xTranslateMatch) {
        newParamsContent = newParamsContent.replace(
          /x_translate:\s*[0-9.-]+/,
          `x_translate: ${newX.toFixed(2)}`
        );
      } else {
        // Add x_translate if it doesn't exist - append to the end
        newParamsContent = newParamsContent.replace(/\s*}\s*$/, `,\n    x_translate: ${newX.toFixed(2)}\n  }`);
      }
      
      if (yTranslateMatch) {
        newParamsContent = newParamsContent.replace(
          /y_translate:\s*[0-9.-]+/,
          `y_translate: ${newY.toFixed(2)}`
        );
      } else {
        // Add y_translate if it doesn't exist - append to the end
        newParamsContent = newParamsContent.replace(/\s*}\s*$/, `,\n    y_translate: ${newY.toFixed(2)}\n  }`);
      }
      
      if (zTranslateMatch) {
        newParamsContent = newParamsContent.replace(
          /z_translate:\s*[0-9.-]+/,
          `z_translate: ${newZ.toFixed(2)}`
        );
      } else {
        // Add z_translate if it doesn't exist - append to the end
        newParamsContent = newParamsContent.replace(/\s*}\s*$/, `,\n    z_translate: ${newZ.toFixed(2)}\n  }`);
      }
      
      // Replace the defaultParams in the code
      const newCode = currentCode.replace(
        /const\s+defaultParams\s*=\s*{([^}]+)}/,
        `const defaultParams = {${newParamsContent}}`
      );
      
      console.log('New code length:', newCode.length);
      console.log('Code changed:', newCode !== currentCode);
      
      // Update the code in the store
      this.store.code.update(newCode, true);
      
      console.log(`Updated translation parameters: x=${newX.toFixed(2)}, y=${newY.toFixed(2)}, z=${newZ.toFixed(2)}`);
      
      return true;
    } catch (error) {
      console.error('Error updating translation parameters:', error);
      return false;
    }
  }

  /**
   * Update rotation parameters in the code
   */
  updateRotationParams(angle, axis, center = null) {
    try {
      console.log('=== Starting rotation code update process ===');
      const currentCode = this.store.code.current;
      // Parse the defaultParams object to find current rotation values
      const defaultParamsMatch = currentCode.match(/const\s+defaultParams\s*=\s*{([^}]+)}/);
      if (!defaultParamsMatch) {
        console.log('No defaultParams found in code');
        return false;
      }
      let paramsContent = defaultParamsMatch[1];
      
      // Extract current rotation values
      const angleMatch = paramsContent.match(/angle:\s*([0-9.-]+)/);
      const axisXMatch = paramsContent.match(/axis_x:\s*([0-9.-]+)/);
      const axisYMatch = paramsContent.match(/axis_y:\s*([0-9.-]+)/);
      const axisZMatch = paramsContent.match(/axis_z:\s*([0-9.-]+)/);
      
      // Update or add rotation params
      const newAngle = angle;
      const [ax, ay, az] = axis;
      
      function replaceOrAddParam(content, key, value) {
        const regex = new RegExp(`${key}:\\s*[0-9.-]+`);
        if (regex.test(content)) {
          return content.replace(regex, `${key}: ${value.toFixed(4)}`);
        } else {
          // Add parameter to the end of the object
          return content.replace(/\s*}\s*$/, `,\n    ${key}: ${value.toFixed(4)}\n  }`);
        }
      }
      
      paramsContent = replaceOrAddParam(paramsContent, 'angle', newAngle);
      paramsContent = replaceOrAddParam(paramsContent, 'axis_x', ax);
      paramsContent = replaceOrAddParam(paramsContent, 'axis_y', ay);
      paramsContent = replaceOrAddParam(paramsContent, 'axis_z', az);
      
      // Remove center parameters if they exist
      paramsContent = paramsContent.replace(/center_x:\s*[0-9.-]+,?\s*/g, '');
      paramsContent = paramsContent.replace(/center_y:\s*[0-9.-]+,?\s*/g, '');
      paramsContent = paramsContent.replace(/center_z:\s*[0-9.-]+,?\s*/g, '');
      
      // Clean up any double commas or trailing commas
      paramsContent = paramsContent.replace(/,\s*,/g, ',');
      paramsContent = paramsContent.replace(/,\s*}/g, '}');
      paramsContent = paramsContent.replace(/,\s*\n\s*}/g, '\n  }');
      
      // Replace the defaultParams in the code
      let newCode = currentCode.replace(
        /const\s+defaultParams\s*=\s*{([^}]+)}/,
        `const defaultParams = {${paramsContent}}`
      );
      
      // Ensure the main function applies the rotation
      if (!/\.rotate\(/.test(newCode)) {
        // Check if translate already exists
        if (/\.translate\(/.test(newCode)) {
          console.log('Found existing translate, adding rotate to chain');
          // Add rotate to existing translate chain
          newCode = newCode.replace(
            /(\.translate\([^)]+\));/,
            `$1.rotate(defaultParams.angle, [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate], [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z]);`
          );
        } else {
          console.log('No translate found, adding both translate and rotate');
          // Add both translate and rotate
          newCode = newCode.replace(
            /(return\s+)([^;]+);/,
            `$1$2.translate([defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate]).rotate(defaultParams.angle, [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate], [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z]);`
          );
        }
      } else {
        console.log('Found existing rotate, updating it');
        // Update existing rotation call to use translation parameters as center
        newCode = this.updateExistingRotationCenter(newCode);
      }
      
      // Debug: Log the generated code
      console.log('Generated code:', newCode);
      console.log('Code length:', newCode.length);
      
      // Check for syntax issues
      try {
        // Try to parse the code to catch syntax errors
        new Function(newCode);
        console.log('Code syntax is valid');
      } catch (syntaxError) {
        console.error('SYNTAX ERROR in generated code:', syntaxError.message);
        console.error('Problematic code:', newCode);
        return false;
      }
      
      // Update the code in the store
      this.store.code.update(newCode, true);
      console.log('Updated rotation parameters:', { angle: newAngle, axis: [ax, ay, az] });
      return true;
    } catch (error) {
      console.error('Error updating rotation parameters:', error);
      return false;
    }
  }

  /**
   * Update existing rotation calls to use translation parameters as center
   */
  updateExistingRotationCenter(code) {
    try {
      console.log('Updating existing rotation call...');
      console.log('Original code snippet:', code.match(/return[^;]+;/) ? code.match(/return[^;]+;/)[0] : 'No return statement found');
      
      // Replace rotation calls that use center_x, center_y, center_z with x_translate, y_translate, z_translate
      const updatedCode = code.replace(
        /\.rotate\([^)]+\)/g,
        '.rotate(defaultParams.angle, [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate], [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z])'
      );
      
      console.log('Updated code snippet:', updatedCode.match(/return[^;]+;/) ? updatedCode.match(/return[^;]+;/)[0] : 'No return statement found');
      
      if (updatedCode !== code) {
        console.log('Updated existing rotation call to use translation parameters as center');
      }
      
      return updatedCode;
    } catch (error) {
      console.error('Error updating existing rotation center:', error);
      return code;
    }
  }

  /**
   * Add transform parameters to the code if they don't exist
   */
  addTransformParametersToCode() {
    try {
      console.log('=== Adding transform parameters to code ===');
      const currentCode = this.store.code.current;
      
      // Check if defaultParams already exists (including empty ones)
      const defaultParamsMatch = currentCode.match(/const\s+defaultParams\s*=\s*{([^}]*)}/);
      
      if (defaultParamsMatch) {
        // defaultParams exists, check if transform parameters are already there
        let paramsContent = defaultParamsMatch[1];
        
        const hasXTranslate = /x_translate:\s*[0-9.-]+/.test(paramsContent);
        const hasYTranslate = /y_translate:\s*[0-9.-]+/.test(paramsContent);
        const hasZTranslate = /z_translate:\s*[0-9.-]+/.test(paramsContent);
        const hasAngle = /angle:\s*[0-9.-]+/.test(paramsContent);
        const hasAxisX = /axis_x:\s*[0-9.-]+/.test(paramsContent);
        const hasAxisY = /axis_y:\s*[0-9.-]+/.test(paramsContent);
        const hasAxisZ = /axis_z:\s*[0-9.-]+/.test(paramsContent);
        
        // Only add parameters that don't already exist
        let needsUpdate = false;
        
        if (!hasXTranslate) {
          paramsContent += `\n  x_translate: 0,`;
          needsUpdate = true;
        }
        if (!hasYTranslate) {
          paramsContent += `\n  y_translate: 0,`;
          needsUpdate = true;
        }
        if (!hasZTranslate) {
          paramsContent += `\n  z_translate: 0,`;
          needsUpdate = true;
        }
        if (!hasAngle) {
          paramsContent += `\n  angle: 0,`;
          needsUpdate = true;
        }
        if (!hasAxisX) {
          paramsContent += `\n  axis_x: 0,`;
          needsUpdate = true;
        }
        if (!hasAxisY) {
          paramsContent += `\n  axis_y: 0,`;
          needsUpdate = true;
        }
        if (!hasAxisZ) {
          paramsContent += `\n  axis_z: 1,`;
          needsUpdate = true;
        }
        
        // Remove center parameters if they exist
        paramsContent = paramsContent.replace(/center_x:\s*[0-9.-]+,?\s*/g, '');
        paramsContent = paramsContent.replace(/center_y:\s*[0-9.-]+,?\s*/g, '');
        paramsContent = paramsContent.replace(/center_z:\s*[0-9.-]+,?\s*/g, '');
        
        // Clean up any double commas or trailing commas
        paramsContent = paramsContent.replace(/,\s*,/g, ',');
        paramsContent = paramsContent.replace(/,\s*}/g, '}');
        paramsContent = paramsContent.replace(/,\s*\n\s*}/g, '\n}');
        
        if (needsUpdate) {
          const newCode = currentCode.replace(
            /const\s+defaultParams\s*=\s*{[^}]*}/,
            `const defaultParams = {${paramsContent}}`
          );
          console.log('Adding transform parameters to existing defaultParams');
          this.store.code.update(newCode, true);
        } else {
          console.log('Transform parameters already exist in defaultParams');
        }
      } else {
        // No defaultParams exists, create it
        const newCode = currentCode.replace(
          /(const main = \([^)]*\) => {)/,
          `const defaultParams = {\n  x_translate: 0,\n  y_translate: 0,\n  z_translate: 0,\n  angle: 0,\n  axis_x: 0,\n  axis_y: 0,\n  axis_z: 1,\n};\n\n$1`
        );
        console.log('Creating new defaultParams with transform parameters');
        this.store.code.update(newCode, true);
      }
      
      // Also need to modify the main function to use these parameters
      this.addTransformToMainFunction();
    } catch (error) {
      console.error('Error adding transform parameters:', error);
    }
  }

  /**
   * Add transform to the main function
   */
  addTransformToMainFunction() {
    try {
      console.log('=== Adding transform to main function ===');
      const currentCode = this.store.code.current;
      // Check if the main function already has a transform
      const hasTranslate = /\.translate\(\[.*\]\)/.test(currentCode);
      const hasRotate = /\.rotate\(/.test(currentCode);
      let newCode = currentCode;
      
      if (!hasTranslate && !hasRotate) {
        // Add both translate and rotate to the return statement
        newCode = newCode.replace(
          /(return\s+)([^;]+);/,
          `$1$2.translate([defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate]).rotate(defaultParams.angle, [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate], [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z]);`
        );
      } else if (!hasTranslate && hasRotate) {
        // Add translate to existing rotate chain
        newCode = newCode.replace(
          /(return\s+)([^;]+)\.rotate\(/,
          `$1$2.translate([defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate]).rotate(`
        );
      } else if (hasTranslate && !hasRotate) {
        // Add rotate to existing translate chain
        newCode = newCode.replace(
          /(\.translate\([^)]+\));/,
          `$1.rotate(defaultParams.angle, [defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate], [defaultParams.axis_x, defaultParams.axis_y, defaultParams.axis_z]);`
        );
      }
      
      if (newCode !== currentCode) {
        console.log('Adding transform to main function');
        console.log('Generated code snippet:', newCode.match(/return[^;]+;/) ? newCode.match(/return[^;]+;/)[0] : 'No return statement found');
        
        // Check for syntax errors before updating
        try {
          new Function(newCode);
          console.log('Code syntax is valid');
          this.store.code.update(newCode, true);
          this.store.updateCode(newCode);
          // Trigger a rebuild with the new parameters
          setTimeout(() => {
            this.store.process({
              x_translate: 0,
              y_translate: 0,
              z_translate: 0,
              angle: 0,
              axis_x: 0,
              axis_y: 0,
              axis_z: 1,
            });
          }, 100);
        } catch (syntaxError) {
          console.error('SYNTAX ERROR in generated code:', syntaxError.message);
          console.error('Problematic code:', newCode);
          return false;
        }
      }
    } catch (error) {
      console.error('Error adding transform to main function:', error);
    }
  }

  /**
   * Trigger a rebuild after code update
   */
  triggerRebuild(newCode) {
    try {
      console.log('=== Starting reload process ===');
      
      // Use the store's updateCode method to ensure proper UI update
      console.log('Updating code via store.updateCode...');
      this.store.updateCode(newCode);
      
      // Also update through the code state for redundancy
      console.log('Updating code via store.code.update...');
      this.store.code.update(newCode, true);
      
      // Extract the updated parameters from the new code
      const updatedParams = {};
      const paramsMatch = newCode.match(/const\s+defaultParams\s*=\s*{([^}]+)}/);
      if (paramsMatch) {
        const paramsStr = paramsMatch[1];
        // Parse the parameters
        const paramMatches = paramsStr.matchAll(/(\w+):\s*([0-9.-]+)/g);
        for (const match of paramMatches) {
          updatedParams[match[1]] = parseFloat(match[2]);
        }
      }
      
      console.log('Extracted parameters:', updatedParams);
      
      // Trigger a rebuild with the updated parameters after a short delay
      setTimeout(() => {
        if (Object.keys(updatedParams).length > 0) {
          console.log('Triggering rebuild with updated parameters:', updatedParams);
          this.store.process(updatedParams);
        } else {
          // If no parameters found, just trigger a general rebuild
          console.log('Triggering general rebuild');
          this.store.process();
        }
      }, 100);
      
      // Dispatch a custom event to notify the editor that code has been updated
      const codeUpdateEvent = new CustomEvent('codeUpdated', {
        detail: { code: newCode, source: 'gumball' }
      });
      window.dispatchEvent(codeUpdateEvent);
      
      console.log('Rebuild triggered successfully');
      
    } catch (error) {
      console.error('Error during reload process:', error);
    }
  }

  /**
   * Update transform for a specific selected object (selection-aware)
   */
  updateSelectedObjectTransform(selectedObjectName, selectedObjectPath, transformType, values) {
    try {
      console.log('=== Starting selection-aware code update ===');
      console.log('Selected object name:', selectedObjectName);
      console.log('Selected object path:', selectedObjectPath);
      console.log('Transform type:', transformType);
      console.log('Values:', values);

      const currentCode = this.store.code.current;
      
      if (selectedObjectPath) {
        // Handle complex return statements (e.g., return {shape: wateringCan})
        return this.updateComplexReturn(currentCode, selectedObjectName, selectedObjectPath, transformType, values);
      } else {
        // Handle simple return statements (e.g., return vase)
        return this.updateSimpleReturn(currentCode, selectedObjectName, transformType, values);
      }
    } catch (error) {
      console.error('Error in selection-aware code update:', error);
      return false;
    }
  }

  /**
   * Update complex return statements (e.g., return {shape: wateringCan, name: "Watering Can"})
   */
  updateComplexReturn(code, objectName, objectPath, transformType, values) {
    console.log('Updating complex return statement');
    
    // Find the variable assignment for the selected object
    const assignmentPattern = new RegExp(`(${objectName}\\s*=\\s*[^;]+)`);
    const assignmentMatch = code.match(assignmentPattern);
    
    if (!assignmentMatch) {
      console.error('Could not find assignment for object:', objectName);
      return false;
    }
    
    const assignment = assignmentMatch[1];
    console.log('Found assignment:', assignment);
    
    // Check if the assignment already has transforms
    if (assignment.includes(`.${transformType}(`)) {
      // Update existing transform
      const transformPattern = new RegExp(`\\.${transformType}\\([^)]+\\)`);
      const newTransform = `.${transformType}(${values.join(', ')})`;
      const updatedAssignment = assignment.replace(transformPattern, newTransform);
      
      const newCode = code.replace(assignmentPattern, updatedAssignment);
      console.log('Updated existing transform in assignment');
      
      // Validate and update
      if (this.validateCodeModification(code, newCode)) {
        this.store.code.update(newCode, true);
        return true;
      }
    } else {
      // Add new transform to the assignment
      const newAssignment = `${assignment}.${transformType}(${values.join(', ')})`;
      const newCode = code.replace(assignmentPattern, newAssignment);
      console.log('Added new transform to assignment');
      
      // Validate and update
      if (this.validateCodeModification(code, newCode)) {
        this.store.code.update(newCode, true);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Update simple return statements (e.g., return vase;)
   */
  updateSimpleReturn(code, objectName, transformType, values) {
    console.log('Updating simple return statement');
    
    // Find the return statement
    const returnPattern = new RegExp(`(return\\s+)(${objectName})(\\s*;)`);
    const returnMatch = code.match(returnPattern);
    
    if (!returnMatch) {
      console.error('Could not find return statement for object:', objectName);
      return false;
    }
    
    const [fullMatch, returnKeyword, object, semicolon] = returnMatch;
    console.log('Found return statement:', fullMatch);
    
    // Check if the return already has transforms
    if (fullMatch.includes(`.${transformType}(`)) {
      // Update existing transform
      const transformPattern = new RegExp(`\\.${transformType}\\([^)]+\\)`);
      const newTransform = `.${transformType}(${values.join(', ')})`;
      const updatedReturn = fullMatch.replace(transformPattern, newTransform);
      
      const newCode = code.replace(returnPattern, updatedReturn);
      console.log('Updated existing transform in return statement');
      
      // Validate and update
      if (this.validateCodeModification(code, newCode)) {
        this.store.code.update(newCode, true);
        return true;
      }
    } else {
      // Add new transform to the return statement
      const newReturn = `${returnKeyword}${object}.${transformType}(${values.join(', ')})${semicolon}`;
      const newCode = code.replace(returnPattern, newReturn);
      console.log('Added new transform to return statement');
      
      // Validate and update
      if (this.validateCodeModification(code, newCode)) {
        this.store.code.update(newCode, true);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate that a code modification would be safe
   */
  validateCodeModification(originalCode, modifiedCode) {
    try {
      // Try to parse the modified code
      new Function(modifiedCode);
      console.log('Code modification validation passed');
      return true;
    } catch (error) {
      console.error('Code modification validation failed:', error.message);
      console.error('Original code length:', originalCode.length);
      console.error('Modified code length:', modifiedCode.length);
      return false;
    }
  }
} 