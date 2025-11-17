// extractors/sanitizer.js
// Sanitization robuste contre les attaques XSS

/**
 * Sanitize une chaîne de texte pour prévenir les attaques XSS
 * Supprime tout code JavaScript potentiellement malveillant
 * 
 * @param {string} text - Texte à nettoyer
 * @returns {string} - Texte sécurisé
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let cleaned = text;

    // ✅ ÉTAPE 1 : Supprimer les balises <script>
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // ✅ ÉTAPE 2 : Supprimer les balises <style>
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // ✅ ÉTAPE 3 : Supprimer les balises <iframe>
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // ✅ ÉTAPE 4 : Supprimer tous les attributs d'événements JavaScript
    const jsEventAttributes = [
        'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
        'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
        'onload', 'onerror', 'onabort', 'onblur', 'onchange', 'onfocus',
        'onreset', 'onselect', 'onsubmit', 'onunload', 'onbeforeunload',
    ];
    
    for (const attr of jsEventAttributes) {
        // Supprimer l'attribut et sa valeur
        const pattern = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        cleaned = cleaned.replace(pattern, '');
    }
    
    // ✅ ÉTAPE 5 : Supprimer les URLs javascript:
    cleaned = cleaned.replace(/javascript:/gi, '');
    
    // ✅ ÉTAPE 6 : Supprimer les URLs data: (peuvent contenir du JS encodé)
    cleaned = cleaned.replace(/data:text\/html[^"']*/gi, '');
    
    // ✅ ÉTAPE 7 : Supprimer toutes les balises HTML (on garde seulement le texte)
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // ✅ ÉTAPE 8 : Décoder les entités HTML pour éviter les bypasses
    cleaned = decodeHtmlEntitiesSecure(cleaned);
    
    // ✅ ÉTAPE 9 : Supprimer les caractères de contrôle dangereux
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    
    // ✅ ÉTAPE 10 : Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
}

/**
 * Décode les entités HTML de manière sécurisée
 * (version simplifiée sans créer de DOM)
 */
function decodeHtmlEntitiesSecure(text) {
    if (!text) return '';
    
    // Map des entités HTML courantes
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        // Caractères accentués français
        '&agrave;': 'à',
        '&aacute;': 'á',
        '&acirc;': 'â',
        '&atilde;': 'ã',
        '&auml;': 'ä',
        '&egrave;': 'è',
        '&eacute;': 'é',
        '&ecirc;': 'ê',
        '&euml;': 'ë',
        '&igrave;': 'ì',
        '&iacute;': 'í',
        '&icirc;': 'î',
        '&iuml;': 'ï',
        '&ograve;': 'ò',
        '&oacute;': 'ó',
        '&ocirc;': 'ô',
        '&otilde;': 'õ',
        '&ouml;': 'ö',
        '&ugrave;': 'ù',
        '&uacute;': 'ú',
        '&ucirc;': 'û',
        '&uuml;': 'ü',
        '&ccedil;': 'ç',
        '&ntilde;': 'ñ',
        '&Agrave;': 'À',
        '&Aacute;': 'Á',
        '&Acirc;': 'Â',
        '&Egrave;': 'È',
        '&Eacute;': 'É',
        '&Ecirc;': 'Ê',
        '&Ccedil;': 'Ç',
        '&euro;': '€',
        '&deg;': '°',
        '&frac12;': '½',
        '&frac14;': '¼',
        '&frac34;': '¾',
        '&hellip;': '...',
        '&rsquo;': "'",
        '&lsquo;': "'",
        '&rdquo;': '"',
        '&ldquo;': '"',
        '&mdash;': '—',
        '&ndash;': '–',
    };
    
    let decoded = text;
    
    // Remplacer toutes les entités connues
    for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }
    
    // Décoder les entités numériques (&#233; → é)
    // ⚠️ Limiter à des plages sûres pour éviter les caractères de contrôle
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
        const code = parseInt(dec);
        // Accepter seulement les caractères imprimables
        if (code >= 32 && code <= 126) return String.fromCharCode(code);
        if (code >= 160 && code <= 255) return String.fromCharCode(code);
        if (code >= 0x20AC && code <= 0x20AC) return '€'; // Euro
        return ''; // Ignorer les autres
    });
    
    // Décoder les entités hexadécimales (&#x00E9; → é)
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
        const code = parseInt(hex, 16);
        // Accepter seulement les caractères imprimables
        if (code >= 32 && code <= 126) return String.fromCharCode(code);
        if (code >= 160 && code <= 255) return String.fromCharCode(code);
        if (code >= 0x20AC && code <= 0x20AC) return '€'; // Euro
        return ''; // Ignorer les autres
    });
    
    return decoded;
}

/**
 * Sanitize spécifiquement une URL
 * Vérifie qu'elle ne contient pas de code JavaScript
 */
export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    const cleaned = url.trim();

    // Bloquer les URLs javascript:
    if (cleaned.toLowerCase().startsWith('javascript:')) {
        return '';
    }

    // Bloquer les URLs data: avec HTML
    if (cleaned.toLowerCase().startsWith('data:text/html')) {
        return '';
    }

    // Accepter seulement http:// et https://
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        return '';
    }

    return cleaned;
}