# Multilingual Implementation Guide

## Overview

AarogyaSense now supports three languages:
- 🇬🇧 **English** (en)
- 🇮🇳 **हिंदी / Hindi** (hi)
- 🇮🇳 **मराठी / Marathi** (mr)

## Setup Complete

✅ Installed `svelte-i18n` package
✅ Created translation files for all three languages
✅ Set up i18n configuration
✅ Added language switcher component to navigation
✅ Updated layout and home page with translations

## Usage in Components

### Import the translation function

```svelte
<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>
```

### Use translations in templates

```svelte
<h1>{$_('home.title')}</h1>
<p>{$_('home.description')}</p>
<button>{$_('common.submit')}</button>
```

### Access current locale

```svelte
<script lang="ts">
	import { locale } from 'svelte-i18n';
</script>

<p>Current language: {$locale}</p>
```

### Change language programmatically

```svelte
<script lang="ts">
	import { locale } from 'svelte-i18n';
	
	function switchToHindi() {
		locale.set('hi');
	}
</script>
```

## Translation Files Structure

All translations are stored in `src/lib/i18n/locales/`:

- `en.json` - English translations
- `hi.json` - Hindi translations  
- `mr.json` - Marathi translations

### Translation Keys Organization

```json
{
  "nav": {
    "home": "Home",
    "chwApp": "CHW App",
    ...
  },
  "home": {
    "title": "AarogyaSense",
    "subtitle": "AI-Powered Rural Healthcare Platform",
    ...
  },
  "chw": {
    "title": "CHW Assessment Portal",
    ...
  },
  "asha": {
    "title": "ASHA Supervision Portal",
    ...
  },
  "clinician": {
    "title": "Clinician Portal",
    ...
  },
  "common": {
    "submit": "Submit",
    "cancel": "Cancel",
    ...
  }
}
```

## How to Add New Translations

1. **Add the key to all three language files** in the same location:

   **en.json:**
   ```json
   {
     "mySection": {
       "myKey": "My English Text"
     }
   }
   ```

   **hi.json:**
   ```json
   {
     "mySection": {
       "myKey": "मेरा हिंदी पाठ"
     }
   }
   ```

   **mr.json:**
   ```json
   {
     "mySection": {
       "myKey": "माझा मराठी मजकूर"
     }
   }
   ```

2. **Use the translation in your component:**

   ```svelte
   <p>{$_('mySection.myKey')}</p>
   ```

## Language Switcher

The language switcher is available in:
- Desktop navigation (top right)
- Mobile menu (after navigation items)

Users can click the switcher to choose their preferred language. The selection is saved in localStorage.

## Updating Existing Components

To add multilingual support to existing components:

1. Import the translation function:
   ```svelte
   import { _ } from 'svelte-i18n';
   ```

2. Replace hardcoded text with translation keys:
   ```svelte
   <!-- Before -->
   <h1>Welcome</h1>
   
   <!-- After -->
   <h1>{$_('common.welcome')}</h1>
   ```

3. Ensure the translation key exists in all three language files

## Examples

### CHW Page Translation

```svelte
<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<div>
	<h1>{$_('chw.title')}</h1>
	<p>{$_('chw.subtitle')}</p>
	
	<form>
		<label>{$_('chw.patientName')}</label>
		<input placeholder={$_('chw.patientNamePlaceholder')} />
		
		<button type="submit">{$_('chw.submitAssessment')}</button>
	</form>
</div>
```

### ASHA Portal Translation

```svelte
<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<div>
	<h1>{$_('asha.title')}</h1>
	<p>{$_('asha.subtitle')}</p>
	
	<table>
		<thead>
			<tr>
				<th>{$_('asha.caseId')}</th>
				<th>{$_('asha.patient')}</th>
				<th>{$_('asha.status')}</th>
				<th>{$_('asha.riskLevel')}</th>
			</tr>
		</thead>
	</table>
</div>
```

## Testing

To test the multilingual implementation:

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser

3. Click the language switcher in the navigation

4. Verify that:
   - Navigation items change language
   - Page content changes language
   - Language selection persists on page reload

## Next Steps

To complete the multilingual implementation:

1. Update remaining pages:
   - `/chw` - CHW Assessment Portal
   - `/asha` - ASHA Supervision Portal
   - `/clinician` - Clinician Portal
   - `/auth` - Authentication Page

2. Follow the same pattern:
   - Import `{ _ }` from `svelte-i18n`
   - Replace hardcoded text with `$_('translation.key')`
   - Ensure all keys exist in en.json, hi.json, and mr.json

3. Test each page in all three languages

## Translation Coverage

✅ **Completed:**
- Navigation menu
- Layout (header, footer)
- Home page (partial)
- All translation keys defined for:
  - CHW Portal
  - ASHA Portal
  - Clinician Portal
  - Auth Page
  - Common elements

⏳ **Remaining:**
- Full implementation in CHW page
- Full implementation in ASHA page
- Full implementation in Clinician page
- Full implementation in Auth page
- Error messages
- Toast notifications
- Form validation messages

## Support

The translation system is fully configured. All 300+ translation keys are ready in English, Hindi, and Marathi. Simply import `{ _ }` and use `$_('key.path')` in your components!
