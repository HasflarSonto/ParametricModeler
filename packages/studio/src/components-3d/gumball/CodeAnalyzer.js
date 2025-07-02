/**
 * CodeAnalyzer handles parsing and analyzing JavaScript code to identify
 * variable names, return statements, and object paths for selection-aware
 * code modification.
 */
export class CodeAnalyzer {
  constructor() {
    this.parsedCode = null;
  }

  /**
   * Analyze code to find variable names and their relationships
   */
  analyzeCode(code) {
    try {
      const analysis = {
        variables: this.extractVariables(code),
        returnStatements: this.extractReturnStatements(code),
        objectPaths: this.extractObjectPaths(code),
        mainFunction: this.extractMainFunction(code)
      };

      this.parsedCode = analysis;
      return analysis;
    } catch (error) {
      console.error('Error analyzing code:', error);
      return null;
    }
  }

  /**
   * Extract all variable declarations and assignments
   */
  extractVariables(code) {
    const variables = [];
    
    // Match variable declarations (let, const, var)
    const declarationRegex = /(?:let|const|var)\s+(\w+)\s*=/g;
    let match;
    
    while ((match = declarationRegex.exec(code)) !== null) {
      variables.push({
        name: match[1],
        type: 'declaration',
        line: this.getLineNumber(code, match.index)
      });
    }

    // Match assignments to existing variables (but not declarations)
    const assignmentRegex = /(\w+)\s*=\s*(?!.*(?:let|const|var))/g;
    while ((match = assignmentRegex.exec(code)) !== null) {
      // Skip if it's already in our declarations
      if (!variables.find(v => v.name === match[1])) {
        variables.push({
          name: match[1],
          type: 'assignment',
          line: this.getLineNumber(code, match.index)
        });
      }
    }

    return variables;
  }

  /**
   * Find all return statements and their structure
   */
  extractReturnStatements(code) {
    const returns = [];
    
    // Match return statements - updated to handle multi-line returns
    const returnRegex = /return\s+([^;]+);/gs;
    let match;
    
    while ((match = returnRegex.exec(code)) !== null) {
      const returnValue = match[1].trim();
      const returnType = this.analyzeReturnPattern(returnValue);
      
      returns.push({
        value: returnValue,
        type: returnType.type,
        details: returnType.details,
        line: this.getLineNumber(code, match.index)
      });
    }

    return returns;
  }

  /**
   * Analyze the pattern of a return statement
   */
  analyzeReturnPattern(returnValue) {
    // Clean up the return value (remove extra whitespace and newlines)
    const cleanValue = returnValue.replace(/\s+/g, ' ').trim();
    
    // Simple variable return: return vase;
    if (/^\w+$/.test(cleanValue)) {
      return {
        type: 'simple',
        details: { variable: cleanValue }
      };
    }
    
    // Object return: return {shape: wateringCan, name: "Watering Can"};
    if (cleanValue.startsWith('{') && cleanValue.endsWith('}')) {
      const properties = this.extractObjectProperties(cleanValue);
      return {
        type: 'complex',
        details: { properties }
      };
    }
    
    // Method chain return: return vase.translate([10, 20, 30]);
    if (cleanValue.includes('.')) {
      // Extract the base variable name from the chain
      const baseVariableMatch = cleanValue.match(/^(\w+)\s*\./);
      if (baseVariableMatch) {
        return {
          type: 'chain',
          details: { 
            chain: cleanValue,
            baseVariable: baseVariableMatch[1]
          }
        };
      }
    }
    
    // Default case
    return {
      type: 'unknown',
      details: { raw: cleanValue }
    };
  }

  /**
   * Extract properties from object return statements
   */
  extractObjectProperties(objectString) {
    const properties = [];
    
    // Remove outer braces
    const content = objectString.slice(1, -1);
    
    // Improved regex to extract key-value pairs with better handling of quoted strings
    const propertyRegex = /(\w+)\s*:\s*([^,}]+(?:[^,}]*[^,}\s])?)/g;
    let match;
    
    while ((match = propertyRegex.exec(content)) !== null) {
      properties.push({
        key: match[1].trim(),
        value: match[2].trim()
      });
    }
    
    return properties;
  }

  /**
   * Map object paths in complex return statements
   */
  extractObjectPaths(code) {
    const paths = [];
    const returns = this.extractReturnStatements(code);
    
    returns.forEach(returnStmt => {
      if (returnStmt.type === 'complex') {
        returnStmt.details.properties.forEach(prop => {
          paths.push({
            path: prop.key,
            variable: prop.value,
            returnStatement: returnStmt
          });
        });
      }
    });
    
    return paths;
  }

  /**
   * Extract the main function definition
   */
  extractMainFunction(code) {
    // Look for function named 'main'
    const mainRegex = /const\s+main\s*=\s*\([^)]*\)\s*=>\s*{/;
    const match = code.match(mainRegex);
    
    if (match) {
      return {
        name: 'main',
        type: 'arrow',
        index: match.index
      };
    }
    
    // Look for function main() declaration
    const funcRegex = /function\s+main\s*\([^)]*\)\s*{/;
    const funcMatch = code.match(funcRegex);
    
    if (funcMatch) {
      return {
        name: 'main',
        type: 'function',
        index: funcMatch.index
      };
    }
    
    return null;
  }

  /**
   * Determine which object corresponds to the selection
   */
  determineSelectedObject(analysis, shapeGeometryRef, faceSelected, edgeSelected) {
    if (!analysis || !analysis.returnStatements.length) {
      console.log('🔍 No return statements found in analysis');
      return null;
    }

    console.log('🔍 Analyzing return statements:', analysis.returnStatements.length);
    analysis.returnStatements.forEach((ret, index) => {
      console.log(`  Return ${index + 1}:`, ret);
    });

    // For now, we'll use a simple heuristic:
    // 1. If there's only one return statement, use that
    // 2. If there are multiple, prefer the one with a 'shape' property
    // 3. Otherwise, use the first one
    
    const returns = analysis.returnStatements;
    
    if (returns.length === 1) {
      const returnStmt = returns[0];
      console.log('🔍 Single return statement found:', returnStmt);
      
      if (returnStmt.type === 'simple') {
        console.log('🎯 Selected simple variable:', returnStmt.details.variable);
        return returnStmt.details.variable;
      } else if (returnStmt.type === 'complex') {
        // Find the 'shape' property
        const shapeProp = returnStmt.details.properties.find(p => p.key === 'shape');
        if (shapeProp) {
          console.log('🎯 Selected shape property:', shapeProp.value);
          return shapeProp.value;
        }
        // Fallback to first property
        if (returnStmt.details.properties.length > 0) {
          console.log('🎯 Selected first property:', returnStmt.details.properties[0].value);
          return returnStmt.details.properties[0].value;
        }
      } else if (returnStmt.type === 'chain') {
        // Extract base variable from transformed chain
        console.log('🎯 Selected base variable from chain:', returnStmt.details.baseVariable);
        return returnStmt.details.baseVariable;
      }
    } else {
      // Multiple return statements - look for one with 'shape' property
      console.log('🔍 Multiple return statements, looking for shape property');
      for (const returnStmt of returns) {
        if (returnStmt.type === 'complex') {
          const shapeProp = returnStmt.details.properties.find(p => p.key === 'shape');
          if (shapeProp) {
            console.log('🎯 Selected shape property from complex return:', shapeProp.value);
            return shapeProp.value;
          }
        } else if (returnStmt.type === 'chain') {
          // For chains, use the base variable
          console.log('🎯 Selected base variable from chain:', returnStmt.details.baseVariable);
          return returnStmt.details.baseVariable;
        }
      }
      
      // Fallback to first return statement
      const firstReturn = returns[0];
      console.log('🔍 Falling back to first return statement:', firstReturn);
      if (firstReturn.type === 'simple') {
        console.log('🎯 Selected first simple variable:', firstReturn.details.variable);
        return firstReturn.details.variable;
      } else if (firstReturn.type === 'chain') {
        console.log('🎯 Selected first base variable from chain:', firstReturn.details.baseVariable);
        return firstReturn.details.baseVariable;
      }
    }
    
    console.log('❌ No suitable object found');
    return null;
  }

  /**
   * Determine the object path in complex return statements
   */
  determineObjectPath(analysis, selectedObjectName) {
    if (!analysis || !selectedObjectName) {
      return null;
    }

    const paths = analysis.objectPaths;
    console.log('🔍 Looking for object path for:', selectedObjectName);
    console.log('🔍 Available paths:', paths);
    
    // Find the path that contains our selected object
    const path = paths.find(p => p.variable === selectedObjectName);
    
    if (path) {
      console.log('🎯 Found object path:', path.path);
      return path.path;
    } else {
      console.log('🎯 No object path found (simple return)');
      return null;
    }
  }

  /**
   * Get line number for a character index
   */
  getLineNumber(code, index) {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Validate that a code modification would be safe
   */
  validateCodeModification(code, modification) {
    try {
      // Try to parse the modified code
      new Function(modification);
      return true;
    } catch (error) {
      console.error('Code modification validation failed:', error);
      return false;
    }
  }
} 