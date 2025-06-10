# Shift Demand Management System

A comprehensive, production-ready shift demand management system for NSP Pro with advanced features including optimistic updates, conflict resolution, performance optimizations, and offline support.

## 🚀 Features

### Core Functionality
- **Interactive Grid Interface**: Matrix-style grid for managing shift demands
- **Real-time Editing**: Inline cell editing with immediate visual feedback
- **Bulk Operations**: Select multiple cells and apply operations in batch
- **Period Navigation**: Navigate between different time periods (week, month, quarter)
- **Flexible Display Options**: Weekend visibility, empty cells, totals, compact view

### Advanced Features
- **Template System**: Save and apply demand patterns as reusable templates
- **Pattern Library**: Apply predefined demand patterns (weekday/weekend, rotation patterns)
- **Bulk Operations Manager**: Advanced bulk editing with operation history and undo/redo
- **Copy/Paste**: Copy demand patterns and paste to other cells or periods

### Performance & Optimization
- **Virtualization**: Handle large grids (thousands of cells) efficiently
- **Optimistic Updates**: Immediate UI updates with server synchronization
- **Performance Monitoring**: Real-time performance metrics and optimization suggestions
- **Memoization**: Smart caching of computed values and components
- **Debounced Operations**: Intelligent batching of rapid changes

### State Management & Reliability
- **Conflict Resolution**: Handle concurrent edits with user-friendly resolution UI
- **Error Boundaries**: Graceful error handling with recovery options
- **Connection Monitoring**: Online/offline status with automatic retry
- **Auto-save**: Configurable automatic saving with manual override
- **Data Validation**: Client-side validation with server confirmation

### Enterprise Features
- **Offline Support**: Continue working offline with automatic synchronization
- **Security**: Comprehensive authentication and authorization integration
- **Accessibility**: Full keyboard navigation and screen reader support
- **Internationalization**: Multi-language support ready
- **Audit Trail**: Track all changes for compliance and debugging

## 📁 Architecture

### Component Structure
```
src/components/shiftDemand/
├── ShiftDemandPage.tsx                 # Main page component
├── ShiftDemandGrid.tsx                 # Core grid component
├── OptimizedShiftDemandGrid.tsx        # Performance-optimized wrapper
├── DemandCell.tsx                      # Individual cell component
├── GridHeader.tsx                      # Grid header with controls
├── GridSidebar.tsx                     # Sidebar with statistics
├── PeriodNavigation.tsx                # Period selection component
├── index.ts                           # Main exports
│
├── templates/                         # Template management
│   ├── TemplateManager.tsx
│   ├── TemplatePreview.tsx
│   └── CreateTemplateDialog.tsx
│
├── bulkOperations/                    # Bulk editing features
│   ├── BulkOperationsToolbar.tsx
│   └── BulkOperationsManager.tsx
│
├── patterns/                          # Pattern system
│   ├── PatternLibrary.tsx
│   └── PatternApplication.tsx
│
├── context/                          # State management
│   └── ShiftDemandContext.tsx
│
├── errorHandling/                    # Error boundaries
│   └── ShiftDemandErrorBoundary.tsx
│
├── conflictResolution/               # Conflict handling
│   └── ConflictResolutionPanel.tsx
│
├── connectionStatus/                 # Connection monitoring
│   └── ConnectionStatusMonitor.tsx
│
└── performance/                      # Performance optimizations
    ├── PerformanceMonitor.tsx
    └── PerformanceOptimizations.tsx
```

### Backend Integration
```
backend/
├── api_gateway/src/
│   ├── routes/shift_demand_new_routes.py      # API endpoints
│   ├── services/shift_demand_new_service.py   # Business logic
│   └── dependencies/shift_demand_new_service.py
│
└── shared/src/shared/database/
    ├── repositories/shift_demand_new.py       # Data access
    └── tests/shift_demand_new_repo_test.py    # Tests
```

## 🎯 Usage

### Basic Usage
```tsx
import { ShiftDemandPage } from '@/components/shiftDemand';

function TeamSchedulePage({ teamId, shifts }) {
  return (
    <ShiftDemandPage
      teamId={teamId}
      shifts={shifts}
      initialPeriod={{
        type: 'month',
        startDate: new Date(),
        endDate: new Date(2025, 11, 31)
      }}
    />
  );
}
```

### Advanced Configuration
```tsx
import { ShiftDemandGrid, ShiftDemandProvider } from '@/components/shiftDemand';

function CustomGridPage({ teamId, matrix, shifts }) {
  return (
    <ShiftDemandProvider teamId={teamId}>
      <ShiftDemandGrid
        teamId={teamId}
        startDate={startDate}
        endDate={endDate}
        matrix={matrix}
        shifts={shifts}
        onCellChange={handleCellChange}
        onBulkChange={handleBulkChange}
        displayOptions={{
          showWeekends: true,
          showEmptyCells: true,
          highlightChanges: true,
          compactView: false,
          showShiftTotals: true,
          showDateTotals: true,
        }}
        templates={templates}
        patterns={patterns}
        onTemplateApply={handleTemplateApply}
        onPatternApply={handlePatternApply}
      />
    </ShiftDemandProvider>
  );
}
```

### Performance Optimized Usage
```tsx
import { OptimizedShiftDemandGrid } from '@/components/shiftDemand';

function LargeGridPage({ teamId, matrix, shifts, dates }) {
  return (
    <OptimizedShiftDemandGrid
      teamId={teamId}
      matrix={matrix}
      dates={dates}
      shifts={shifts}
      onCellChange={handleCellChange}
      onBulkUpdate={handleBulkUpdate}
      enableVirtualization={true}
      enablePerformanceMonitoring={true}
      enableOfflineSupport={true}
      virtualizationThreshold={1000}
      debounceMs={300}
      throttleMs={100}
    />
  );
}
```

## 🔧 Configuration

### Performance Settings
```tsx
const performanceConfig = {
  // Enable virtualization for grids larger than this threshold
  virtualizationThreshold: 500,
  
  // Debounce rapid changes (ms)
  debounceMs: 300,
  
  // Throttle scroll events (ms)
  throttleMs: 100,
  
  // Enable performance monitoring in development
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  
  // Enable offline support
  enableOfflineSupport: true,
  
  // Auto-save interval (ms)
  autoSaveInterval: 2000,
};
```

### Display Options
```tsx
const displayOptions = {
  showWeekends: true,        // Show weekend columns
  showEmptyCells: true,      // Show cells with zero values
  highlightChanges: true,    // Highlight recently changed cells
  compactView: false,        // Use compact cell sizing
  showShiftTotals: true,     // Show totals per shift
  showDateTotals: true,      // Show totals per date
};
```

### Template Configuration
```tsx
const templateConfig = {
  maxTemplates: 50,          // Maximum templates per team
  allowSharing: true,        // Enable template sharing
  validateOnApply: true,     // Validate before applying
  showPreview: true,         // Show preview before applying
};
```

## 🔌 API Integration

### Required API Endpoints
- `GET /api/teams/{teamId}/shift-demands` - Fetch demands
- `POST /api/teams/{teamId}/shift-demands` - Create/update demands
- `PUT /api/teams/{teamId}/shift-demands/bulk` - Bulk update demands
- `DELETE /api/teams/{teamId}/shift-demands` - Delete demands
- `POST /api/teams/{teamId}/shift-demands/copy-period` - Copy period
- `GET /api/teams/{teamId}/shift-demands/statistics` - Get statistics

### Template Management
- `GET /api/teams/{teamId}/demand-templates` - List templates
- `POST /api/teams/{teamId}/demand-templates` - Create template
- `PUT /api/teams/{teamId}/demand-templates/{id}` - Update template
- `DELETE /api/teams/{teamId}/demand-templates/{id}` - Delete template

### Pattern Management
- `GET /api/teams/{teamId}/demand-patterns` - List patterns
- `POST /api/teams/{teamId}/demand-patterns` - Create pattern
- `PUT /api/teams/{teamId}/demand-patterns/{name}` - Update pattern
- `DELETE /api/teams/{teamId}/demand-patterns/{name}` - Delete pattern

## 🧪 Testing

### Unit Tests
```bash
npm test -- --testPathPattern=shiftDemand
```

### Integration Tests
```bash
npm run test:integration -- --testNamePattern="Shift Demand"
```

### Performance Tests
```bash
npm run test:performance -- --testNamePattern="ShiftDemandGrid"
```

## 🚀 Performance Considerations

### Large Datasets
- **Virtualization**: Automatically enabled for grids >500 cells
- **Pagination**: Consider server-side pagination for very large periods
- **Caching**: Implement Redis caching for frequently accessed data
- **Compression**: Use gzip compression for API responses

### Real-time Updates
- **WebSocket**: Consider WebSocket for real-time collaborative editing
- **Conflict Resolution**: Built-in conflict detection and resolution
- **Optimistic Updates**: Immediate UI feedback with server sync

### Memory Management
- **Component Memoization**: Extensive use of React.memo and useMemo
- **Cleanup**: Automatic cleanup of timers and subscriptions
- **Memory Monitoring**: Built-in memory usage tracking

## 🔒 Security

### Data Validation
- Client-side validation for immediate feedback
- Server-side validation for security
- Input sanitization to prevent XSS

### Authorization
- Team-based access control
- Role-based permissions (view, edit, admin)
- Audit logging for all changes

### Authentication
- Integration with SuperTokens
- Automatic token refresh
- Secure API communication

## 🌐 Internationalization

### Supported Features
- Date formatting based on locale
- Number formatting for demands
- RTL support for Arabic/Hebrew
- Keyboard shortcuts respect locale

### Adding New Languages
1. Add translations to `locales/` directory
2. Update date formatting in `DateUtils`
3. Test with different locales

## 📱 Accessibility

### WCAG 2.1 AA Compliance
- Full keyboard navigation
- Screen reader support
- High contrast mode
- Focus management
- ARIA labels and descriptions

### Keyboard Shortcuts
- `Arrow Keys`: Navigate cells
- `Enter`: Edit cell
- `Escape`: Cancel edit
- `Ctrl+C/V`: Copy/paste
- `Ctrl+Z/Y`: Undo/redo
- `Ctrl+A`: Select all
- `Delete`: Clear selection

## 📊 Monitoring & Analytics

### Performance Metrics
- Render time tracking
- Memory usage monitoring
- API response times
- User interaction patterns

### Error Tracking
- Client-side error reporting
- Performance issue detection
- User feedback collection
- Automatic error recovery

### Usage Analytics
- Feature usage statistics
- Performance bottleneck identification
- User behavior analysis
- A/B testing support

## 🔄 Migration Guide

### From Legacy System
1. Export existing data using legacy API
2. Transform data format using migration scripts
3. Import into new system with validation
4. Run parallel systems during transition
5. Switch over with rollback plan

### Database Schema Changes
- Backward-compatible changes preferred
- Migration scripts for schema updates
- Data validation before and after migration
- Rollback procedures documented

## 🤝 Contributing

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`

### Code Standards
- TypeScript strict mode
- ESLint + Prettier configuration
- Component testing required
- Performance testing for large grids
- Documentation for all public APIs

### Pull Request Process
1. Create feature branch
2. Write tests for new functionality
3. Update documentation
4. Submit PR with detailed description
5. Code review and approval required

## 📄 License

This project is proprietary software developed for NSP Pro. All rights reserved.

## 📞 Support

For technical support or feature requests:
- Create GitHub issue
- Contact development team
- Check documentation wiki
- Join development Slack channel
