#!/usr/bin/env node
/**
 * Test script to verify the API centralization refactoring for TemplateViewer
 * Checks that TemplateViewer no longer makes direct ShiftDemandTemplateApi calls
 * and uses the centralized onUpdateTemplate callback instead
 */

const fs = require('fs');

console.log('🧪 Testing TemplateViewer API Centralization...\n');

// Test TemplateViewer component
const viewerFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateViewer.tsx';
const viewerContent = fs.readFileSync(viewerFile, 'utf8');

console.log('1. Checking TemplateViewer component...');

// Check that ShiftDemandTemplateApi.updateTemplate is not used
if (viewerContent.includes('ShiftDemandTemplateApi.updateTemplate')) {
  console.log('   ❌ Still has direct ShiftDemandTemplateApi.updateTemplate calls');
} else {
  console.log('   ✅ No direct ShiftDemandTemplateApi.updateTemplate calls');
}

// Check that ShiftDemandTemplateApi import is removed (except for TemplateUtils)
const apiImportLines = viewerContent.split('\n').filter(line => 
  line.includes('ShiftDemandTemplateApi') && line.includes('import')
);

if (apiImportLines.length > 0) {
  console.log('   ❌ Still imports ShiftDemandTemplateApi');
  console.log('   Found:', apiImportLines.join('\n   '));
} else {
  console.log('   ✅ No longer imports ShiftDemandTemplateApi');
}

// Check that TemplateUtils import is still there (it's needed for other functionality)
if (viewerContent.includes('TemplateUtils')) {
  console.log('   ✅ Still imports TemplateUtils (needed for other functionality)');
} else {
  console.log('   ⚠️  TemplateUtils import removed (might be needed)');
}

// Check that onUpdateTemplate callback is used
if (viewerContent.includes('await onUpdateTemplate({')) {
  console.log('   ✅ Uses onUpdateTemplate callback for API calls');
} else {
  console.log('   ❌ Not using onUpdateTemplate callback');
}

// Check that the interface still has onUpdateTemplate prop
if (viewerContent.includes('onUpdateTemplate: (updates: Partial<ShiftDemandTemplateDTO>) => Promise<void>')) {
  console.log('   ✅ Interface has onUpdateTemplate prop');
} else {
  console.log('   ❌ Interface missing onUpdateTemplate prop');
}

// Test TemplateManagementWindow to ensure it provides the callback
const windowFile = '/Users/felipekharaba/Code/nsp_pro/frontend/src/components/shiftDemand/templates/TemplateManagementWindow.tsx';
const windowContent = fs.readFileSync(windowFile, 'utf8');

console.log('\n2. Checking TemplateManagementWindow integration...');

// Check that TemplateManagementWindow has handleUpdateTemplate method
if (windowContent.includes('const handleUpdateTemplate = async')) {
  console.log('   ✅ Has handleUpdateTemplate method');
} else {
  console.log('   ❌ Missing handleUpdateTemplate method');
}

// Check that it passes the callback to TemplateViewer
if (windowContent.includes('onUpdateTemplate={handleUpdateTemplate}')) {
  console.log('   ✅ Passes handleUpdateTemplate to TemplateViewer');
} else {
  console.log('   ❌ Not passing handleUpdateTemplate to TemplateViewer');
}

// Check that handleUpdateTemplate makes API call
if (windowContent.includes('await ShiftDemandTemplateApi.updateTemplate(')) {
  console.log('   ✅ handleUpdateTemplate makes API call');
} else {
  console.log('   ❌ handleUpdateTemplate not making API call');
}

console.log('\n📋 API Centralization Summary:');
console.log('   🎯 Goal: Move ShiftDemandTemplateApi calls from TemplateViewer to TemplateManagementWindow');
console.log('   🔄 Pattern: Use callback props for API operations');
console.log('   📦 Benefit: Better separation of concerns and testability');

// Check overall success
const viewerCentralized = !viewerContent.includes('ShiftDemandTemplateApi.updateTemplate') && 
                         viewerContent.includes('await onUpdateTemplate({');
const windowProvides = windowContent.includes('onUpdateTemplate={handleUpdateTemplate}') &&
                      windowContent.includes('await ShiftDemandTemplateApi.updateTemplate(');

if (viewerCentralized && windowProvides) {
  console.log('\n🎉 API Centralization Complete!');
  console.log('   ✅ TemplateViewer uses callbacks instead of direct API calls');
  console.log('   ✅ TemplateManagementWindow provides centralized API handling');
  console.log('   ✅ Consistent architecture pattern maintained');
} else {
  console.log('\n❌ API Centralization needs review');
  if (!viewerCentralized) {
    console.log('   - TemplateViewer still has direct API calls or missing callback usage');
  }
  if (!windowProvides) {
    console.log('   - TemplateManagementWindow not properly providing API callback');
  }
}
