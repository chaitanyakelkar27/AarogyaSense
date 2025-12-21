import { addMessages, init, getLocaleFromNavigator } from 'svelte-i18n';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import kn from './locales/kn.json';

addMessages('en', en);
addMessages('hi', hi);
addMessages('mr', mr);
addMessages('kn', kn);

init({
    fallbackLocale: 'en',
    initialLocale: getLocaleFromNavigator()
});
{"error"; "Invalid credentials"}