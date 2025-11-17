// extractors/testSanitizer.js
import { sanitizeText } from './sanitizer.js';

console.log('=== TESTS SANITIZATION XSS ===\n');

// Test 1 : Script tag
const test1 = '<script>alert("XSS")</script>Tarte aux pommes';
console.log('Test 1 - Script tag:');
console.log('Avant:', test1);
console.log('Après:', sanitizeText(test1));
console.log('✅ Le script devrait être supprimé\n');

// Test 2 : Event handler
const test2 = '<img src=x onerror="alert()">Ma recette de gâteau';
console.log('Test 2 - Event handler:');
console.log('Avant:', test2);
console.log('Après:', sanitizeText(test2));
console.log('✅ Le onerror devrait être supprimé\n');

// Test 3 : Javascript URL
const test3 = '<a href="javascript:alert()">Cliquez ici</a> pour la recette';
console.log('Test 3 - Javascript URL:');
console.log('Avant:', test3);
console.log('Après:', sanitizeText(test3));
console.log('✅ javascript: devrait être supprimé\n');

// Test 4 : Iframe
const test4 = '<iframe src="evil.com"></iframe>Recette de crêpes';
console.log('Test 4 - Iframe:');
console.log('Avant:', test4);
console.log('Après:', sanitizeText(test4));
console.log('✅ L\'iframe devrait être supprimé\n');

// Test 5 : Texte normal (ne doit PAS être modifié)
const test5 = 'Tarte aux pommes avec 200g de sucre';
console.log('Test 5 - Texte normal:');
console.log('Avant:', test5);
console.log('Après:', sanitizeText(test5));
console.log('✅ Le texte doit rester identique\n');

// Test 6 : Entités HTML françaises
const test6 = 'Cr&egrave;me br&ucirc;l&eacute;e &amp; g&acirc;teau au chocolat';
console.log('Test 6 - Entités HTML:');
console.log('Avant:', test6);
console.log('Après:', sanitizeText(test6));
console.log('✅ Les accents doivent être décodés\n');

// Test 7 : Balises multiples imbriquées
const test7 = '<div><script>alert()</script><p onclick="hack()">Recette</p></div>';
console.log('Test 7 - Balises imbriquées:');
console.log('Avant:', test7);
console.log('Après:', sanitizeText(test7));
console.log('✅ Toutes les balises doivent être supprimées\n');

// Test 8 : Style tag (CSS injection)
const test8 = '<style>body{display:none}</style>Ma recette préférée';
console.log('Test 8 - Style tag:');
console.log('Avant:', test8);
console.log('Après:', sanitizeText(test8));
console.log('✅ Le style devrait être supprimé\n');

console.log('=== FIN DES TESTS ===');