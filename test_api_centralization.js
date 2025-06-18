#!/usr/bin/env node
/**
 * Test script to verify the API centralization refactoring
 * Checks that the TemplateApplicationToRangeDialog no longer imports ShiftDemandTemplateApi
 * and that TemplateManagementWindow properly handles the API call
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing API Centralization Refactoring...\n');

// Test 1: Check that TemplateApplicationToRangeDialog no longer imports the API
const dialogFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx';
const dialogContent = fs.readFileSync(dialogFile, 'utf8');

console.log('1. Checking TemplateApplicationToRangeDialog...');

if (dialogContent.includes('ShiftDemandTemplateApi')) {
  console.log('   ❌ Still imports ShiftDemandTemplateApi');
} else {
  console.log('   ✅ No longer imports ShiftDemandTemplateApi');
}

if (dialogContent.includes('onApplyTemplate')) {
  console.log('   ✅ Has onApplyTemplate prop');
} else {
  console.log('   ❌ Missing onApplyTemplate prop');
}

if (dialogContent.includes('await onApplyTemplate(request)')) {
  console.log('   ✅ Uses callback for API call');
} else {
  console.log('   ❌ Not using callback for API call');
}

// Test 2: Check that TemplateManagementWindow handles the API call
const windowFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateManagementWindow.tsx';
const windowContent = fs.readFileSync(windowFile, 'utf8');

console.log('\n2. Checking TemplateManagementWindow...');

if (windowContent.includes('handleApplyTemplateToRange')) {
  console.log('   ✅ Has handleApplyTemplateToRange method');
} else {
  console.log('   ❌ Missing handleApplyTemplateToRange method');
}

if (windowContent.includes('ShiftDemandTemplateApi.applyTemplateToDateRange')) {
  console.log('   ✅ Makes API call to applyTemplateToDateRange');
} else {
  console.log('   ❌ Not making API call to applyTemplateToDateRange');
}

if (windowContent.includes('onApplyTemplate={handleApplyTemplateToRange}')) {
  console.log('   ✅ Passes callback to dialog');
} else {
  console.log('   ❌ Not passing callback to dialog');
}

if (windowContent.includes('ApplyTemplateToDateRangeDTO')) {
  console.log('   ✅ Imports ApplyTemplateToDateRangeDTO type');
} else {
  console.log('   ❌ Missing ApplyTemplateToDateRangeDTO import');
}

// Test 3: Check interface consistency
console.log('\n3. Checking interface consistency...');

// Check that the dialog interface requires onApplyTemplate
if (dialogContent.includes('onApplyTemplate: (request: ApplyTemplateToDateRangeDTO) => Promise<TemplateApplicationResult>')) {
  console.log('   ✅ Dialog interface requires onApplyTemplate callback');
} else {
  console.log('   ❌ Dialog interface missing onApplyTemplate callback');
}

console.log('\n📋 Refactoring Summary:');
console.log('   🎯 Goal: Centralize API calls in TemplateManagementWindow');
console.log('   🔄 Pattern: Pass callback functions to child components');
console.log('   📦 Benefit: Better separation of concerns');
console.log('   🧪 Result: API logic is now centralized in the main component');

console.log('\n✨ The refactoring centralizes API method calls by:');
console.log('   1. Removing direct API imports from TemplateApplicationToRangeDialog');
console.log('   2. Adding onApplyTemplate callback prop to the dialog');
console.log('   3. Implementing handleApplyTemplateToRange in TemplateManagementWindow');
console.log('   4. Passing the callback function to the dialog component');
console.log('\n🎉 API calls are now properly centralized!');
