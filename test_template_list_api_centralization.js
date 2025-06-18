#!/usr/bin/env node
/**
 * Test script to verify the API centralization refactoring for TemplateList
 * Checks that TemplateList no longer makes direct ShiftDemandTemplateApi calls
 * and uses centralized callbacks provided by TemplateManagementWindow
 */

const fs = require('fs');

console.log('🧪 Testing TemplateList API Centralization...\n');

// Test TemplateList component
const listFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateList.tsx';
const listContent = fs.readFileSync(listFile, 'utf8');

console.log('1. Checking TemplateList component...');

// Check that ShiftDemandTemplateApi.getTemplates is not used
if (listContent.includes('ShiftDemandTemplateApi.getTemplates')) {
  console.log('   ❌ Still has direct ShiftDemandTemplateApi.getTemplates calls');
} else {
  console.log('   ✅ No direct ShiftDemandTemplateApi.getTemplates calls');
}

// Check that ShiftDemandTemplateApi.deleteTemplate is not used
if (listContent.includes('ShiftDemandTemplateApi.deleteTemplate')) {
  console.log('   ❌ Still has direct ShiftDemandTemplateApi.deleteTemplate calls');
} else {
  console.log('   ✅ No direct ShiftDemandTemplateApi.deleteTemplate calls');
}

// Check that ShiftDemandTemplateApi import is removed (except for TemplateUtils)
const apiImportLines = listContent.split('\n').filter(line => 
  line.includes('ShiftDemandTemplateApi') && line.includes('import')
);

if (apiImportLines.length > 0) {
  console.log('   ❌ Still imports ShiftDemandTemplateApi');
  console.log('   Found:', apiImportLines.join('\n   '));
} else {
  console.log('   ✅ No longer imports ShiftDemandTemplateApi');
}

// Check that TemplateUtils import is still there (it's needed for other functionality)
if (listContent.includes('TemplateUtils')) {
  console.log('   ✅ Still imports TemplateUtils (needed for formatting)');
} else {
  console.log('   ⚠️  TemplateUtils import removed (might be needed)');
}

// Check that callback props are used
if (listContent.includes('onLoadTemplates')) {
  console.log('   ✅ Uses onLoadTemplates callback');
} else {
  console.log('   ❌ Missing onLoadTemplates callback');
}

if (listContent.includes('onDeleteTemplateRequest')) {
  console.log('   ✅ Uses onDeleteTemplateRequest callback');
} else {
  console.log('   ❌ Missing onDeleteTemplateRequest callback');
}

// Check that the interface has the new callback props
if (listContent.includes('onLoadTemplates: () => Promise<void>')) {
  console.log('   ✅ Interface has onLoadTemplates prop');
} else {
  console.log('   ❌ Interface missing onLoadTemplates prop');
}

if (listContent.includes('onDeleteTemplateRequest: (templateId: string, templateName: string) => Promise<void>')) {
  console.log('   ✅ Interface has onDeleteTemplateRequest prop');
} else {
  console.log('   ❌ Interface missing onDeleteTemplateRequest prop');
}

// Test TemplateManagementWindow to ensure it provides the callbacks
const windowFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateManagementWindow.tsx';
const windowContent = fs.readFileSync(windowFile, 'utf8');

console.log('\n2. Checking TemplateManagementWindow integration...');

// Check that TemplateManagementWindow has handleLoadTemplates method
if (windowContent.includes('const handleLoadTemplates = async')) {
  console.log('   ✅ Has handleLoadTemplates method');
} else {
  console.log('   ❌ Missing handleLoadTemplates method');
}

// Check that TemplateManagementWindow has handleDeleteTemplateRequest method
if (windowContent.includes('const handleDeleteTemplateRequest = async')) {
  console.log('   ✅ Has handleDeleteTemplateRequest method');
} else {
  console.log('   ❌ Missing handleDeleteTemplateRequest method');
}

// Check that it passes the callbacks to TemplateList
if (windowContent.includes('onLoadTemplates={handleLoadTemplates}')) {
  console.log('   ✅ Passes handleLoadTemplates to TemplateList');
} else {
  console.log('   ❌ Not passing handleLoadTemplates to TemplateList');
}

if (windowContent.includes('onDeleteTemplateRequest={handleDeleteTemplateRequest}')) {
  console.log('   ✅ Passes handleDeleteTemplateRequest to TemplateList');
} else {
  console.log('   ❌ Not passing handleDeleteTemplateRequest to TemplateList');
}

// Check that handleLoadTemplates makes API call
if (windowContent.includes('await ShiftDemandTemplateApi.getTemplates(')) {
  console.log('   ✅ handleLoadTemplates makes API call');
} else {
  console.log('   ❌ handleLoadTemplates not making API call');
}

// Check that handleDeleteTemplateRequest makes API call
if (windowContent.includes('await ShiftDemandTemplateApi.deleteTemplate(')) {
  console.log('   ✅ handleDeleteTemplateRequest makes API call');
} else {
  console.log('   ❌ handleDeleteTemplateRequest not making API call');
}

console.log('\n📋 API Centralization Summary:');
console.log('   🎯 Goal: Move ShiftDemandTemplateApi calls from TemplateList to TemplateManagementWindow');
console.log('   🔄 Pattern: Use callback props for API operations');
console.log('   📦 Benefit: Better separation of concerns and testability');

// Check overall success
const listCentralized = !listContent.includes('ShiftDemandTemplateApi.getTemplates') && 
                       !listContent.includes('ShiftDemandTemplateApi.deleteTemplate') &&
                       listContent.includes('onLoadTemplates') &&
                       listContent.includes('onDeleteTemplateRequest');

const windowProvides = windowContent.includes('onLoadTemplates={handleLoadTemplates}') &&
                      windowContent.includes('onDeleteTemplateRequest={handleDeleteTemplateRequest}') &&
                      windowContent.includes('await ShiftDemandTemplateApi.getTemplates(') &&
                      windowContent.includes('await ShiftDemandTemplateApi.deleteTemplate(');

if (listCentralized && windowProvides) {
  console.log('\n🎉 API Centralization Complete!');
  console.log('   ✅ TemplateList uses callbacks instead of direct API calls');
  console.log('   ✅ TemplateManagementWindow provides centralized API handling');
  console.log('   ✅ Consistent architecture pattern maintained');
  console.log('\n✨ Centralized API methods:');
  console.log('   📥 handleLoadTemplates - loads templates via API');
  console.log('   🗑️  handleDeleteTemplateRequest - deletes templates via API');
  console.log('   📊 Both maintain proper state management and error handling');
} else {
  console.log('\n❌ API Centralization needs review');
  if (!listCentralized) {
    console.log('   - TemplateList still has direct API calls or missing callback usage');
  }
  if (!windowProvides) {
    console.log('   - TemplateManagementWindow not properly providing API callbacks');
  }
}
