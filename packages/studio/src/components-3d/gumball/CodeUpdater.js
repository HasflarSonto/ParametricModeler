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
        // Add x_translate if it doesn't exist
        newParamsContent = newParamsContent.replace(
          /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
          `$1$2,\n    x_translate: ${newX.toFixed(2)}$3`
        );
      }
      
      if (yTranslateMatch) {
        newParamsContent = newParamsContent.replace(
          /y_translate:\s*[0-9.-]+/,
          `y_translate: ${newY.toFixed(2)}`
        );
      } else {
        // Add y_translate if it doesn't exist
        newParamsContent = newParamsContent.replace(
          /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
          `$1$2,\n    y_translate: ${newY.toFixed(2)}$3`
        );
      }
      
      if (zTranslateMatch) {
        newParamsContent = newParamsContent.replace(
          /z_translate:\s*[0-9.-]+/,
          `z_translate: ${newZ.toFixed(2)}`
        );
      } else {
        // Add z_translate if it doesn't exist
        newParamsContent = newParamsContent.replace(
          /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
          `$1$2,\n    z_translate: ${newZ.toFixed(2)}$3`
        );
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
   * Add transform parameters to the code if they don't exist
   */
  addTransformParametersToCode() {
    try {
      console.log('=== Adding transform parameters to code ===');
      const currentCode = this.store.code.current;
      
      // Check if defaultParams already exists
      const defaultParamsMatch = currentCode.match(/const\s+defaultParams\s*=\s*{([^}]+)}/);
      
      if (defaultParamsMatch) {
        // defaultParams exists, check if transform parameters are already there
        const paramsContent = defaultParamsMatch[1];
        const hasXTranslate = /x_translate:\s*[0-9.-]+/.test(paramsContent);
        const hasYTranslate = /y_translate:\s*[0-9.-]+/.test(paramsContent);
        const hasZTranslate = /z_translate:\s*[0-9.-]+/.test(paramsContent);
        
        if (!hasXTranslate || !hasYTranslate || !hasZTranslate) {
          // Add missing transform parameters
          let newParamsContent = paramsContent;
          
          if (!hasXTranslate) {
            newParamsContent = newParamsContent.replace(
              /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
              `$1$2,\n    x_translate: 0$3`
            );
          }
          
          if (!hasYTranslate) {
            newParamsContent = newParamsContent.replace(
              /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
              `$1$2,\n    y_translate: 0$3`
            );
          }
          
          if (!hasZTranslate) {
            newParamsContent = newParamsContent.replace(
              /(\s*)([^,\s]+:\s*[^,\s]+)(\s*,?\s*)$/,
              `$1$2,\n    z_translate: 0$3`
            );
          }
          
          const newCode = currentCode.replace(
            /const\s+defaultParams\s*=\s*{([^}]+)}/,
            `const defaultParams = {${newParamsContent}}`
          );
          
          console.log('Adding transform parameters to existing defaultParams');
          this.store.code.update(newCode, true);
          this.store.updateCode(newCode);
        }
      } else {
        // No defaultParams exists, create it
        const newCode = currentCode.replace(
          /(const main = \(\) => {)/,
          `const defaultParams = {
  x_translate: 0,
  y_translate: 0,
  z_translate: 0,
};

$1`
        );
        
        console.log('Creating new defaultParams with transform parameters');
        this.store.code.update(newCode, true);
        this.store.updateCode(newCode);
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
      const hasTransform = /\.translate\(\[.*\]\)/.test(currentCode);
      
      if (!hasTransform) {
        // Find the return statement and add transform before it
        const newCode = currentCode.replace(
          /(return\s+)([^;]+);/,
          `$1$2.translate([defaultParams.x_translate, defaultParams.y_translate, defaultParams.z_translate]);`
        );
        
        console.log('Adding transform to main function');
        this.store.code.update(newCode, true);
        this.store.updateCode(newCode);
        
        // Trigger a rebuild with the new parameters
        setTimeout(() => {
          this.store.process({
            x_translate: 0,
            y_translate: 0,
            z_translate: 0
          });
        }, 100);
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
} 