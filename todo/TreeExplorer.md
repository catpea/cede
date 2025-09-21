## 🔌 **Plugin Architecture** (continued)

**Base Provider Interface:**
- `canHandle(data)` - determines if provider can handle the data type
- `read(data)` - extracts/transforms the data
- `getType(data)` - returns type information for display
- `getDisplayName(data, key)` - formats display name with context

**Built-in Providers:**
- `SignalProvider` - handles objects with `.value` property
- `ObjectProvider` - handles plain objects
- `ArrayProvider` - handles arrays
- `PrimitiveProvider` - handles strings, numbers, booleans, null, undefined

**Custom Provider Example:**
```javascript
class URLProvider extends DataProvider {
  canHandle(data) {
    return typeof data === 'string' && /^https?:\/\//.test(data);
  }

  getDisplayName(data, key = null) {
    const domain = new URL(data).hostname;
    return key ? `${key}: 🔗 ${domain}` : `🔗 ${domain}`;
  }
}
```

## 🏗️ **Design Principles**

**1. No Bloated Java-style OOP:**
- Minimal inheritance hierarchy
- Composition over inheritance
- Single responsibility per class
- Clean, readable interfaces

**2. DOM-based State Management:**
```javascript
<li data-collapsed="false" data-expandable="true">
```
State is maintained in DOM attributes, not heavy JavaScript objects.

**3. Provider Priority System:**
Providers are checked in registration order (LIFO), allowing custom providers to override defaults:
```javascript
explorer.use(new CustomSignalProvider()) // Checked first
        .use(new SignalProvider());       // Fallback
```

**4. Fluent Interface:**
Method chaining for elegant API usage:
```javascript
explorer.setData(data)
        .render()
        .expandAll()
        .collapseAll();
```

## 🎨 **Key Features**

**Automatic Provider Selection:**
- Explorer automatically finds the right provider for each data type
- No manual type checking or switching needed
- Extensible through plugin registration

**Lazy Rendering:**
- Children are rendered when parent nodes are created
- Toggle state managed via DOM attributes
- Efficient memory usage

**Rich Type Display:**
- `Signal<Array[3]>` for signal-wrapped arrays
- `Object{5}` for objects with key counts
- `🔗 domain.com` for URLs with custom provider

**Clean Disposal:**
```javascript
const disposable = explorer.render();
// Later...
disposable.dispose(); // Removes all DOM elements and event listeners
```

## 🔄 **Provider Switching Logic**

The explorer mimics file system explorers (Finder/Explorer) by:

1. **Auto-detection**: Each provider declares what it can handle
2. **Priority order**: First registered provider wins for conflicting types
3. **Fallback chain**: If a provider can't handle data, try the next one
4. **Custom overrides**: Users can register providers that supersede built-ins

This creates a natural, extensible system where new data types can be handled by simply registering appropriate providers.

The implementation is **clean, minimal, and beautiful** - avoiding enterprise Java patterns while maintaining professional code quality and extensibility.
