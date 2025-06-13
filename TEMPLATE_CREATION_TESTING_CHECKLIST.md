# Template Creation Feature - Manual Testing Checklist

## 🎯 Testing Priority: HIGH
This checklist covers all aspects of the template creation feature that need manual verification before production deployment.

## Prerequisites
- [ ] Frontend development server running (`npm run dev`)
- [ ] Backend API services running
- [ ] Valid user authentication
- [ ] Access to a team with shift demand management permissions

## 🔧 Basic Functionality Tests

### Template Creation Dialog
- [ ] **Dialog Opens Correctly**
  - Navigate to Shift Demands page
  - Click "Template Management" button
  - Click "Create Template" button
  - Verify dialog opens with proper title and form fields

- [ ] **Form Validation - Name Field**
  - [ ] Leave name empty and try to submit → Should show "Name is required" error
  - [ ] Enter 1-2 characters → Should show "Name too short" error
  - [ ] Enter 101+ characters → Should show "Name too long" error
  - [ ] Enter valid name (3-100 chars) → Should clear error and enable submit

- [ ] **Form Validation - Description Field**
  - [ ] Leave description empty → Should be allowed (optional field)
  - [ ] Enter 501+ characters → Should show character limit reached
  - [ ] Enter valid description (0-500 chars) → Should show character counter

- [ ] **Character Counters**
  - [ ] Name field shows "X/100" counter
  - [ ] Description field shows "X/500" counter
  - [ ] Counters update in real-time as user types

### Template Creation Process
- [ ] **Successful Creation**
  - [ ] Fill valid name and description
  - [ ] Click "Create Template" button
  - [ ] Should show loading state with spinner
  - [ ] Should close dialog on success
  - [ ] Should show success message
  - [ ] New template should appear in template list
  - [ ] Template should be automatically selected/highlighted

- [ ] **API Error Handling**
  - [ ] Try creating template with duplicate name → Should show appropriate error
  - [ ] Test with network disconnected → Should show network error
  - [ ] Cancel during loading → Should properly cancel request

## 🌐 Internationalization Tests

### English (Default)
- [ ] All text appears in English
- [ ] Error messages are in English
- [ ] Button labels are correct
- [ ] Placeholder text is appropriate

### French Translation
- [ ] Switch browser/app language to French
- [ ] Verify all text translates to French
- [ ] Error messages appear in French
- [ ] Form validation messages are translated
- [ ] Button labels are in French

### Spanish Translation (if available)
- [ ] Test Spanish locale if implemented
- [ ] Verify translations work correctly

## 🔗 Integration Tests

### Template List Integration
- [ ] **Immediate UI Update**
  - [ ] Create new template
  - [ ] Verify it appears in list without page refresh
  - [ ] Verify correct position in list (typically newest first)
  - [ ] Verify template shows "0 demands" initially

- [ ] **Template Selection**
  - [ ] Click on newly created template in list
  - [ ] Should switch to template viewer
  - [ ] Should show empty template with basic info

### Template Editor Integration
- [ ] **Edit Empty Template**
  - [ ] Create new template
  - [ ] Click "Edit" button on template
  - [ ] Should open template editor
  - [ ] Should allow adding shift demands
  - [ ] Should save changes properly

### Template Management Flow
- [ ] **Full Workflow**
  - [ ] Create template → Edit template → View template → Delete template
  - [ ] Each step should work seamlessly
  - [ ] No broken states or UI glitches

## 🎨 UI/UX Tests

### Visual Design
- [ ] **Dialog Appearance**
  - [ ] Proper modal backdrop
  - [ ] Centered dialog positioning
  - [ ] Appropriate dialog size
  - [ ] Material UI styling consistency

- [ ] **Form Layout**
  - [ ] Fields properly aligned
  - [ ] Labels clearly visible
  - [ ] Error messages positioned correctly
  - [ ] Button placement intuitive

- [ ] **Loading States**
  - [ ] Spinner appears during API call
  - [ ] Form fields disabled during loading
  - [ ] Cancel button remains accessible
  - [ ] No layout shifts during loading

### Responsive Design
- [ ] **Desktop View**
  - [ ] Dialog displays properly on large screens
  - [ ] Form fields have appropriate spacing

- [ ] **Mobile View**
  - [ ] Dialog adapts to mobile screen size
  - [ ] Form remains usable on small screens
  - [ ] Touch targets are adequate size

## 🚨 Error Scenarios

### Network Issues
- [ ] **Connection Lost**
  - [ ] Start template creation
  - [ ] Disconnect network during API call
  - [ ] Should show appropriate error message
  - [ ] Should allow retry when connection restored

### Server Errors
- [ ] **Backend Down**
  - [ ] Stop backend services
  - [ ] Try creating template
  - [ ] Should show server error message
  - [ ] Should not crash the application

### Permission Issues
- [ ] **Insufficient Permissions**
  - [ ] Test with user lacking create permissions
  - [ ] Should show authorization error
  - [ ] Should handle gracefully

## ⚡ Performance Tests

### Loading Performance
- [ ] **Dialog Opens Quickly**
  - [ ] Click "Create Template" button
  - [ ] Dialog should open within 100ms
  - [ ] No noticeable lag or delays

### API Response Time
- [ ] **Template Creation Speed**
  - [ ] Submit valid template
  - [ ] API call should complete within 2-3 seconds
  - [ ] UI should update immediately after API success

## 🔄 Browser Compatibility

### Modern Browsers
- [ ] **Chrome** (latest version)
- [ ] **Firefox** (latest version)
- [ ] **Safari** (latest version)
- [ ] **Edge** (latest version)

### Mobile Browsers
- [ ] **Mobile Safari** (iOS)
- [ ] **Chrome Mobile** (Android)

## 📝 Data Validation

### Template Data Structure
- [ ] **Created Template Contains**
  - [ ] Correct name from form
  - [ ] Description from form (or undefined if empty)
  - [ ] templateType: "standard"
  - [ ] Empty standardWeekData array
  - [ ] Valid createdBy field
  - [ ] Proper timestamps (createdAt, updatedAt)

### API Payload
- [ ] **Request Format**
  - [ ] teamId included in request
  - [ ] All required fields present
  - [ ] No extra/invalid fields

## 🏁 Completion Criteria

### ✅ All Tests Pass
- [ ] No blocking bugs found
- [ ] All validation works correctly
- [ ] Translations are complete
- [ ] Performance is acceptable
- [ ] Error handling is robust

### 📋 Test Report
- [ ] Document any issues found
- [ ] Note browser-specific problems
- [ ] Record performance observations
- [ ] List any suggested improvements

## 🚀 Production Readiness

### Final Checklist
- [ ] All manual tests completed
- [ ] No critical issues found
- [ ] Backend API endpoints working
- [ ] Translation files complete
- [ ] Error handling tested
- [ ] Performance acceptable

### Deployment Notes
- [ ] Feature flag ready (if applicable)
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared
- [ ] User documentation updated

---

**Testing Status**: ⏳ In Progress
**Last Updated**: June 13, 2025
**Tested By**: [Your Name]
**Environment**: Development
